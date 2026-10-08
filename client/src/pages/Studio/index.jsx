import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ClockCounterClockwise, PhoneCall, Trash, DownloadSimple } from "@phosphor-icons/react";
import { useToast } from "@/context/ToastContext"; import { useNesaCallContext } from "@/context/NesaCallContext";
import { ChatSidebar } from "./ChatSidebar"; import { ChatCanvas } from "./ChatCanvas"; import { ChatInput } from "./ChatInput";
import { ModelSelector } from "./ModelSelector"; import { PersonaSelector } from "./PersonaSelector"; import { ArtifactPanel } from "./ArtifactPanel";
import { useChatSessions } from "./useChatSessions";
import { useStudioStream } from "./useStudioStream";
import { ConfirmModal } from "@/components/ui/ConfirmModal";

export function Studio() {
  const toast = useToast(), navigate = useNavigate(), location = useLocation();
  const { startCall, isCallActive } = useNesaCallContext();
  const [inputPrompt, setInputPrompt] = useState(""), [selectedModel, setSelectedModel] = useState(() => {
    const s = localStorage.getItem("selected_ai_model");
    return (s && s !== "gemini-3.8-flash" && s !== "gemini-3.7-flash") ? s : "gemini-3.6-flash";
  });
  const [activePersona, setActivePersona] = useState("general"), [isStreaming, setIsStreaming] = useState(false);
  const [streamingText, setStreamingText] = useState(""), [attachedImages, setAttachedImages] = useState([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false), [activeArtifact, setActiveArtifact] = useState(null), [isClearModalOpen, setIsClearModalOpen] = useState(false);

  const { sessions, setSessions, activeSessionId, setActiveSessionId, messages, setMessages, fetchSessions, createSession, deleteSession, renameSession, updateSessionPersona } = useChatSessions({ isStreaming });
  const activeSession = sessions.find((s) => s.id === activeSessionId);



  const [prevSessionId, setPrevSessionId] = useState(null);
  if (activeSessionId !== prevSessionId) {
    setPrevSessionId(activeSessionId);
    if (activeSession?.persona && activeSession.persona !== activePersona) {
      setActivePersona(activeSession.persona);
    }
  }

  const handleSelectPersona = (id) => { setActivePersona(id); if (activeSessionId) updateSessionPersona(activeSessionId, id); };

  const { handleSendMessage, handleRegenerate, abortControllerRef } = useStudioStream({
    selectedModel, activePersona, activeSessionId, sessions, setSessions, createSession, setMessages, setIsStreaming, setStreamingText, isStreaming, inputPrompt, setInputPrompt, attachedImages, setAttachedImages, fetchSessions, setActiveArtifact, location, navigate, toast
  });
  
  const handleDeleteSession = (sid) => { const tid = sid || activeSessionId; if (tid) deleteSession(tid); };
  const handleExportChat = () => { if (messages.length === 0) return; const txt = messages.map((m) => `${m.role.toUpperCase()}: ${m.text || ""}`).join("\\n\\n"), blob = new Blob([txt], { type: "text/plain" }), url = URL.createObjectURL(blob), a = document.createElement("a"); a.href = url; a.download = `${activeSession?.title || "chat"}.txt`; a.click(); URL.revokeObjectURL(url); toast.success("Chat exported successfully"); };
  const handleEditMessage = (id, text, att) => { setInputPrompt(text || ""); if (att) setAttachedImages(Array.isArray(att) ? att : [att]); setMessages((p) => { const idx = p.findIndex((m) => m.id === id); return idx === -1 ? p : p.slice(0, idx); }); };

  return (
    <div className="flex h-full w-full bg-surface-base text-text-primary overflow-hidden select-none pt-2 sm:pt-3">
      <ChatSidebar
        isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} sessions={sessions} activeSessionId={activeSessionId}
        onSelectSession={setActiveSessionId} onNewChat={() => createSession(activePersona)} onDeleteSession={handleDeleteSession} onRenameSession={renameSession}
      />
      <main className="flex-1 flex flex-col h-full min-w-0 relative bg-surface/20 overflow-hidden">
        <div className="h-12 border-b border-border px-4 flex items-center justify-between bg-surface-card/60 backdrop-blur shrink-0">
          <div className="flex items-center gap-2.5 truncate pr-2">
            {!isSidebarOpen && (
              <button
                type="button" data-nesa-target="chat_history_btn" onClick={() => setIsSidebarOpen(true)} title="Show History" aria-label="Open chat history"
                className="flex items-center gap-1.5 px-2 sm:px-2.5 py-1.5 rounded-[var(--radius-sm)] border border-border bg-surface text-text-muted hover:text-text-primary hover:border-accent text-xs font-semibold transition-colors cursor-pointer shrink-0"
              >
                <ClockCounterClockwise size={14} weight="bold" /><span className="hidden sm:inline">History</span>
              </button>
            )}
            <span className={`font-semibold text-xs text-text-primary truncate ${!isSidebarOpen ? "border-l border-border pl-2.5" : ""}`}>{activeSession?.title || "New Chat"}</span>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <button type="button" data-nesa-target="clear_chat_btn" onClick={() => setIsClearModalOpen(true)} disabled={!activeSessionId || messages.length === 0} className="p-1.5 rounded-lg border border-border bg-surface hover:bg-surface-elevated text-text-muted hover:text-rose-400 text-xs transition-colors cursor-pointer disabled:opacity-40 shrink-0 flex items-center gap-1" title="Clear Conversation" aria-label="Clear Conversation"><Trash size={14} /><span className="hidden xl:inline">Clear</span></button>
            <button type="button" data-nesa-target="export_chat_btn" onClick={handleExportChat} disabled={messages.length === 0} className="p-1.5 rounded-lg border border-border bg-surface hover:bg-surface-elevated text-text-muted hover:text-text-primary text-xs transition-colors cursor-pointer disabled:opacity-40 shrink-0 flex items-center gap-1" title="Export Conversation" aria-label="Export Conversation"><DownloadSimple size={14} /><span className="hidden xl:inline">Export</span></button>
            <button
              type="button" onClick={startCall} disabled={isStreaming || isCallActive} title="Call Nesa" aria-label="Call Nesa"
              className="flex items-center justify-center h-8 w-8 sm:w-auto sm:h-auto gap-1.5 px-2 py-1.5 sm:px-2.5 rounded-lg border border-accent/40 bg-accent/10 hover:bg-accent/20 text-accent text-xs font-medium transition-colors cursor-pointer disabled:opacity-50 shrink-0"
            >
              <PhoneCall size={14} weight="fill" /><span className="hidden md:inline">Call Nesa</span>
            </button>
            <PersonaSelector selectedPersona={activePersona} onSelectPersona={handleSelectPersona} disabled={isStreaming} />
            <ModelSelector selectedModel={selectedModel} onSelectModel={(id) => { setSelectedModel(id); localStorage.setItem("selected_ai_model", id); }} />
          </div>
        </div>

        <div className="flex-1 flex min-w-0 h-full overflow-hidden relative">
          <div className={`flex flex-col min-w-0 h-full transition-all duration-200 ${activeArtifact ? "hidden lg:flex lg:w-1/2 border-r border-border" : "flex-1"}`}>
            <ChatCanvas
              messages={messages} activeSession={activeSession} activePersona={activePersona}
              isStreaming={isStreaming} streamingText={streamingText} onEdit={handleEditMessage} onRegenerate={handleRegenerate}
              onSendSuggested={(s) => handleSendMessage(s)} onOpenArtifact={setActiveArtifact}
              onSelectChoice={(c) => !isStreaming && handleSendMessage(c)} isSidebarOpen={isSidebarOpen}
            />
            <ChatInput
              inputPrompt={inputPrompt} setInputPrompt={setInputPrompt} onSubmit={(p) => handleSendMessage(p)}
              isStreaming={isStreaming} onStop={() => { abortControllerRef.current?.abort(); setIsStreaming(false); }}
              selectedModel={selectedModel} attachedImages={attachedImages} setAttachedImages={setAttachedImages}
            />
          </div>
          {activeArtifact && <ArtifactPanel key={activeArtifact.id || activeArtifact.url || "active-artifact"} artifact={activeArtifact} onClose={() => setActiveArtifact(null)} />}
        </div>
      </main>
      <ConfirmModal
        isOpen={isClearModalOpen}
        onClose={() => setIsClearModalOpen(false)}
        onConfirm={() => {
          setIsClearModalOpen(false);
          if (activeSessionId) handleDeleteSession(activeSessionId);
        }}
        title="Clear Conversation"
        description="Are you sure you want to clear this conversation? All messages in this session will be permanently deleted."
        confirmText="Clear"
        isDestructive={true}
      />
    </div>
  );
}
export default Studio;
