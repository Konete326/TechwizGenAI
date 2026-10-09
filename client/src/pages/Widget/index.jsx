import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { NesaCallProvider, useNesaCallContext } from "../../context/NesaCallContext";
import { NesaCallInterface } from "../Studio/NesaCallInterface";

function WidgetApp() {
  const c = useNesaCallContext();
  const [searchParams] = useSearchParams();
  const clientId = searchParams.get('clientId');
  const [lastDomHash, setLastDomHash] = useState('');

  useEffect(() => {
    // Auto start the call when this iframe loads
    if (!c.isCallActive && c.callPhase === "ended") {
      c.startCall();
    }
  }, [c.isCallActive, c.callPhase, c.startCall]);

  // Notify SDK that the iframe is ready to be displayed
  useEffect(() => {
    if (c.isCallActive && window.parent) {
      window.parent.postMessage({ type: 'NISA_IFRAME_READY' }, '*');
    }
  }, [c.isCallActive]);

  // Notify SDK when minimized/expanded to resize the iframe
  useEffect(() => {
    if (window.parent) {
      window.parent.postMessage({ type: c.isMinimized ? 'NISA_MINIMIZE' : 'NISA_EXPAND' }, '*');
    }
  }, [c.isMinimized]);

  function getHash(str) {
    let hash = 0;
    for (let i = 0, len = str.length; i < len; i++) {
        let chr = str.charCodeAt(i);
        hash = (hash << 5) - hash + chr;
        hash |= 0;
    }
    return hash.toString();
  }

  // Poll DOM changes from backend
  useEffect(() => {
    if (!clientId || !c.isCallActive) return;

    const pollDom = async () => {
      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL}/client/dom/${clientId}`);
        if (res.ok) {
           const json = await res.json();
           const domString = JSON.stringify(json.data);
           const hash = getHash(domString);
           if (hash !== lastDomHash) {
               setLastDomHash(hash);
               if (c.sendContextTurn) {
                   c.sendContextTurn(`[SYSTEM EVENT: Client DOM State Updated. The user's screen currently contains these actionable elements: ${domString}. Do not verbally acknowledge this update. Just keep it in mind.]`);
               }
           }
        }
      } catch (e) {}
    };

    const interval = setInterval(pollDom, 3000);
    pollDom(); // initial
    return () => clearInterval(interval);
  }, [clientId, c.isCallActive, c.sendContextTurn, lastDomHash]);

  // Listen for tool calls and forward to parent window (SDK)
  useEffect(() => {
    const handleToolCall = (e) => {
      const call = e.detail;
      if (call && (call.name === 'clickElement' || call.name === 'spotlightElement' || call.name === 'fillFormField' || call.name === 'navigatePage')) {
         if (window.parent) {
             window.parent.postMessage({ 
                type: 'NISA_TOOL_CALL', 
                command: call.name, 
                targetKey: call.args?.targetKey,
                value: call.args?.value,
                route: call.args?.route
             }, '*');
         }
         // Instantly resolve the tool response inside the iframe so Nisa doesn't hang
         setTimeout(() => {
            window.dispatchEvent(new CustomEvent("nesa:toolresponse", {
               detail: { id: call.id || call.callId, name: call.name, response: { status: "success", executed: true } }
            }));
         }, 500);
      }
    };
    window.addEventListener("nesa:toolcall", handleToolCall);
    return () => window.removeEventListener("nesa:toolcall", handleToolCall);
  }, []);

  return (
    <div className="w-screen h-screen bg-transparent overflow-hidden flex items-center justify-center pointer-events-auto">
      <NesaCallInterface 
        isActive={c.isCallActive} 
        callPhase={c.callPhase} 
        isMinimized={c.isMinimized} 
        onToggleMinimize={c.toggleMinimize} 
        onEndCall={() => {
            c.endCall();
            // Send message to parent to close iframe
            if (window.parent) {
                window.parent.postMessage({ type: 'NISA_END_CALL' }, '*');
            }
        }} 
        nesaState={c.nesaState} 
        isListening={c.isListening} 
        isUserSpeaking={c.isUserSpeaking} 
        transcript={c.transcript} 
        connectionError={c.connectionError} 
        onRetry={c.startCall} 
        forceReply={(cp) => c.forceReply(cp)} 
        position={{ x: 0, y: 0 }} 
        onPositionChange={() => {}} 
        widgetSide="right" 
        dockCorner="bottom-right" 
        onReposition={() => {}} 
      />
    </div>
  );
}

export default function LiveWidget() {
  const [searchParams] = useSearchParams();
  const clientId = searchParams.get('clientId');
  
  return (
    <NesaCallProvider clientId={clientId}>
      <WidgetApp />
    </NesaCallProvider>
  );
}
