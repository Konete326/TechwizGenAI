import { useGeminiLive } from "../../pages/Studio/useGeminiLive.js";

export default function GeminiLiveStudio({ userToken: _userToken }) {
  const { isConnected, connectionError, connect, disconnect } = useGeminiLive();

  return (
    <div className="flex flex-col items-center justify-center p-8 bg-zinc-950 text-zinc-100 rounded-2xl shadow-2xl max-w-md mx-auto space-y-6 border border-zinc-800">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
          Gemini Live Studio
        </h2>
        <p className="text-zinc-400 text-sm">Realtime Voice Session</p>
      </div>

      {connectionError && (
        <div className="w-full bg-red-950/40 border border-red-500/50 text-red-200 p-3 rounded-lg text-sm flex items-start gap-2">
          <span>⚠️</span>
          <p>{connectionError}</p>
        </div>
      )}

      <div className="flex items-center space-x-4">
        {isConnected ? (
          <button
            onClick={disconnect}
            className="px-8 py-3 bg-red-600 hover:bg-red-500 transition-colors rounded-full font-medium shadow-lg shadow-red-600/20"
          >
            End Session
          </button>
        ) : (
          <button
            onClick={connect}
            className="px-8 py-3 bg-indigo-600 hover:bg-indigo-500 transition-colors rounded-full font-medium shadow-lg shadow-indigo-600/20"
          >
            Start Session
          </button>
        )}
      </div>

      <div className="flex items-center space-x-2 text-sm text-zinc-500 bg-zinc-900 px-4 py-1.5 rounded-full border border-zinc-800">
        <div className={`w-2 h-2 rounded-full ${isConnected ? "bg-green-500 animate-pulse" : "bg-zinc-600"}`} />
        <span>{isConnected ? "connected" : "idle"}</span>
      </div>
    </div>
  );
}
