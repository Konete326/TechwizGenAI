import { useEffect, useRef, useState } from "react";

export function NesaCallVideos({ isSpeaking }) {
  const listenRef = useRef(null);
  const talkRef = useRef(null);
  const [listenLoaded, setListenLoaded] = useState(false);

  useEffect(() => {
    const setup = (el, onLoaded) => {
      if (!el) return;
      el.muted = true;
      el.defaultMuted = true;
      el.playsInline = true;
      const play = () => {
        el.muted = true;
        if (el.paused) {
          el.play().then(() => onLoaded?.(true)).catch(() => {});
        } else {
          onLoaded?.(true);
        }
      };
      play();
      el.addEventListener("loadeddata", play);
      el.addEventListener("canplay", play);
      el.addEventListener("playing", play);
      return () => {
        el.removeEventListener("loadeddata", play);
        el.removeEventListener("canplay", play);
        el.removeEventListener("playing", play);
      };
    };
    const c1 = setup(listenRef.current, setListenLoaded);
    const c2 = setup(talkRef.current);
    return () => {
      c1?.();
      c2?.();
    };
  }, []);

  useEffect(() => {
    const v = isSpeaking ? talkRef.current : listenRef.current;
    if (v) {
      v.muted = true;
      if (v.paused) v.play().catch(() => {});
    }
  }, [isSpeaking]);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none bg-zinc-950">
      <img
        src="/Nesa.png"
        alt="Nesa"
        className={`absolute inset-0 w-full h-full object-cover object-center pointer-events-none transition-opacity duration-300 ${
          listenLoaded ? "opacity-0" : "opacity-100"
        }`}
      />
      <video
        ref={listenRef}
        src="/listening.mp4"
        autoPlay
        loop
        muted
        playsInline
        preload="auto"
        className={`transition-opacity duration-300 ease-in-out absolute inset-0 w-full h-full object-cover object-center pointer-events-none ${
          isSpeaking ? "opacity-0" : "opacity-100"
        }`}
      />
      <video
        ref={talkRef}
        src="/talk.mp4"
        autoPlay
        loop
        muted
        playsInline
        preload="auto"
        className={`transition-opacity duration-300 ease-in-out absolute inset-0 w-full h-full object-cover object-center pointer-events-none ${
          isSpeaking ? "opacity-100" : "opacity-0"
        }`}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-zinc-950/80 via-transparent to-zinc-950/90 pointer-events-none" />
      <div className="absolute inset-0 bg-zinc-950/25 pointer-events-none" />
    </div>
  );
}

export default NesaCallVideos;
