import { Headset, Phone, SpeakerHigh, Waveform } from "@phosphor-icons/react";
import { useNesaCallContext } from "@/context/NesaCallContext";
import { NesaCallVideos } from "./NesaCallVideos";
import { NesaCallRinging } from "./NesaCallRinging";

export function NesaCallBody({
  isSpeaking, showRinging, isFadingRinging, onEndCall, connectionError, onRetry,
  isRinging, callPhase, forceReply, isListening, isUserSpeaking
}) {
  const { micMode, toggleMicMode } = useNesaCallContext();
  const halfDuplex = micMode !== "full";
  return (
    <div className="relative flex-1 flex flex-col justify-between overflow-hidden select-none pt-12">
      <NesaCallVideos isSpeaking={isSpeaking} />
      {showRinging && <NesaCallRinging isFadingRinging={isFadingRinging} onEndCall={onEndCall} />}
      {connectionError && (
        <div className="absolute inset-x-4 top-14 z-30 p-3 rounded-lg bg-rose-950/90 border border-rose-500/50 text-rose-200 backdrop-blur-md shadow-xl flex flex-col items-center gap-1.5 text-center">
          <span className="text-xs font-semibold text-rose-300">Connection Error</span>
          <span className="text-[11px] text-rose-200 leading-snug break-words max-h-16 overflow-y-auto w-full">{connectionError}</span>
          <div className="flex items-center gap-2 mt-0.5">
            <button type="button" onClick={onRetry} className="px-3 py-1 rounded bg-rose-600 hover:bg-rose-500 text-white text-xs font-medium transition-colors cursor-pointer shadow">Retry</button>
            <button type="button" onClick={onEndCall} className="px-3 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium transition-colors cursor-pointer border border-zinc-700">Close</button>
          </div>
        </div>
      )}
      <div className="relative z-10 flex-1" />
      <div className="relative z-10 w-full px-4 pb-4 md:pb-3 pt-1 flex flex-col items-center gap-2 bg-gradient-to-t from-zinc-950/95 via-zinc-950/75 to-transparent">
        {!isRinging && (
          <div className="flex items-center justify-center transition-opacity duration-700">
            <div className={`w-7 h-7 rounded-full border flex items-center justify-center backdrop-blur-md shadow-md shrink-0 relative transition-all ${isUserSpeaking ? "bg-emerald-950/60 border-emerald-400 text-emerald-400 shadow-emerald-500/25" : "bg-zinc-900/60 border-zinc-700 text-zinc-400"}`}>
              {isUserSpeaking && <span className="absolute inset-0 rounded-full bg-emerald-400/25 animate-ping pointer-events-none" />}
              <Waveform size={14} weight="duotone" className={isUserSpeaking ? "animate-pulse scale-110" : ""} />
            </div>
          </div>
        )}
        <div className="w-full flex items-center justify-between px-1">
          <div className="w-16 flex flex-col items-start gap-1">
            {callPhase === "connected" && forceReply && <button type="button" onClick={() => forceReply("Hello Nisa")} className="text-[10px] font-mono text-zinc-400 hover:text-accent transition-colors cursor-pointer px-1.5 py-0.5 rounded border border-zinc-800 hover:border-accent/40 bg-zinc-900/60 whitespace-nowrap" title="Force model reply">Say Hello</button>}
            {callPhase === "connected" && toggleMicMode && (
              <button type="button" onClick={toggleMicMode} title={halfDuplex ? "Half-duplex: mic is muted while Nisa speaks and for 400ms after. Tap to allow interrupting her." : "Full-duplex: you can interrupt Nisa. Tap to mute the mic while she speaks."} className="flex items-center gap-1 text-[10px] font-mono text-zinc-400 hover:text-accent transition-colors cursor-pointer px-1.5 py-0.5 rounded border border-zinc-800 hover:border-accent/40 bg-zinc-900/60 whitespace-nowrap">
                {halfDuplex ? <SpeakerHigh size={11} /> : <Headset size={11} />}
                <span>{halfDuplex ? "Half" : "Full"}</span>
              </button>
            )}
          </div>
          <button type="button" onClick={onEndCall} className="w-11 h-11 rounded-full bg-rose-600 hover:bg-rose-500 active:scale-95 text-white flex items-center justify-center shadow-lg shadow-rose-600/40 border-2 border-rose-400/30 transition-all cursor-pointer shrink-0" title="End Call" aria-label="End call"><Phone size={20} weight="fill" className="rotate-[135deg]" /></button>
          <div className="w-16" />
        </div>
      </div>
    </div>
  );
}
