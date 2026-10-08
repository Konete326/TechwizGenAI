import { Minus, X } from "@phosphor-icons/react";
import { NesaCallMinimized } from "./NesaCallMinimized";
import { NesaCallBody } from "./NesaCallBody";

export function NesaCallWidgetDesktop({
  isMinimized,
  durationText,
  isSpeaking,
  isListening,
  isUserSpeaking,
  onToggleMinimize,
  onEndCall,
  connectionQuality,
  showRinging,
  isFadingRinging,
  connectionError,
  onRetry,
  isRinging,
  callPhase,
  forceReply
}) {
  if (isMinimized) {
    return <NesaCallMinimized durationText={durationText} isSpeaking={isSpeaking} isListening={isListening} onMaximize={onToggleMinimize} onEndCall={onEndCall} />;
  }

  return (
    <div className="md:w-[340px] md:h-[520px] rounded-xl border border-white/10 bg-zinc-950/90 backdrop-blur-md shadow-2xl flex flex-col overflow-hidden relative">
      <div className="call-drag-handle cursor-grab active:cursor-grabbing bg-gradient-to-b from-zinc-950/80 to-transparent p-3 flex justify-between items-center z-20 absolute top-0 w-full select-none">
        <div className="flex items-center gap-2">
          <img src="/Nesa.png" alt="Nesa" className="w-5 h-5 rounded-full object-cover border border-zinc-700 shrink-0" />
          <span className="text-xs font-medium text-zinc-200">Call with Nisa</span>
          <span title={`Connection: ${connectionQuality}`} className={`w-1.5 h-1.5 rounded-full ml-1 ${connectionQuality === "good" ? "bg-emerald-500" : connectionQuality === "weak" ? "bg-amber-500" : "bg-rose-500"}`} />
          <span className="text-[10px] font-mono text-zinc-400">{durationText}</span>
        </div>
        <div className="flex items-center gap-1">
          <button type="button" onClick={onToggleMinimize} className="p-1 rounded hover:bg-zinc-800/80 text-zinc-400 hover:text-zinc-100 transition-colors cursor-pointer" title="Minimize" aria-label="Minimize"><Minus size={13} weight="bold" /></button>
          <button type="button" onClick={onEndCall} className="p-1 rounded hover:bg-rose-900/50 text-zinc-400 hover:text-rose-400 transition-colors cursor-pointer" title="End Call" aria-label="End call"><X size={13} weight="bold" /></button>
        </div>
      </div>
      <NesaCallBody isSpeaking={isSpeaking} showRinging={showRinging} isFadingRinging={isFadingRinging} onEndCall={onEndCall} connectionError={connectionError} onRetry={onRetry} isRinging={isRinging} callPhase={callPhase} forceReply={forceReply} isListening={isListening} isUserSpeaking={isUserSpeaking} />
    </div>
  );
}
