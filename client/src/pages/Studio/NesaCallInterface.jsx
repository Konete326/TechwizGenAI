import { useState, useEffect } from "react";
import { PhoneDisconnect, Sparkle, Waveform } from "@phosphor-icons/react";

export function NesaCallInterface({
  isActive = false,
  onEndCall,
  nesaState = "idle",
  isListening = false,
  transcript = ""
}) {
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    if (!isActive) {
      setDuration(0);
      return;
    }
    const timer = setInterval(() => {
      setDuration((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [isActive]);

  if (!isActive) return null;

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  const isSpeaking = nesaState === "speaking";

  const getStatusText = () => {
    if (isSpeaking) return "Nesa is speaking...";
    if (isListening) return "Nesa is listening...";
    return "Nesa is thinking...";
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-between bg-zinc-950 text-zinc-100 overflow-hidden select-none animate-in fade-in duration-300">
      <video
        src="/nesa-idle.mp4"
        autoPlay
        loop
        muted
        playsInline
        preload="auto"
        className={`transition-opacity duration-[800ms] ease-in-out absolute inset-0 w-full h-full object-cover pointer-events-none ${
          !isSpeaking ? "opacity-100" : "opacity-0"
        }`}
      />
      <video
        src="/nesa-speaking.mp4"
        autoPlay
        loop
        muted
        playsInline
        preload="auto"
        className={`transition-opacity duration-[800ms] ease-in-out absolute inset-0 w-full h-full object-cover pointer-events-none ${
          isSpeaking ? "opacity-100" : "opacity-0"
        }`}
      />

      <div className="absolute inset-0 bg-gradient-to-b from-zinc-950/80 via-transparent to-zinc-950/90 pointer-events-none" />
      <div className="absolute inset-0 bg-zinc-950/25 pointer-events-none" />

      <header className="relative z-10 w-full px-6 py-5 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-accent/20 border border-accent/40 flex items-center justify-center text-accent">
            <Sparkle size={18} weight="fill" />
          </div>
          <div>
            <h1 className="text-sm sm:text-base font-semibold tracking-wide text-zinc-100">Call with Nesa</h1>
            <p className="text-[11px] font-mono text-zinc-400">AI Voice Companion</p>
          </div>
        </div>

        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-900/80 border border-zinc-800 backdrop-blur-md">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs font-mono font-medium text-zinc-300">{formatDuration(duration)}</span>
        </div>
      </header>

      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-6">
        <div className="relative flex items-center justify-center mb-6">
          <div
            className={`absolute w-32 h-32 rounded-full transition-all duration-700 ${
              isSpeaking
                ? "bg-accent/20 scale-150 animate-ping opacity-60"
                : isListening
                ? "bg-emerald-500/20 scale-125 animate-pulse opacity-50"
                : "bg-zinc-800/30 scale-100 opacity-20"
            }`}
          />
          <div
            className={`relative w-20 h-20 rounded-full border flex items-center justify-center backdrop-blur-md shadow-2xl transition-colors duration-300 ${
              isSpeaking
                ? "bg-accent/25 border-accent text-accent shadow-accent/20"
                : isListening
                ? "bg-emerald-950/50 border-emerald-500/60 text-emerald-400 shadow-emerald-500/20"
                : "bg-zinc-900/60 border-zinc-700 text-zinc-400"
            }`}
          >
            <Waveform size={36} weight="duotone" className={isSpeaking || isListening ? "animate-pulse" : ""} />
          </div>
        </div>

        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-zinc-900/90 border border-zinc-800 backdrop-blur shadow-lg">
          <span
            className={`w-2 h-2 rounded-full ${
              isSpeaking ? "bg-accent animate-ping" : isListening ? "bg-emerald-400 animate-pulse" : "bg-amber-400"
            }`}
          />
          <span className="text-xs font-medium text-zinc-200">{getStatusText()}</span>
        </div>
      </div>

      <footer className="relative z-10 w-full px-6 pb-8 pt-4 flex flex-col items-center gap-5">
        <div className="w-full max-w-xl min-h-[52px] flex items-center justify-center">
          {transcript ? (
            <div className="px-4 py-2.5 rounded-2xl bg-zinc-900/90 border border-zinc-800/80 backdrop-blur-md text-xs sm:text-sm text-zinc-200 shadow-xl text-center animate-in fade-in slide-in-from-bottom-2 duration-200 max-h-24 overflow-y-auto">
              <span>{transcript}</span>
            </div>
          ) : (
            <p className="text-xs text-zinc-400 text-center font-mono">
              {isSpeaking ? "Listen to Nesa's voice response..." : "Speak naturally into your microphone..."}
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={onEndCall}
          className="w-16 h-16 rounded-full bg-rose-600 hover:bg-rose-500 active:scale-95 text-white flex items-center justify-center shadow-2xl shadow-rose-600/40 border-2 border-rose-400/30 transition-all duration-150 cursor-pointer"
          title="End Call"
          aria-label="End call"
        >
          <PhoneDisconnect size={28} weight="fill" />
        </button>
      </footer>
    </div>
  );
}

export default NesaCallInterface;
