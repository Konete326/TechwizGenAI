import { useState, useEffect, useRef } from "react";
import Draggable from "react-draggable";
import { Phone, PhoneCall, Waveform, Minus, X } from "@phosphor-icons/react";
import logoImg from "@/assets/logo.png";
import { NesaCallMinimized } from "./NesaCallMinimized";
import { NesaCallVideos } from "./NesaCallVideos";
import { playRingingTone } from "./audioUtils";

export function NesaCallInterface({
  isActive = false, callPhase = "ended", isMinimized = false,
  onToggleMinimize, onEndCall, nesaState = "idle",
  isListening = false, transcript = "", connectionError = null, onRetry
}) {
  const [duration, setDuration] = useState(0);
  const nodeRef = useRef(null);

  useEffect(() => {
    if (callPhase !== "connected") { setDuration(0); return; }
    const timer = setInterval(() => setDuration((p) => p + 1), 1000);
    return () => clearInterval(timer);
  }, [callPhase]);

  useEffect(() => {
    if (callPhase !== "ringing") return;
    const stopTone = playRingingTone();
    return () => stopTone();
  }, [callPhase]);

  if (!isActive && callPhase === "ended") return null;

  const formatDuration = (sec) => `${String(Math.floor(sec / 60)).padStart(2, "0")}:${String(sec % 60).padStart(2, "0")}`;

  const isSpeaking = nesaState === "speaking";
  const isRinging = callPhase === "ringing";
  const durationText = formatDuration(duration);

  const renderRinging = () => (
    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-zinc-950/90 backdrop-blur-md text-zinc-100 p-6 select-none">
      <div className="relative flex items-center justify-center mb-8">
        <div className="w-36 h-36 rounded-full bg-accent/10 animate-ping opacity-20 absolute" />
        <div className="w-28 h-28 rounded-full bg-accent/20 animate-ping opacity-40 absolute [animation-delay:200ms]" />
        <div className="w-20 h-20 rounded-full bg-accent/30 animate-ping opacity-60 absolute [animation-delay:400ms]" />
        <div className="w-16 h-16 rounded-full border-2 border-accent/80 p-0.5 shadow-2xl shadow-accent/40 relative overflow-hidden bg-zinc-900 flex items-center justify-center">
          <img src="/Nesa.jpeg" alt="Nesa" className="w-full h-full object-cover rounded-full" />
        </div>
      </div>
      <h2 className="text-base font-semibold text-zinc-100 mb-1">Ringing...</h2>
      <p className="text-xs text-zinc-400 mb-6">Calling Nesa, picking up shortly</p>
      <button
        type="button"
        onClick={onEndCall}
        className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold shadow-lg shadow-rose-600/30 transition-all cursor-pointer active:scale-95"
        title="Cancel Call"
      >
        <Phone size={16} weight="fill" className="rotate-[135deg]" />
        <span>Cancel</span>
      </button>
    </div>
  );

  const renderCallBody = () => (
    <div className="relative flex-1 flex flex-col justify-between overflow-hidden select-none pt-12">
      {isRinging ? renderRinging() : <NesaCallVideos isSpeaking={isSpeaking} />}
      {connectionError && (
        <div className="absolute inset-x-4 top-14 z-30 p-3 rounded-lg bg-rose-950/90 border border-rose-500/50 text-rose-200 backdrop-blur-md shadow-xl flex flex-col items-center gap-1.5 text-center">
          <span className="text-xs font-semibold text-rose-300">Connection Error</span>
          <span className="text-[11px] text-rose-200 leading-snug break-words max-h-16 overflow-y-auto w-full">{connectionError}</span>
          <div className="flex items-center gap-2 mt-0.5">
            <button type="button" onClick={onRetry} className="px-3 py-1 rounded bg-rose-600 hover:bg-rose-500 text-white text-xs font-medium transition-colors cursor-pointer shadow">
              Retry
            </button>
            <button type="button" onClick={onEndCall} className="px-3 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium transition-colors cursor-pointer border border-zinc-700">
              Close
            </button>
          </div>
        </div>
      )}

      <div className="relative z-10 flex-1" />

      <div className="relative z-10 w-full px-4 pb-4 md:pb-3 pt-1 flex flex-col items-center gap-2 bg-gradient-to-t from-zinc-950/95 via-zinc-950/75 to-transparent">
        {!isRinging && (
          <div className="flex items-center gap-2">
            <div
              className={`w-7 h-7 rounded-full border flex items-center justify-center backdrop-blur-md shadow-md shrink-0 relative transition-all ${
                isSpeaking ? "bg-accent/25 border-accent text-accent shadow-accent/20" : isListening ? "bg-emerald-950/50 border-emerald-500/60 text-emerald-400 shadow-emerald-500/20" : "bg-zinc-900/60 border-zinc-700 text-zinc-400"
              }`}
            >
              {isSpeaking && (
                <span className="absolute inset-0 rounded-full bg-accent/30 animate-ping pointer-events-none" />
              )}
              <Waveform size={14} weight="duotone" className={isSpeaking ? "animate-pulse scale-110" : ""} />
            </div>

            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-zinc-900/90 border border-zinc-800 backdrop-blur shadow-sm">
              <span className={`w-1.5 h-1.5 rounded-full ${isSpeaking ? "bg-accent animate-ping" : isListening ? "bg-emerald-400 animate-pulse" : "bg-amber-400"}`} />
              <span className="text-[11px] font-medium text-zinc-200">
                {isSpeaking ? "Nesa is speaking..." : isListening ? "Nesa is listening..." : "Nesa is thinking..."}
              </span>
            </div>
          </div>
        )}

        <div className="w-full min-h-[26px] max-h-14 flex items-center justify-center">
          {transcript ? (
            <div className="px-2.5 py-1 rounded-lg bg-zinc-900/90 border border-zinc-800/80 backdrop-blur-md text-[11px] text-zinc-200 shadow text-center max-h-12 overflow-y-auto leading-tight">
              <span>{transcript}</span>
            </div>
          ) : (
            <p className="text-[10px] text-zinc-400 text-center font-mono">
              {isRinging ? "Connecting..." : isSpeaking ? "Listen to Nesa's reply..." : "Speak naturally..."}
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={onEndCall}
          className="w-11 h-11 rounded-full bg-rose-600 hover:bg-rose-500 active:scale-95 text-white flex items-center justify-center shadow-lg shadow-rose-600/40 border-2 border-rose-400/30 transition-all cursor-pointer"
          title="End Call"
          aria-label="End call"
        >
          <Phone size={20} weight="fill" className="rotate-[135deg]" />
        </button>
      </div>
    </div>
  );

  return (
    <>
      <div className="max-md:fixed max-md:inset-0 z-50 md:hidden bg-zinc-950 flex flex-col justify-between overflow-hidden pb-8">
        <header className="relative z-10 w-full px-4 py-3 flex items-center justify-between border-b border-border/40 bg-zinc-950/80 backdrop-blur">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onEndCall}
              className="p-1 rounded-md text-zinc-400 hover:text-zinc-100 transition-colors cursor-pointer mr-1"
              title="Close Call"
              aria-label="Close call"
            >
              <X size={18} weight="bold" />
            </button>
            <img src={logoImg} alt="Techwiz GenAI" className="w-4 h-4 object-contain shrink-0" />
            <span className="text-xs font-semibold text-zinc-100">Nesa</span>
          </div>
          <span className="text-xs font-mono text-zinc-300">{durationText}</span>
        </header>
        {renderCallBody()}
      </div>

      <Draggable nodeRef={nodeRef} handle=".call-drag-handle" bounds="body">
        <div ref={nodeRef} className="fixed bottom-6 right-6 z-50 hidden md:block">
          {isMinimized ? (
            <NesaCallMinimized
              durationText={durationText}
              isSpeaking={isSpeaking}
              isListening={isListening}
              onMaximize={onToggleMinimize}
              onEndCall={onEndCall}
            />
          ) : (
            <div className="md:w-[340px] md:h-[520px] rounded-xl border border-white/10 bg-zinc-950/90 backdrop-blur-md shadow-2xl flex flex-col overflow-hidden relative">
              <div className="call-drag-handle cursor-grab active:cursor-grabbing bg-gradient-to-b from-zinc-950/80 to-transparent p-3 flex justify-between items-center z-20 absolute top-0 w-full select-none">
                <div className="flex items-center gap-2">
                  <img src={logoImg} alt="Techwiz GenAI" className="w-4 h-4 object-contain shrink-0" />
                  <span className="text-xs font-medium text-zinc-200">Call with Nesa</span>
                  <span className="text-[10px] font-mono text-zinc-400">{durationText}</span>
                </div>
                <div className="flex items-center gap-1">
                  <button type="button" onClick={onToggleMinimize} className="p-1 rounded hover:bg-zinc-800/80 text-zinc-400 hover:text-zinc-100 transition-colors cursor-pointer" title="Minimize" aria-label="Minimize">
                    <Minus size={13} weight="bold" />
                  </button>
                  <button type="button" onClick={onEndCall} className="p-1 rounded hover:bg-rose-900/50 text-zinc-400 hover:text-rose-400 transition-colors cursor-pointer" title="End Call" aria-label="End call">
                    <X size={13} weight="bold" />
                  </button>
                </div>
              </div>

              {renderCallBody()}
            </div>
          )}
        </div>
      </Draggable>
    </>
  );
}

export default NesaCallInterface;
