import { useEffect } from "react";
import { NesaCallProvider, useNesaCallContext } from "../../context/NesaCallContext";
import { NesaCallInterface } from "../Studio/NesaCallInterface";

function WidgetApp() {
  const c = useNesaCallContext();

  useEffect(() => {
    // Auto start the call when this iframe loads
    if (!c.isCallActive && c.callPhase === "ended") {
      c.startCall();
    }
  }, [c.isCallActive, c.callPhase, c.startCall]);

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
  return (
    <NesaCallProvider>
      <WidgetApp />
    </NesaCallProvider>
  );
}
