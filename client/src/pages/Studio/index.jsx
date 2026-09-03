import { useState, useRef, useEffect } from "react";
import { ClockCounterClockwise } from "@phosphor-icons/react";
import { useToast } from "@/context/ToastContext";
import { streamCompletion, getFriendlyErrorMessage } from "@/utils/aiStream";
import { ChatSidebar } from "./ChatSidebar";
import { ChatCanvas } from "./ChatCanvas";
import { ChatInput } from "./ChatInput";
import { ModelSelector } from "./ModelSelector";
import { PersonaSelector } from "./PersonaSelector";
import { ArtifactPanel } from "./ArtifactPanel";
import { useChatSessions } from "./useChatSessions";

export function Studio() {
  const toast = useToast();
  const [inputPrompt, setInputPrompt] = useState("");
  const [selectedModel, setSelectedModel] = useState(() => localStorage.getItem("selected_ai_model") || "gemini-3.7-flash");
  const [activePersona, setActivePersona] = useState("general");
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const [attachedImage, setAttachedImage] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeArtifact, setActiveArtifact] = useState(null);
  const abortControllerRef = useRef(null);

  const {
    sessions, setSessions, activeSessionId, setActiveSessionId,
    messages, setMessages, isLoading, fetchSessions,
    createSession, deleteSession, renameSession, updateSessionPersona
  } = useChatSessions();

  const activeSession = sessions.find((s) => s.id === activeSessionId);

  useEffect(() => {
    if (activeSession?.persona) setActivePersona(activeSession.persona);
  }, [activeSession?.persona, activeSessionId]);

  useEffect(() => {
    const parent = document.querySelector("main.flex-1");
    if (!parent) return;
    const prev = parent.style.overflow;
    parent.style.overflow = "hidden";
    return () => { parent.style.overflow = prev; };
  }, []);

  const handleSelectPersona = (personaId) => {
    setActivePersona(personaId);
    if (activeSessionId) updateSessionPersona(activeSessionId, personaId);
  };

  const runStream = async (targetSessionId, promptText, imageBase64, isRegenerate = false, docPayload = {}) => {
    setIsStreaming(true);
    setStreamingText("");
    const controller = new AbortController();
    abortControllerRef.current = controller;
    let accumulated = "";

    await streamCompletion({
      sessionId: targetSessionId, prompt: promptText, model: selectedModel, imageBase64,
      attachmentType: docPayload.attachmentType || (imageBase64 ? "image" : "none"),
      attachmentName: docPayload.attachmentName || null,
      attachmentData: docPayload.attachmentData || null,
      persona: activePersona,
      isRegenerate, signal: controller.signal,
      onChunk: (c) => { accumulated += c; setStreamingText((p) => p + c); },
      onComplete: () => {
        setIsStreaming(false); setStreamingText("");
        setMessages((p) => [...p, { id: "ai-" + Date.now(), role: "model", text: accumulated, createdAt: new Date().toISOString() }]);
        fetchSessions();
      },
      onError: (err) => { setIsStreaming(false); setStreamingText(""); toast.error(getFriendlyErrorMessage(err)); }
    });
  };

  const handleSendMessage = async (payloadOrText, imageToSend) => {
    let textToSend = inputPrompt;
    let imageToUpload = imageToSend !== undefined ? imageToSend : attachedImage;
    let docPayload = {};

    if (payloadOrText && typeof payloadOrText === "object") {
      textToSend = payloadOrText.text !== undefined ? payloadOrText.text : inputPrompt;
      if (payloadOrText.attachmentType === "document") {
        docPayload = { attachmentType: "document", attachmentName: payloadOrText.attachmentName, attachmentData: payloadOrText.attachmentData };
        imageToUpload = null;
      } else if (payloadOrText.attachmentType === "image") imageToUpload = payloadOrText.attachmentData;
    } else if (typeof payloadOrText === "string") textToSend = payloadOrText;

    if ((!textToSend.trim() && !imageToUpload && !docPayload.attachmentData) || isStreaming) return;
    let targetSessionId = activeSessionId;
    if (!targetSessionId) targetSessionId = await createSession(activePersona);
    if (!targetSessionId) return;

    const fallbackDoc = docPayload.attachmentName ? `Analyze ${docPayload.attachmentName}` : "Analyze attachment";
    const promptText = textToSend.trim() || (docPayload.attachmentData ? fallbackDoc : (imageToUpload ? "Analyze attached image" : ""));
    const userMsg = {
      id: "usr-" + Date.now(), role: "user", text: promptText,
      attachment: docPayload.attachmentData || imageToUpload || null,
      attachmentType: docPayload.attachmentType || (imageToUpload ? "image" : "none"),
      attachmentName: docPayload.attachmentName || null, createdAt: new Date().toISOString()
    };
    setMessages((prev) => [...prev, userMsg]);
    setInputPrompt(""); setAttachedImage(null);

    const currSess = sessions.find((s) => s.id === targetSessionId);
    if (!currSess || currSess.title === "New Chat") {
      const words = promptText.split(/\s+/).slice(0, 4).join(" ");
      const autoTitle = words ? words.charAt(0).toUpperCase() + words.slice(1) : "Document Chat";
      setSessions((prev) => prev.map((s) => (s.id === targetSessionId ? { ...s, title: autoTitle } : s)));
    }

    await runStream(targetSessionId, promptText, imageToUpload, false, docPayload);
  };

  const handleRegenerate = async () => {
    if (isStreaming || !activeSessionId) return;
    setMessages((prev) => (prev[prev.length - 1]?.role === "model" ? prev.slice(0, -1) : prev));
    await runStream(activeSessionId, "", null, true);
  };

  const handleEditMessage = (messageId, text, attachment) => {
    setInputPrompt(text || "");
    if (attachment) setAttachedImage(attachment);
    setMessages((prev) => {
      const idx = prev.findIndex((m) => m.id === messageId);
      return idx === -1 ? prev : prev.slice(0, idx);
    });
  };

  const handleChoiceSelect = (choiceText) => {
    if (!isStreaming) handleSendMessage(choiceText);
  };

  return (
    <div className="flex h-screen w-full bg-surface-base text-text-primary overflow-hidden select-none">
      <ChatSidebar
        isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)}
        sessions={sessions} activeSessionId={activeSessionId}
        onSelectSession={setActiveSessionId} onNewChat={() => createSession(activePersona)}
        onDeleteSession={deleteSession} onRenameSession={renameSession}
      />

      <main className="flex-1 flex flex-col h-full min-w-0 relative bg-surface/20 overflow-hidden">
        <div className="h-12 border-b border-border px-4 flex items-center justify-between bg-surface-card/60 backdrop-blur shrink-0">
          <div className="flex items-center gap-2.5 truncate pr-2">
            {!isSidebarOpen && (
              <button
                type="button" onClick={() => setIsSidebarOpen(true)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-[var(--radius-sm)] border border-border bg-surface text-text-muted hover:text-text-primary hover:border-accent text-xs font-semibold transition-colors cursor-pointer shrink-0"
                title="Show History" aria-label="Open chat history"
              >
                <ClockCounterClockwise size={14} weight="bold" />
                <span>History</span>
              </button>
            )}
            <span className={`font-semibold text-xs text-text-primary truncate ${!isSidebarOpen ? "border-l border-border pl-2.5" : ""}`}>
              {activeSession?.title || "New Chat"}
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <PersonaSelector selectedPersona={activePersona} onSelectPersona={handleSelectPersona} disabled={isStreaming} />
            <ModelSelector selectedModel={selectedModel} onSelectModel={(id) => { setSelectedModel(id); localStorage.setItem("selected_ai_model", id); }} />
          </div>
        </div>

        <div className="flex-1 flex min-w-0 h-full overflow-hidden relative">
          <div className={`flex flex-col min-w-0 h-full transition-all duration-200 ${activeArtifact ? "w-full lg:w-1/2 border-r border-border" : "flex-1"}`}>
            <ChatCanvas
              messages={messages} activeSession={activeSession} activePersona={activePersona}
              isStreaming={isStreaming} streamingText={streamingText}
              onEdit={handleEditMessage} onRegenerate={handleRegenerate}
              onSendSuggested={(suggested) => handleSendMessage(suggested)}
              onOpenArtifact={setActiveArtifact}
              onSelectChoice={handleChoiceSelect}
            />
            <ChatInput
              inputPrompt={inputPrompt} setInputPrompt={setInputPrompt}
              onSubmit={(payload) => handleSendMessage(payload)} isStreaming={isStreaming}
              onStop={() => { abortControllerRef.current?.abort(); setIsStreaming(false); }} selectedModel={selectedModel}
              attachedImage={attachedImage} setAttachedImage={setAttachedImage}
            />
          </div>

          {activeArtifact && (
            <ArtifactPanel artifact={activeArtifact} onClose={() => setActiveArtifact(null)} />
          )}
        </div>
      </main>
    </div>
  );
}

export default Studio;
