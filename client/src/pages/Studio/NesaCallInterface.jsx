import { useState, useEffect, useRef } from "react";
import Draggable from "react-draggable";
import { PhoneDisconnect, PhoneCall, Sparkle, Waveform, Minus, X } from "@phosphor-icons/react";
import { NesaCallMinimized } from "./NesaCallMinimized";
import { NesaCallVideos } from "./NesaCallVideos";

export function NesaCallInterface({
  isActive = false,
  callPhase = "ended",
  isMinimized = false,
  onToggleMinimize,
  onEndCall,
  nesaState = "idle",
  isListening = false,
  transcript = ""
}) {
  const [duration, setDuration] = useState(0);
  const nodeRef = useRef(null);

  useEffect(() => {
    if (callPhase !== "connected") {
      setDuration(0);
      return;
    }
    const timer = setInterval(() => setDuration((p) => p + 1), 1000);
    return () => clearInterval(timer);
  }, [callPhase]);

  if (!isActive && callPhase === "ended") return null;

  const formatDuration = (sec) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  const isSpeaking = nesaState === "speaking";
  const isRinging = callPhase === "ringing";
  const durationText = formatDuration(duration);

  const renderRinging = () => (
    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-zinc-950/90 backdrop-blur-md text-zinc-100 p-6 select-none">
      <div className="relative flex items-center justify-center mb-8">
        <div className="w-36 h-36 rounded-full bg-accent/10 animate-ping opacity-20 absolute" />
        <div className="w-28 h-28 rounded-full bg-accent/20 animate-ping opacity-40 absolute [animation-delay:200ms]" />
        <div className="w-20 h-20 rounded-full bg-accent/30 animate-ping opacity-60 absolute [animation-delay:400ms]" />
        <div className="w-16 h-16 rounded-full bg-accent/25 border border-accent/80 flex items-center justify-center text-accent shadow-2xl shadow-accent/30 relative">
          <PhoneCall size={28} weight="fill" className="animate-pulse" />
        </div>
      </div>
      <h2 className="text-base font-semibold text-zinc-100 mb-1">Calling Nesa...</h2>
      <p className="text-xs font-mono text-zinc-400">Connecting secure audio stream</p>
    </div>
  );

  const renderCallBody = () => (
    <div className="relative flex-1 flex flex-col justify-between overflow-hidden select-none pt-12">
      {isRinging ? renderRinging() : <NesaCallVideos isSpeaking={isSpeaking} />}

      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-4">
        {!isRinging && (
          <>
            <div className="relative flex items-center justify-center mb-4">
              <div
                className={`absolute w-24 h-24 rounded-full transition-all duration-700 ${
                  isSpeaking
                    ? "bg-accent/20 scale-150 animate-ping opacity-60"
                    : isListening
                    ? "bg-emerald-500/20 scale-125 animate-pulse opacity-50"
                    : "bg-zinc-800/30 scale-100 opacity-20"
                }`}
              />
              <div
                className={`relative w-14 h-14 rounded-full border flex items-center justify-center backdrop-blur-md shadow-xl ${
                  isSpeaking
                    ? "bg-accent/25 border-accent text-accent shadow-accent/20"
                    : isListening
                    ? "bg-emerald-950/50 border-emerald-500/60 text-emerald-400 shadow-emerald-500/20"
                    : "bg-zinc-900/60 border-zinc-700 text-zinc-400"
                }`}
              >
                <Waveform size={26} weight="duotone" className={isSpeaking || isListening ? "animate-pulse" : ""} />
              </div>
            </div>

            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-900/90 border border-zinc-800 backdrop-blur shadow-md">
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  isSpeaking ? "bg-accent animate-ping" : isListening ? "bg-emerald-400 animate-pulse" : "bg-amber-400"
                }`}
              />
              <span className="text-[11px] font-medium text-zinc-200">
                {isSpeaking ? "Nesa is speaking..." : isListening ? "Nesa is listening..." : "Nesa is thinking..."}
              </span>
            </div>
          </>
        )}
      </div>

      <div className="relative z-10 w-full px-4 pb-8 md:pb-5 pt-2 flex flex-col items-center gap-3">
        <div className="w-full min-h-[44px] flex items-center justify-center">
          {transcript ? (
            <div className="px-3 py-2 rounded-xl bg-zinc-900/90 border border-zinc-800/80 backdrop-blur-md text-xs text-zinc-200 shadow-lg text-center max-h-20 overflow-y-auto">
              <span>{transcript}</span>
            </div>
          ) : (
            <p className="text-[11px] text-zinc-400 text-center font-mono">
              {isRinging ? "Connecting..." : isSpeaking ? "Listen to Nesa's reply..." : "Speak naturally..."}
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={onEndCall}
          className="w-12 h-12 rounded-full bg-rose-600 hover:bg-rose-500 active:scale-95 text-white flex items-center justify-center shadow-xl shadow-rose-600/40 border-2 border-rose-400/30 transition-all cursor-pointer"
          title="End Call"
          aria-label="End call"
        >
          <PhoneDisconnect size={22} weight="fill" />
        </button>
      </div>
    </div>
  );

  return (
    <>
      <div className="max-md:fixed max-md:inset-0 z-50 md:hidden bg-zinc-950 flex flex-col justify-between overflow-hidden pb-8">
        <header className="relative z-10 w-full px-4 py-3 flex items-center justify-between border-b border-border/40 bg-zinc-950/80 backdrop-blur">
          <div className="flex items-center gap-2">
            <Sparkle size={16} weight="fill" className="text-accent" />
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
                  <Sparkle size={14} weight="fill" className="text-accent" />
                  <span className="text-xs font-medium text-zinc-200">Call with Nesa</span>
                  <span className="text-[10px] font-mono text-zinc-400">{durationText}</span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={onToggleMinimize}
                    className="p-1 rounded hover:bg-zinc-800/80 text-zinc-400 hover:text-zinc-100 transition-colors cursor-pointer"
                    title="Minimize"
                    aria-label="Minimize"
                  >
                    <Minus size={13} weight="bold" />
                  </button>
                  <button
                    type="button"
                    onClick={onEndCall}
                    className="p-1 rounded hover:bg-rose-900/50 text-zinc-400 hover:text-rose-400 transition-colors cursor-pointer"
                    title="End Call"
                    aria-label="End call"
                  >
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
