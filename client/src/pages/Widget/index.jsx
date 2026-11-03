import { useEffect, useState, useRef, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { VITE_API_URL } from "../../config/env";
import { NesaCallProvider, useNesaCallContext } from "../../context/NesaCallContext";
import { NesaCallInterface } from "../Studio/NesaCallInterface";
import CharacterRegistry from "../../services/character/CharacterRegistry.js";
import { PhoneCall, X } from "@phosphor-icons/react";

const MODAL_TIMEOUT_MS = 120000;

function getNormalizedOrigin(origin) {
  if (!origin || typeof origin !== 'string' || origin === 'null' || origin === '*') return '';
  try {
    const u = new URL(origin);
    if (u.protocol === 'http:' || u.protocol === 'https:' || u.protocol === 'chrome-extension:') {
      return u.origin;
    }
    return '';
  } catch {
    return '';
  }
}

function WidgetApp() {
  const c = useNesaCallContext();
  const [searchParams] = useSearchParams();
  const clientId = searchParams.get('clientId');
  const parentOrigin = searchParams.get('parentOrigin') || '';
  const validParentOrigin = getNormalizedOrigin(parentOrigin);
  const [lastDomHash, setLastDomHash] = useState('');
  const hasAutoStartedRef = useRef(false);
  const modalRequestRef = useRef(null);
  const modalTimeoutRef = useRef(null);
  const turnStateRef = useRef('idle');
  const currentTurnIdRef = useRef(0);
  const connectionGenRef = useRef(0);

  const postToParent = useCallback((msg) => {
    if (window.parent && window.parent !== window) {
      const targetOrigin = validParentOrigin || '*';
      window.parent.postMessage(msg, targetOrigin);
    }
  }, [validParentOrigin]);

  const postModalResult = useCallback((result) => {
    if (window.parent && window.parent !== window && validParentOrigin) {
      window.parent.postMessage({ type: 'NISA_MODAL_RESULT', ...result }, validParentOrigin);
    }
  }, [validParentOrigin]);

  useEffect(() => {
    CharacterRegistry.preloadCharacter("nisa");
  }, []);

  useEffect(() => {
    if (!hasAutoStartedRef.current) {
      hasAutoStartedRef.current = true;
      c.startCall();
    }
  }, [c.startCall]);

  useEffect(() => {
    const isLive = Boolean(c.isCallActive && (c.isListening || c.isConnected));
    if (!isLive || c.connectionError) {
      connectionGenRef.current += 1;
      const activeRequest = modalRequestRef.current;
      if (activeRequest) {
        const errorMsg = c.connectionError || 'Nisa is disconnected. Please check your connection and try again.';
        postModalResult({ requestId: activeRequest.requestId, status: 'error', message: errorMsg });
      }
      modalRequestRef.current = null;
      turnStateRef.current = 'idle';
      if (modalTimeoutRef.current) {
        clearTimeout(modalTimeoutRef.current);
        modalTimeoutRef.current = null;
      }
    }
  }, [c.connectionError, c.isCallActive, c.isListening, c.isConnected, postModalResult]);

  useEffect(() => {
    const handleParentMsg = (e) => {
      if (e.source !== window.parent) return;

      const incomingOrigin = getNormalizedOrigin(e.origin);
      const isModalMsg = e.data?.type === 'NISA_MODAL_SUBMIT' || e.data?.type === 'NISA_MODAL_CANCEL';
      if (isModalMsg) {
        if (!validParentOrigin || incomingOrigin !== validParentOrigin) return;
      } else if (validParentOrigin && incomingOrigin !== validParentOrigin) {
        return;
      }

      if (e.data?.type === 'NISA_START_CALL') {
        if (!c.isCallActive) {
          c.startCall();
        }
      }

      if (e.data?.type === 'NISA_MODAL_SUBMIT') {
        const requestId = e.data.requestId;
        const value = typeof e.data.value === 'string' ? e.data.value.trim() : '';
        if (!requestId || !value) return;

        const isLive = Boolean(c.isCallActive && (c.isListening || c.isConnected));
        if (!isLive || typeof c.forceReply !== 'function') {
          postModalResult({ requestId, status: 'error', message: 'Nisa is not connected. Start the call and try again.' });
          return;
        }

        if (turnStateRef.current !== 'idle') {
          postModalResult({ requestId, status: 'error', message: 'Nisa is still finishing the previous response. Please wait a moment.' });
          return;
        }

        if (modalTimeoutRef.current) {
          clearTimeout(modalTimeoutRef.current);
          modalTimeoutRef.current = null;
        }

        currentTurnIdRef.current += 1;
        const turnId = currentTurnIdRef.current;
        const connGen = connectionGenRef.current;
        modalRequestRef.current = { requestId, turnId, connGen };
        turnStateRef.current = 'active';
        postModalResult({ requestId, status: 'accepted' });

        const modalTitle = typeof e.data.title === 'string' && e.data.title.trim() ? e.data.title.trim() : 'Modal Form';
        const modalPrompt = typeof e.data.content === 'string' && e.data.content.trim() ? ` (Context/Question: "${e.data.content.trim()}")` : '';
        const modalMessage = `[SYSTEM EVENT: User submitted text via Dynamic Modal "${modalTitle}"${modalPrompt}. Submitted text: """${value}"""]. Nisa, immediately acknowledge verbally in the user's language that you have received this exact submission ("Haan, mere paas aapka input pohanch chuka hai!"), read and reference the submitted details, and fulfill what the user asked.`;

        let sent = false;
        try {
          sent = Boolean(c.forceReply(modalMessage));
        } catch {
          sent = false;
        }
        if (!sent) {
          turnStateRef.current = 'idle';
          modalRequestRef.current = null;
          postModalResult({ requestId, status: 'error', message: 'Nisa could not receive the request. Please try again.' });
        } else {
          modalTimeoutRef.current = setTimeout(() => {
            if (modalRequestRef.current?.requestId !== requestId ||
                modalRequestRef.current?.turnId !== turnId ||
                modalRequestRef.current?.connGen !== connGen) return;
            turnStateRef.current = 'draining';
            modalRequestRef.current = null;
            modalTimeoutRef.current = null;
            postModalResult({ requestId, status: 'error', message: 'Nisa is taking longer than expected. Please try again.' });
          }, MODAL_TIMEOUT_MS);
        }
      }

      if (e.data?.type === 'NISA_MODAL_CANCEL' && modalRequestRef.current?.requestId === e.data.requestId) {
        modalRequestRef.current = null;
        if (modalTimeoutRef.current) {
          clearTimeout(modalTimeoutRef.current);
          modalTimeoutRef.current = null;
        }
        if (turnStateRef.current === 'active') {
          turnStateRef.current = 'draining';
        }
      }

      if (e.data?.type === 'NISA_ELEMENT_DEMONSTRATED') {
        const { action, element } = e.data;
        if (element && c.forceReply) {
          const textLabel = element.text ? `"${element.text}"` : `<${element.element}>`;
          c.forceReply(`[SYSTEM EVENT: User demonstrated manual ${action || 'interaction'} on element ${textLabel} with XPath "${element.xpath}". Nisa has now learned this element and its selector! Acknowledge warmly in your verbal reply in the user's language that you observed their action, understood it, and have now learned this element, and can click or perform this action for them whenever requested.]`);
        }
      }
    };

    window.addEventListener('message', handleParentMsg);
    return () => window.removeEventListener('message', handleParentMsg);
  }, [validParentOrigin, c.isCallActive, c.isListening, c.isConnected, c.forceReply, c.startCall, postModalResult]);

  useEffect(() => {
    const handleAssistantText = (e) => {
      const activeRequest = modalRequestRef.current;
      if (!activeRequest ||
          activeRequest.turnId !== currentTurnIdRef.current ||
          activeRequest.connGen !== connectionGenRef.current ||
          turnStateRef.current !== 'active' ||
          !e.detail?.text) return;
      postModalResult({ requestId: activeRequest.requestId, status: 'stream', text: e.detail.text });
    };

    const handleTurnComplete = () => {
      setTimeout(() => {
        const isDraining = turnStateRef.current === 'draining';
        turnStateRef.current = 'idle';
        if (modalTimeoutRef.current) {
          clearTimeout(modalTimeoutRef.current);
          modalTimeoutRef.current = null;
        }
        if (isDraining) return;
        const activeRequest = modalRequestRef.current;
        if (!activeRequest ||
            activeRequest.turnId !== currentTurnIdRef.current ||
            activeRequest.connGen !== connectionGenRef.current) return;
        modalRequestRef.current = null;
        postModalResult({ requestId: activeRequest.requestId, status: 'complete' });
      }, 0);
    };

    const handleTurnInterrupted = () => {
      const isDraining = turnStateRef.current === 'draining';
      turnStateRef.current = 'idle';
      if (modalTimeoutRef.current) {
        clearTimeout(modalTimeoutRef.current);
        modalTimeoutRef.current = null;
      }
      if (isDraining) return;
      const activeRequest = modalRequestRef.current;
      if (!activeRequest ||
          activeRequest.turnId !== currentTurnIdRef.current ||
          activeRequest.connGen !== connectionGenRef.current) return;
      modalRequestRef.current = null;
      postModalResult({ requestId: activeRequest.requestId, status: 'interrupted', message: 'Nisa was interrupted. Please try again.' });
    };

    window.addEventListener('nisa:live:assistant_text', handleAssistantText);
    window.addEventListener('nisa:live:turn_complete', handleTurnComplete);
    window.addEventListener('nisa:live:turn_interrupted', handleTurnInterrupted);
    return () => {
      window.removeEventListener('nisa:live:assistant_text', handleAssistantText);
      window.removeEventListener('nisa:live:turn_complete', handleTurnComplete);
      window.removeEventListener('nisa:live:turn_interrupted', handleTurnInterrupted);
    };
  }, [postModalResult]);

  useEffect(() => {
    return () => {
      if (modalTimeoutRef.current) {
        clearTimeout(modalTimeoutRef.current);
        modalTimeoutRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    postToParent({ type: 'NISA_IFRAME_READY' });
  }, [postToParent]);

  useEffect(() => {
    if (c.isCallActive) {
      postToParent({ type: 'NISA_IFRAME_READY' });
    }
  }, [c.isCallActive, postToParent]);

  useEffect(() => {
    postToParent({ type: c.isMinimized ? 'NISA_MINIMIZE' : 'NISA_EXPAND' });
  }, [c.isMinimized, postToParent]);

  function getHash(str) {
    let hash = 0;
    for (let i = 0, len = str.length; i < len; i++) {
        let chr = str.charCodeAt(i);
        hash = (hash << 5) - hash + chr;
        hash |= 0;
    }
    return hash.toString();
  }

  useEffect(() => {
    if (!clientId || !c.isCallActive) return;

    const pollDom = async () => {
      try {
        const res = await fetch(`${VITE_API_URL}/client/dom/${clientId}`);
        if (res.ok) {
           const json = await res.json();
           const domString = JSON.stringify(json.data);
           const hash = getHash(domString);
           if (hash !== lastDomHash) {
               setLastDomHash(hash);
           }
        }
      } catch (e) {}
    };

    const interval = setInterval(pollDom, 5000);
    pollDom();
    return () => clearInterval(interval);
  }, [clientId, c.isCallActive, lastDomHash]);

  useEffect(() => {
    const handleToolCall = (e) => {
      const call = e.detail;
      if (call) {
        if (call.name === "repositionWidget") {
          const pos = call.args?.position || call.position;
          if (pos && c.reposition) {
            c.reposition(pos);
          }
        }
        postToParent({ 
          type: 'NISA_TOOL_CALL', 
          command: call.name, 
          targetKey: call.args?.targetKey,
          value: call.args?.value,
          route: call.args?.route,
          args: call.args
        });
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent("nesa:toolresponse", {
            detail: { id: call.id || call.callId, name: call.name, response: { status: "success", executed: true } }
          }));
        }, 500);
      }
    };
    window.addEventListener("nesa:toolcall", handleToolCall);
    return () => window.removeEventListener("nesa:toolcall", handleToolCall);
  }, [c.reposition, postToParent]);

  const isCallRunning = Boolean(c.isCallActive || c.callPhase === "ringing" || c.callPhase === "connected");

  if (!isCallRunning) {
    return (
      <div className="w-screen h-screen bg-transparent overflow-hidden flex items-center justify-center p-4 select-none">
        <div className="w-full max-w-[340px] rounded-2xl border border-white/10 bg-zinc-950/95 backdrop-blur-xl shadow-2xl p-6 flex flex-col items-center text-center relative">
          <button
            type="button"
            onClick={() => postToParent({ type: "NISA_END_CALL" })}
            className="absolute top-3.5 right-3.5 p-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-white/10 transition-colors cursor-pointer"
            title="Close"
            aria-label="Close"
          >
            <X size={15} weight="bold" />
          </button>

          <div className="relative mb-4 mt-2">
            <div className="w-20 h-20 rounded-full border-2 border-accent/40 p-1 shadow-lg shadow-accent/20 flex items-center justify-center bg-zinc-900">
              <img src="/Nesa.png" alt="Nisa" className="w-full h-full rounded-full object-cover" />
            </div>
            <span className="absolute bottom-1 right-1 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-zinc-950 shadow" />
          </div>

          <h3 className="text-base font-semibold text-zinc-100 tracking-tight">Call with Nisa</h3>
          <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
            Autonomous Voice Assistant. Ready to navigate, click, fill forms, and operate this system by voice.
          </p>

          {c.connectionError && (
            <div className="mt-3 p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs text-left w-full">
              {c.connectionError}
            </div>
          )}

          <div className="w-full mt-5">
            <button
              type="button"
              onClick={() => c.startCall()}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-accent hover:bg-accent-hover text-white text-xs font-semibold shadow-lg shadow-accent/25 transition-all cursor-pointer active:scale-[0.98]"
            >
              <PhoneCall size={16} weight="bold" />
              <span>Start Voice Call</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-screen h-screen bg-transparent overflow-hidden flex items-center justify-center pointer-events-auto">
      <NesaCallInterface 
        isActive={c.isCallActive} 
        callPhase={c.callPhase} 
        isMinimized={c.isMinimized} 
        onToggleMinimize={c.toggleMinimize} 
        onEndCall={() => {
            c.endCall();
            postToParent({ type: 'NISA_END_CALL' });
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
