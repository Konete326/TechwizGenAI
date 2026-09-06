import { useEffect, useRef } from "react";

export function NesaCallVideos({ isSpeaking }) {
  const listenRef = useRef(null);
  const talkRef = useRef(null);

  useEffect(() => {
    const playSafe = (video) => {
      if (video && video.paused) {
        video.play().catch(() => {});
      }
    };
    playSafe(listenRef.current);
    playSafe(talkRef.current);
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none bg-zinc-950">
      <img
        src="/Nesa.png"
        alt="Nesa"
        className="absolute inset-0 w-full h-full object-cover object-center pointer-events-none"
      />
      <video
        ref={listenRef}
        src="/listening.mp4"
        poster="/Nesa.png"
        autoPlay
        loop
        muted
        playsInline
        preload="auto"
        onCanPlay={(e) => {
          if (e.currentTarget.paused) {
            e.currentTarget.play().catch(() => {});
          }
        }}
        className={`transition-opacity duration-300 ease-in-out absolute inset-0 w-full h-full object-cover object-center pointer-events-none ${
          isSpeaking ? "opacity-0" : "opacity-100"
        }`}
      />
      <video
        ref={talkRef}
        src="/talk.mp4"
        poster="/Nesa.png"
        autoPlay
        loop
        muted
        playsInline
        preload="auto"
        onCanPlay={(e) => {
          if (e.currentTarget.paused) {
            e.currentTarget.play().catch(() => {});
          }
        }}
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
