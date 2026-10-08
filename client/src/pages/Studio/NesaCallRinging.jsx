import { Phone } from "@phosphor-icons/react";

export function NesaCallRinging({ isFadingRinging, onEndCall }) {
  return (
    <div className={`absolute inset-0 z-20 flex flex-col items-center justify-center bg-zinc-950/90 backdrop-blur-md text-zinc-100 p-6 select-none transition-all duration-700 ease-out ${isFadingRinging ? "opacity-0 scale-105 pointer-events-none" : "opacity-100 scale-100"}`}>
      <div className={`relative flex items-center justify-center mb-8 ${!isFadingRinging ? "animate-vibrate" : ""}`}>
        <div className="w-36 h-36 rounded-full bg-accent/10 animate-ping opacity-20 absolute" />
        <div className="w-28 h-28 rounded-full bg-accent/20 animate-ping opacity-40 absolute [animation-delay:200ms]" />
        <div className="w-20 h-20 rounded-full bg-accent/30 animate-ping opacity-60 absolute [animation-delay:400ms]" />
        <div className="w-16 h-16 rounded-full border-2 border-accent/80 p-0.5 shadow-2xl shadow-accent/40 relative overflow-hidden bg-zinc-900 flex items-center justify-center">
          <img src="/Nesa.png" alt="Nesa" className="w-full h-full object-cover rounded-full" />
        </div>
      </div>
      <h2 className="text-base font-semibold text-zinc-100 mb-1">{isFadingRinging ? "Connected" : "Ringing..."}</h2>
      <p className="text-xs text-zinc-400 mb-6">{isFadingRinging ? "Starting call with Nisa" : "Calling Nisa, picking up shortly"}</p>
      {!isFadingRinging && (
        <button type="button" onClick={onEndCall} className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold shadow-lg shadow-rose-600/30 transition-all cursor-pointer active:scale-95" title="Cancel Call">
          <Phone size={16} weight="fill" className="rotate-[135deg]" /><span>Cancel</span>
        </button>
      )}
    </div>
  );
}
