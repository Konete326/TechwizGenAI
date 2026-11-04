export function CharacterRendererStatus({ loadState, onFallbackToVoice }) {
  if (loadState.status === "loading") {
    return (
      <div className="pointer-events-none absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-zinc-950/90">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-zinc-700 border-t-accent" />
        <span className="text-xs font-mono text-zinc-400">
          Loading {loadState.characterName}
          {loadState.progress > 0 ? ` ${loadState.progress}%` : "…"}
        </span>
      </div>
    );
  }

  if (loadState.status === "webgl_unavailable" || loadState.status === "context_lost") {
    return (
      <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-3 bg-zinc-950/95 p-6 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full border border-amber-500/30 bg-amber-500/10 text-xl font-bold text-amber-400">⚡</div>
        <span className="text-sm font-semibold text-zinc-200">
          {loadState.status === "context_lost" ? "3D Graphics Reset" : "Voice-Only Mode Recommended"}
        </span>
        <span className="max-w-[280px] text-xs leading-relaxed text-zinc-400">
          {loadState.error || "3D hardware acceleration is currently restricted on this device."}
        </span>
        <div className="mt-2 flex items-center gap-2">
          {onFallbackToVoice && (
            <button type="button" onClick={onFallbackToVoice} className="rounded-lg bg-accent px-3.5 py-1.5 text-xs font-medium text-zinc-950 shadow transition-colors hover:bg-accent/90">
              Switch to Voice Mode
            </button>
          )}
          <button type="button" onClick={() => window.location.reload()} className="rounded-lg border border-zinc-700 bg-zinc-800 px-3.5 py-1.5 text-xs font-medium text-zinc-300 transition-colors hover:bg-zinc-700">
            Retry 3D
          </button>
        </div>
      </div>
    );
  }

  if (loadState.status === "error") {
    return (
      <div className="pointer-events-none absolute inset-0 z-20 flex flex-col items-center justify-center gap-2 bg-zinc-950/90 p-4">
        <span className="text-xs font-semibold text-rose-400">⚠ Avatar Load Failed</span>
        <span className="max-w-[240px] break-words text-center text-[10px] leading-relaxed text-zinc-500">
          {loadState.error}
        </span>
      </div>
    );
  }

  return null;
}

export default CharacterRendererStatus;
