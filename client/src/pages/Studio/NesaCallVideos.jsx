export function NesaCallVideos({ isSpeaking }) {
  return (
    <>
      <video
        src="/nesa-idle.mp4"
        autoPlay
        loop
        muted
        playsInline
        preload="auto"
        className={`transition-opacity duration-[800ms] ease-in-out absolute inset-0 w-full h-full object-cover object-center pointer-events-none ${
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
        className={`transition-opacity duration-[800ms] ease-in-out absolute inset-0 w-full h-full object-cover object-center pointer-events-none ${
          isSpeaking ? "opacity-100" : "opacity-0"
        }`}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-zinc-950/80 via-transparent to-zinc-950/90 pointer-events-none" />
      <div className="absolute inset-0 bg-zinc-950/25 pointer-events-none" />
    </>
  );
}

export default NesaCallVideos;
