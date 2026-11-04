import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { PhoneCall, Trash, DownloadSimple, SidebarSimple, Plus } from "@phosphor-icons/react";
import { useToast } from "@/context/ToastContext";
import { useNesaCallContext } from "@/context/NesaCallContext";
import { ChatSidebar } from "./ChatSidebar";
import { ChatCanvas } from "./ChatCanvas";
import { ChatInput } from "./ChatInput";
import { ModelSelector } from "./ModelSelector";
import { PersonaSelector } from "./PersonaSelector";
import { ArtifactPanel } from "./ArtifactPanel";
import { useChatSessions } from "./useChatSessions";
import { useStudioStream } from "./useStudioStream";
import { ConfirmModal } from "@/components/ui/ConfirmModal";

export function Studio() {
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const { startCall, isCallActive } = useNesaCallContext();

  const [inputPrompt, setInputPrompt] = useState("");
  const [selectedModel, setSelectedModel] = useState(() => {
    const s = localStorage.getItem("selected_ai_model");
    return s || "gemini-3.6-flash";
  });
  const [activePersona, setActivePersona] = useState("general");
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const [attachedImages, setAttachedImages] = useState([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [activeArtifact, setActiveArtifact] = useState(null);
  const [isClearModalOpen, setIsClearModalOpen] = useState(false);

  const {
    sessions,
    setSessions,
    activeSessionId,
    setActiveSessionId,
    messages,
    setMessages,
    fetchSessions,
    createSession,
    deleteSession,
    renameSession,
    updateSessionPersona
  } = useChatSessions({ isStreaming });

  const activeSession = sessions.find((s) => s.id === activeSessionId);

  const handleSelectSession = (sid) => {
    setActiveSessionId(sid);
    const targetSession = sessions.find((s) => s.id === sid);
    if (targetSession?.persona) {
      setActivePersona(targetSession.persona);
    }
  };

  const handleSelectPersona = (id) => {
    setActivePersona(id);
    if (activeSessionId) updateSessionPersona(activeSessionId, id);
  };

  const handleSelectModel = (id) => {
    setSelectedModel(id);
    try {
      localStorage.setItem("selected_ai_model", id);
    } catch {
      void 0;
    }
  };

  const { handleSendMessage, handleRegenerate, abortControllerRef } = useStudioStream({
    selectedModel,
    activePersona,
    activeSessionId,
    sessions,
    setSessions,
    createSession,
    setMessages,
    setIsStreaming,
    setStreamingText,
    isStreaming,
    inputPrompt,
    setInputPrompt,
    attachedImages,
    setAttachedImages,
    fetchSessions,
    setActiveArtifact,
    location,
    navigate,
    toast
  });

  const handleDeleteSession = (sid) => {
    const tid = sid || activeSessionId;
    if (tid) deleteSession(tid);
  };

  const handleExportChat = () => {
    if (messages.length === 0) return;
    const txt = messages.map((m) => `${m.role.toUpperCase()}: ${m.text || ""}`).join("\n\n");
    const blob = new Blob([txt], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${activeSession?.title || "chat"}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Chat exported successfully");
  };

  const handleEditMessage = (id, text, att) => {
    setInputPrompt(text || "");
    if (att) setAttachedImages(Array.isArray(att) ? att : [att]);
    setMessages((p) => {
      const idx = p.findIndex((m) => m.id === id);
      return idx === -1 ? p : p.slice(0, idx);
    });
  };

  return (
    <div className="flex h-full w-full bg-surface-base text-text-primary overflow-hidden select-none">
      <ChatSidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        sessions={sessions}
        activeSessionId={activeSessionId}
        onSelectSession={handleSelectSession}
        onNewChat={() => createSession(activePersona)}
        onDeleteSession={handleDeleteSession}
        onRenameSession={renameSession}
      />

      <main className="flex-1 flex flex-col h-full min-w-0 relative bg-surface-base dark:bg-[#212121] overflow-hidden">
        <div className="h-13 border-b border-border/80 dark:border-white/10 px-3 sm:px-4 flex items-center justify-between bg-surface-card/60 dark:bg-zinc-950/40 backdrop-blur-md shrink-0 z-10">
          <div className="flex items-center gap-2 truncate pr-2">
            {!isSidebarOpen && (
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  data-nesa-target="chat_history_btn"
                  onClick={() => setIsSidebarOpen(true)}
                  title="Open History"
                  aria-label="Open chat history"
                  className="p-2 rounded-xl border border-border/70 hover:border-accent/40 bg-surface hover:bg-surface-elevated text-text-muted hover:text-text-primary transition-colors cursor-pointer shrink-0"
                >
                  <SidebarSimple size={16} />
                </button>
                <button
                  type="button"
                  data-nesa-target="new_chat_btn"
                  onClick={() => createSession(activePersona)}
                  title="New Chat"
                  aria-label="New Chat"
                  className="p-2 rounded-xl border border-border/70 hover:border-accent/40 bg-surface hover:bg-surface-elevated text-text-muted hover:text-text-primary transition-colors cursor-pointer shrink-0"
                >
                  <Plus size={16} weight="bold" />
                </button>
              </div>
            )}

            <div className="flex items-center gap-2 min-w-0 truncate">
              <span className="font-semibold text-xs sm:text-sm text-text-primary truncate">
                {activeSession?.title || "New Chat"}
              </span>
            </div>
          </div>

          <div className="hidden sm:flex items-center justify-center shrink-0">
            <ModelSelector
              selectedModel={selectedModel}
              onSelectModel={handleSelectModel}
            />
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <button
              type="button"
              data-nesa-target="call_nisa_btn"
              onClick={startCall}
              disabled={isStreaming || isCallActive}
              title="Call Nisa (3D Avatar & Voice Companion)"
              aria-label="Call Nisa"
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border border-accent/40 bg-accent/10 hover:bg-accent/20 text-accent text-xs font-semibold transition-all cursor-pointer disabled:opacity-50 shrink-0 shadow-xs"
            >
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <PhoneCall size={14} weight="fill" />
              <span className="hidden md:inline">Call Nisa</span>
            </button>

            <div className="hidden lg:block">
              <PersonaSelector
                selectedPersona={activePersona}
                onSelectPersona={handleSelectPersona}
                disabled={isStreaming}
              />
            </div>

            <button
              type="button"
              data-nesa-target="clear_chat_btn"
              onClick={() => setIsClearModalOpen(true)}
              disabled={!activeSessionId || messages.length === 0}
              className="p-2 rounded-xl border border-border/70 hover:border-border bg-surface hover:bg-surface-elevated text-text-muted hover:text-rose-400 text-xs transition-colors cursor-pointer disabled:opacity-30 shrink-0"
              title="Clear Conversation"
              aria-label="Clear Conversation"
            >
              <Trash size={15} />
            </button>

            <button
              type="button"
              data-nesa-target="export_chat_btn"
              onClick={handleExportChat}
              disabled={messages.length === 0}
              className="p-2 rounded-xl border border-border/70 hover:border-border bg-surface hover:bg-surface-elevated text-text-muted hover:text-text-primary text-xs transition-colors cursor-pointer disabled:opacity-30 shrink-0"
              title="Export Conversation"
              aria-label="Export Conversation"
            >
              <DownloadSimple size={15} />
            </button>
          </div>
        </div>

        <div className="flex-1 flex min-w-0 h-full overflow-hidden relative">
          <div
            className={`flex flex-col min-w-0 h-full transition-all duration-200 ${
              activeArtifact ? "hidden lg:flex lg:w-1/2 border-r border-border" : "flex-1"
            }`}
          >
            <ChatCanvas
              messages={messages}
              activeSession={activeSession}
              activePersona={activePersona}
              isStreaming={isStreaming}
              streamingText={streamingText}
              onEdit={handleEditMessage}
              onRegenerate={handleRegenerate}
              onSendSuggested={(s) => handleSendMessage(s)}
              onOpenArtifact={setActiveArtifact}
              onSelectChoice={(c) => !isStreaming && handleSendMessage(c)}
              isSidebarOpen={isSidebarOpen}
              selectedModel={selectedModel}
            />

            <ChatInput
              inputPrompt={inputPrompt}
              setInputPrompt={setInputPrompt}
              onSubmit={(p) => handleSendMessage(p)}
              isStreaming={isStreaming}
              onStop={() => {
                abortControllerRef.current?.abort();
                setIsStreaming(false);
              }}
              selectedModel={selectedModel}
              onSelectModel={handleSelectModel}
              activePersona={activePersona}
              onSelectPersona={handleSelectPersona}
              attachedImages={attachedImages}
              setAttachedImages={setAttachedImages}
            />
          </div>

          {activeArtifact && (
            <ArtifactPanel
              key={activeArtifact.id || activeArtifact.url || "active-artifact"}
              artifact={activeArtifact}
              onClose={() => setActiveArtifact(null)}
            />
          )}
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
        isDanger={true}
      />
    </div>
  );
}

export default Studio;
