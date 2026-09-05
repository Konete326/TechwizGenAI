import { Waveform, CornersOut, Phone } from "@phosphor-icons/react";

export function NesaCallMinimized({
  durationText,
  isSpeaking,
  isListening,
  onMaximize,
  onEndCall
}) {
  return (
    <div className="call-drag-handle cursor-grab active:cursor-grabbing w-64 h-[72px] bg-zinc-900/90 backdrop-blur-lg border border-white/5 rounded-full shadow-xl px-4 py-2 flex items-center justify-between select-none animate-in fade-in zoom-in-95 duration-200">
      <div className="flex items-center gap-3 min-w-0">
        <div
          className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-all duration-300 relative ${
            isSpeaking
              ? "bg-accent/25 text-accent border border-accent/60 shadow-lg shadow-accent/30"
              : isListening
              ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
              : "bg-zinc-800 text-zinc-400 border border-zinc-700"
          }`}
        >
          {isSpeaking && (
            <span className="absolute inset-0 rounded-full bg-accent/30 animate-ping pointer-events-none" />
          )}
          <Waveform
            size={20}
            weight="duotone"
            className={isSpeaking ? "animate-pulse scale-125 transition-transform duration-200" : ""}
          />
        </div>
        <div className="min-w-0 flex flex-col justify-center">
          <p className="text-xs font-semibold text-zinc-100 truncate leading-tight">Nesa</p>
          <p className="text-[10px] font-mono text-zinc-400 leading-tight mt-0.5">{durationText}</p>
        </div>
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        <button
          type="button"
          onClick={onMaximize}
          className="w-8 h-8 rounded-full bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 hover:text-white border border-white/10 flex items-center justify-center transition-colors cursor-pointer"
          title="Maximize call"
          aria-label="Maximize call"
        >
          <CornersOut size={14} weight="bold" />
        </button>
        <button
          type="button"
          onClick={onEndCall}
          className="w-8 h-8 rounded-full bg-rose-600 hover:bg-rose-500 text-white flex items-center justify-center transition-colors cursor-pointer shadow-sm"
          title="End call"
          aria-label="End call"
        >
          <Phone size={14} weight="fill" className="rotate-[135deg]" />
        </button>
      </div>
    </div>
  );
}

export default NesaCallMinimized;
