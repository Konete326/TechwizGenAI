import { b64ToF32 } from "./audioUtils.js";

export const createMessageHandler = (refs, setAssets, setIsExec, userToken) => async (e) => {
  const msg = JSON.parse(e.data);
  const key = Object.keys(msg)[0];
  console.log("Server msg key:", key);

  if (msg.setupComplete) console.log("Event: setupComplete");

  if (msg.serverContent?.interrupted) {
    console.log("Event: interrupted");
    refs.current.srcs.forEach(s => { try { s.stop(); } catch (err) {} });
    refs.current.srcs = [];
    refs.current.nextTime = 0;
    refs.current.turnActive = false;
  }

  if (msg.serverContent?.turnComplete) {
    console.log("Event: turnComplete");
    refs.current.turnActive = false;
  }

  if (msg.serverContent?.modelTurn) {
    msg.serverContent.modelTurn.parts.forEach(p => {
      if (p.inlineData?.mimeType.startsWith("audio/")) {
        const now = performance.now();
        if (!refs.current.turnActive) {
          refs.current.turnActive = true;
          refs.current.firstRecvTime = now;
          console.log("LAST_SPEECH:", refs.current.lastPeakTime);
          console.log("FIRST_AUDIO_RECV:", now);
        }

        const f = b64ToF32(p.inlineData.data);
        const playCtx = refs.current.playCtx;
        if (!playCtx) return;

        const buf = playCtx.createBuffer(1, f.length, 24000);
        buf.getChannelData(0).set(f);

        const src = playCtx.createBufferSource();
        src.buffer = buf;
        src.connect(playCtx.destination);

        src.onended = () => {
          const i = refs.current.srcs.indexOf(src);
          if (i > -1) refs.current.srcs.splice(i, 1);
        };

        const t = refs.current.srcs.length === 0 ? Math.max(playCtx.currentTime + 0.04, refs.current.nextTime || 0) : Math.max(playCtx.currentTime, refs.current.nextTime || 0);
        src.start(t);
        refs.current.nextTime = t + buf.duration;
        refs.current.srcs.push(src);

        if (refs.current.firstRecvTime === now) {
          const pNow = performance.now();
          console.log("FIRST_AUDIO_PLAY:", pNow);
          console.log(`Deltas: Speech->Recv: ${now - refs.current.lastPeakTime}ms | Recv->Play: ${pNow - now}ms | Total: ${pNow - refs.current.lastPeakTime}ms`);
        }
      }
    });
  }

  if (msg.toolCall?.functionCalls) {
    setIsExec(true);
    msg.toolCall.functionCalls.forEach(fc => {
      if (fc.name === "generateDocument" && (!fc.args.title?.trim() || !fc.args.content?.trim())) {
        if (refs.current.ws?.readyState === 1) refs.current.ws.send(JSON.stringify({ toolResponse: { functionResponses: [{ id: fc.id, name: fc.name, response: { error: "Incomplete" }, scheduling: "WHEN_IDLE" }] } }));
        return setIsExec(false);
      }
      fetch(`/api/tools/${fc.name}`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${userToken}` }, body: JSON.stringify(fc.args) })
        .then(r => r.json())
        .then(d => {
          if (d.assetUrl) setAssets(p => [{ id: d.assetId || Date.now(), url: d.assetUrl, title: fc.args.title || "Doc", type: fc.args.format || "pdf" }, ...p]);
          if (refs.current.ws?.readyState === 1) refs.current.ws.send(JSON.stringify({ toolResponse: { functionResponses: [{ id: fc.id, name: fc.name, response: d, scheduling: "WHEN_IDLE" }] } }));
        })
        .catch(err => {
          if (refs.current.ws?.readyState === 1) refs.current.ws.send(JSON.stringify({ toolResponse: { functionResponses: [{ id: fc.id, name: fc.name, response: { error: err.message }, scheduling: "WHEN_IDLE" }] } }));
        })
        .finally(() => setIsExec(false));
    });
  }
};
