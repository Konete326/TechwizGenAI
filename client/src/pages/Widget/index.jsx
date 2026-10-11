import { useEffect, useState, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { NesaCallProvider, useNesaCallContext } from "../../context/NesaCallContext";
import { NesaCallInterface } from "../Studio/NesaCallInterface";

function WidgetApp() {
  const c = useNesaCallContext();
  const [searchParams] = useSearchParams();
  const clientId = searchParams.get('clientId');
  const [lastDomHash, setLastDomHash] = useState('');
  const hasAutoStartedRef = useRef(false);

  useEffect(() => {
    if (!hasAutoStartedRef.current) {
      hasAutoStartedRef.current = true;
      c.startCall();
    }
  }, [c.startCall]);

  useEffect(() => {
    const handleParentMsg = (e) => {
      if (e.data?.type === 'NISA_START_CALL') {
        if (!c.isCallActive) {
          c.startCall();
        }
      }
      if (e.data?.type === 'NISA_ELEMENT_DEMONSTRATED') {
        const { action, element } = e.data;
        if (element && c.sendContextTurn) {
          const textLabel = element.text ? `"${element.text}"` : `<${element.element}>`;
          c.sendContextTurn(`[SYSTEM EVENT: User demonstrated manual ${action || 'interaction'} on element ${textLabel} with XPath "${element.xpath}". Nisa has now learned this element and its selector! Acknowledge warmly in your verbal reply in the user's language that you observed their action, understood it, and have now learned this element, and can click or perform this action for them whenever requested.]`);
        }
      }
    };
    window.addEventListener('message', handleParentMsg);
    return () => window.removeEventListener('message', handleParentMsg);
  }, [c.isCallActive, c.startCall, c.sendContextTurn]);

  useEffect(() => {
    if (window.parent) {
      window.parent.postMessage({ type: 'NISA_IFRAME_READY' }, '*');
    }
  }, []);

  useEffect(() => {
    if (c.isCallActive && window.parent) {
      window.parent.postMessage({ type: 'NISA_IFRAME_READY' }, '*');
    }
  }, [c.isCallActive]);

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
    pollDom();
    return () => clearInterval(interval);
  }, [clientId, c.isCallActive, c.sendContextTurn, lastDomHash]);

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
        if (window.parent) {
          window.parent.postMessage({ 
            type: 'NISA_TOOL_CALL', 
            command: call.name, 
            targetKey: call.args?.targetKey,
            value: call.args?.value,
            route: call.args?.route,
            args: call.args
          }, '*');
        }
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent("nesa:toolresponse", {
            detail: { id: call.id || call.callId, name: call.name, response: { status: "success", executed: true } }
          }));
        }, 500);
      }
    };
    window.addEventListener("nesa:toolcall", handleToolCall);
    return () => window.removeEventListener("nesa:toolcall", handleToolCall);
  }, [c.reposition]);

  return (
    <div className="w-screen h-screen bg-transparent overflow-hidden flex items-center justify-center pointer-events-auto">
      <NesaCallInterface 
        isActive={c.isCallActive} 
        callPhase={c.callPhase} 
        isMinimized={c.isMinimized} 
        onToggleMinimize={c.toggleMinimize} 
        onEndCall={() => {
            c.endCall();
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
