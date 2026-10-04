import { useGeminiLive } from "../../hooks/useGeminiLive.js";
import { Loader2, FileText, Download } from "lucide-react";

export default function GeminiLiveStudio({ userToken }) {
  const { status, errorMsg, isExecutingTool, assets, startSession, stopSession } = useGeminiLive(userToken);

  return (
    <div className="flex flex-col items-center justify-center p-8 bg-zinc-950 text-zinc-100 rounded-2xl shadow-2xl max-w-md mx-auto space-y-6 border border-zinc-800">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
          Gemini Live Studio
        </h2>
        <p className="text-zinc-400 text-sm">Direct Client-to-Server Realtime Audio</p>
      </div>

      {errorMsg && (
        <div className="w-full bg-red-950/40 border border-red-500/50 text-red-200 p-3 rounded-lg text-sm flex items-start">
          <span className="mr-2">⚠️</span>
          <p>{errorMsg}</p>
        </div>
      )}

      {isExecutingTool && (
        <div className="flex items-center space-x-3 bg-indigo-950/30 border border-indigo-500/30 text-indigo-300 px-4 py-3 rounded-xl text-sm animate-pulse w-full justify-center shadow-inner">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="font-medium">Nisha is generating a document...</span>
        </div>
      )}

      <div className="flex items-center space-x-4">
        {status === "idle" || status === "error" ? (
          <button
            onClick={startSession}
            className="px-8 py-3 bg-indigo-600 hover:bg-indigo-500 transition-colors rounded-full font-medium shadow-lg shadow-indigo-600/20"
          >
            Start Session
          </button>
        ) : status === "connecting" ? (
          <button disabled className="px-8 py-3 bg-zinc-800 text-zinc-500 rounded-full font-medium cursor-not-allowed">
            Connecting...
          </button>
        ) : status === "reconnecting" ? (
          <button disabled className="px-8 py-3 bg-zinc-800 text-yellow-500/80 border border-yellow-500/30 rounded-full font-medium cursor-not-allowed flex items-center space-x-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Reconnecting...</span>
          </button>
        ) : (
          <button
            onClick={stopSession}
            className="px-8 py-3 bg-red-600 hover:bg-red-500 transition-colors rounded-full font-medium shadow-lg shadow-red-600/20"
          >
            End Session
          </button>
        )}
      </div>

      <div className="flex items-center space-x-2 text-sm text-zinc-500 bg-zinc-900 px-4 py-1.5 rounded-full border border-zinc-800">
        <div className={`w-2 h-2 rounded-full ${status === "connected" ? "bg-green-500 animate-pulse" : status === "connecting" || status === "reconnecting" ? "bg-yellow-500 animate-pulse" : "bg-zinc-600"}`} />
        <span className="capitalize">{status}</span>
      </div>

      {assets?.length > 0 && (
        <div className="w-full space-y-3 mt-4 animate-in fade-in slide-in-from-bottom-2">
          <h3 className="text-zinc-400 text-xs font-semibold uppercase tracking-wider text-left">Live Deliverables</h3>
          <div className="flex flex-col gap-2 max-h-48 overflow-y-auto pr-1">
            {assets.map(asset => (
              <a
                key={asset.id}
                href={asset.url}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-between p-3 bg-zinc-900 hover:bg-zinc-800/80 transition-all border border-zinc-800 hover:border-indigo-500/50 rounded-xl group"
              >
                <div className="flex items-center space-x-3 overflow-hidden">
                  <div className="w-8 h-8 shrink-0 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div className="flex flex-col text-left overflow-hidden">
                    <span className="text-sm font-medium text-zinc-200 group-hover:text-indigo-300 transition-colors truncate">{asset.title}</span>
                    <span className="text-xs text-zinc-500 uppercase">{asset.type}</span>
                  </div>
                </div>
                <Download className="w-4 h-4 shrink-0 text-zinc-600 group-hover:text-indigo-400 transition-colors ml-3" />
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
