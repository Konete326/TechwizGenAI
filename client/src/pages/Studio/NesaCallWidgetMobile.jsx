import { Minus, X } from "@phosphor-icons/react";
import { NesaCallVideos } from "./NesaCallVideos";
import { NesaCallBody } from "./NesaCallBody";

export function NesaCallWidgetMobile({
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
  forceReply,
  cornerClasses,
  dockCorner
}) {
  if (isMinimized) {
    return (
      <div id="nesa-call-widget-mobile" onClick={onToggleMinimize} className={`fixed z-50 w-44 h-24 rounded-2xl overflow-hidden shadow-2xl border border-white/20 transition-all duration-300 md:hidden bg-zinc-950 cursor-pointer active:scale-95 ${cornerClasses[dockCorner] || "bottom-4 right-4"}`}>
        <NesaCallVideos isSpeaking={isSpeaking} />
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/85 via-transparent to-transparent flex items-end justify-between p-2 z-10 pointer-events-none">
          <div className="flex items-center gap-1.5">
            <span className={`w-1.5 h-1.5 rounded-full ${isSpeaking ? "bg-accent animate-ping" : isListening ? "bg-emerald-400" : "bg-zinc-400"}`} />
            <span className="text-[10px] font-mono text-zinc-200">{durationText}</span>
          </div>
          <button type="button" onClick={(e) => { e.stopPropagation(); onEndCall(); }} className="p-1 rounded-full bg-rose-600 hover:bg-rose-500 text-white pointer-events-auto cursor-pointer shadow" title="End Call">
            <X size={10} weight="bold" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-md:fixed max-md:inset-0 z-50 md:hidden bg-zinc-950 flex flex-col justify-between overflow-hidden pb-8">
      <header className="relative z-10 w-full px-4 py-3 flex items-center justify-between border-b border-border/40 bg-zinc-950/80 backdrop-blur">
        <div className="flex items-center gap-2">
          <button type="button" onClick={onToggleMinimize} className="p-1 rounded-md text-zinc-400 hover:text-zinc-100 transition-colors cursor-pointer mr-1" title="Minimize" aria-label="Minimize call"><Minus size={18} weight="bold" /></button>
          <img src="/Nesa.png" alt="Nesa" className="w-5 h-5 rounded-full object-cover border border-zinc-700 shrink-0" />
          <span className="text-xs font-semibold text-zinc-100">Nisa</span>
        </div>
        <div className="flex items-center gap-2">
          <span title={`Connection: ${connectionQuality}`} className={`w-1.5 h-1.5 rounded-full ${connectionQuality === "good" ? "bg-emerald-500" : connectionQuality === "weak" ? "bg-amber-500" : "bg-rose-500"}`} />
          <span className="text-xs font-mono text-zinc-300">{durationText}</span>
          <button type="button" onClick={onEndCall} className="p-1 rounded-md text-zinc-400 hover:text-rose-400 transition-colors cursor-pointer ml-1" title="Close Call" aria-label="Close call"><X size={18} weight="bold" /></button>
        </div>
      </header>
      <NesaCallBody isSpeaking={isSpeaking} showRinging={showRinging} isFadingRinging={isFadingRinging} onEndCall={onEndCall} connectionError={connectionError} onRetry={onRetry} isRinging={isRinging} callPhase={callPhase} forceReply={forceReply} isListening={isListening} isUserSpeaking={isUserSpeaking} />
    </div>
  );
}
