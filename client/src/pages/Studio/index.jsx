import { useState, useRef, useEffect } from "react";
import { ClockCounterClockwise } from "@phosphor-icons/react";
import { ChatSidebar } from "./ChatSidebar";
import { ChatCanvas } from "./ChatCanvas";
import { ChatInput } from "./ChatInput";
import { ModelSelector } from "./ModelSelector";
import { useChatSessions } from "./useChatSessions";
import { streamCompletion } from "@/utils/aiStream";
import { useToast } from "@/context/ToastContext";
import { VITE_API_URL } from "@/config/env";

export function Studio() {
  const toast = useToast();
  const [inputPrompt, setInputPrompt] = useState("");
  const [attachedImage, setAttachedImage] = useState(null);
  const [selectedModel, setSelectedModel] = useState("gemini-3.7-flash");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const abortControllerRef = useRef(null);

  const {
    sessions,
    setSessions,
    activeSessionId,
    setActiveSessionId,
    messages,
    setMessages,
    isLoading,
    fetchSessions,
    createSession,
    deleteSession,
    renameSession
  } = useChatSessions();

  const token = localStorage.getItem("token");

  useEffect(() => {
    const parent = document.querySelector("main.flex-1");
    if (!parent) return;
    const prev = parent.style.overflow;
    parent.style.overflow = "hidden";
    return () => { parent.style.overflow = prev; };
  }, []);

  const runStream = async (targetSessionId, promptText, imageBase64, isRegenerate = false) => {
    setIsStreaming(true);
    setStreamingText("");
    const controller = new AbortController();
    abortControllerRef.current = controller;
    let accumulated = "";

    await streamCompletion({
      sessionId: targetSessionId,
      prompt: promptText,
      model: selectedModel,
      imageBase64,
      isRegenerate,
      signal: controller.signal,
      onChunk: (c) => { accumulated += c; setStreamingText((p) => p + c); },
      onComplete: () => {
        setIsStreaming(false);
        setStreamingText("");
        setMessages((p) => [...p, { id: "ai-" + Date.now(), role: "model", text: accumulated, createdAt: new Date().toISOString() }]);
        fetchSessions();
      },
      onError: (err) => { setIsStreaming(false); setStreamingText(""); toast.error(err.message || "Streaming interrupted"); }
    });
  };

  const handleSendMessage = async (promptToSend, imageToSend) => {
    const textToSend = promptToSend || inputPrompt;
    const imageToUpload = imageToSend !== undefined ? imageToSend : attachedImage;
    if ((!textToSend.trim() && !imageToUpload) || isStreaming) return;

    let targetSessionId = activeSessionId;
    if (!targetSessionId) targetSessionId = await createSession();
    if (!targetSessionId) return;

    const promptText = textToSend.trim() || (imageToUpload ? "Analyze attached image" : "");
    const userMsg = { id: "usr-" + Date.now(), role: "user", text: promptText, attachment: imageToUpload || null, createdAt: new Date().toISOString() };
    setMessages((prev) => [...prev, userMsg]);
    setInputPrompt("");
    setAttachedImage(null);

    const currSess = sessions.find((s) => s.id === targetSessionId);
    if (!currSess || currSess.title === "New Chat") {
      const words = promptText.split(/\s+/).slice(0, 4).join(" ");
      const autoTitle = words ? words.charAt(0).toUpperCase() + words.slice(1) : "Image Chat";
      setSessions((prev) => prev.map((s) => (s.id === targetSessionId ? { ...s, title: autoTitle } : s)));
    }

    await runStream(targetSessionId, promptText, imageToUpload, false);
  };

  const handleRegenerate = async () => {
    if (isStreaming || !activeSessionId) return;
    setMessages((prev) => (prev[prev.length - 1]?.role === "model" ? prev.slice(0, -1) : prev));
    await runStream(activeSessionId, "", null, true);
  };

  const handleEditMessage = async (messageId, newText) => {
    if (!token || !activeSessionId) return;
    try {
      const res = await fetch(`${VITE_API_URL}/ai/messages/${messageId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ text: newText })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setMessages((p) => p.slice(0, p.findIndex((m) => m.id === messageId) + 1).map((m) => (m.id === messageId ? { ...m, text: newText } : m)));
        await runStream(activeSessionId, "", null, true);
      }
    } catch { toast.error("Failed to edit message"); }
  };

  const handleStop = () => {
    if (abortControllerRef.current) abortControllerRef.current.abort();
    abortControllerRef.current = null;
    setIsStreaming(false);
  };

  const activeSession = sessions.find((s) => s.id === activeSessionId);

  return (
    <div className="flex h-[calc(100%+3rem)] w-[calc(100%+3rem)] -m-6 overflow-hidden bg-background relative border-t border-border/60">
      <ChatSidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        sessions={sessions}
        activeSessionId={activeSessionId}
        onSelectSession={setActiveSessionId}
        onNewChat={createSession}
        onDeleteSession={deleteSession}
        onRenameSession={renameSession}
        isLoading={isLoading}
      />

      <main className="flex-1 flex flex-col h-full min-w-0 relative bg-surface/20 overflow-hidden">
        <div className="h-12 border-b border-border px-4 flex items-center justify-between bg-surface-card/60 backdrop-blur shrink-0">
          <div className="flex items-center gap-2.5 truncate pr-2">
            {!isSidebarOpen && (
              <button
                type="button"
                onClick={() => setIsSidebarOpen(true)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-[var(--radius-sm)] border border-border bg-surface text-text-muted hover:text-text-primary hover:border-accent text-xs font-semibold transition-colors cursor-pointer shrink-0"
                title="Show History"
                aria-label="Open chat history"
              >
                <ClockCounterClockwise size={14} weight="bold" />
                <span>History</span>
              </button>
            )}
            <span className={`font-semibold text-xs text-text-primary truncate ${!isSidebarOpen ? "border-l border-border pl-2.5" : ""}`}>
              {activeSession?.title || "New Chat"}
            </span>
          </div>
          <ModelSelector selectedModel={selectedModel} onSelectModel={setSelectedModel} />
        </div>

        <ChatCanvas
          messages={messages}
          activeSession={activeSession}
          isStreaming={isStreaming}
          streamingText={streamingText}
          onEdit={handleEditMessage}
          onRegenerate={handleRegenerate}
          onSendSuggested={(suggested) => handleSendMessage(suggested)}
        />

        <ChatInput
          inputPrompt={inputPrompt}
          setInputPrompt={setInputPrompt}
          onSubmit={() => handleSendMessage()}
          isStreaming={isStreaming}
          onStop={handleStop}
          selectedModel={selectedModel}
          attachedImage={attachedImage}
          setAttachedImage={setAttachedImage}
        />
      </main>
    </div>
  );
}

export default Studio;
