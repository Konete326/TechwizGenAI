import { useState, useRef, useEffect } from "react";
import { ClockCounterClockwise, PhoneCall } from "@phosphor-icons/react";
import { useToast } from "@/context/ToastContext";
import { streamCompletion, getFriendlyErrorMessage } from "@/utils/aiStream";
import { ChatSidebar } from "./ChatSidebar";
import { ChatCanvas } from "./ChatCanvas";
import { ChatInput } from "./ChatInput";
import { ModelSelector } from "./ModelSelector";
import { PersonaSelector } from "./PersonaSelector";
import { ArtifactPanel } from "./ArtifactPanel";
import { NesaCallInterface } from "./NesaCallInterface";
import { useChatSessions } from "./useChatSessions";
import { useNesaCall } from "./useNesaCall";

export function Studio() {
  const toast = useToast();
  const [inputPrompt, setInputPrompt] = useState("");
  const [selectedModel, setSelectedModel] = useState(() => localStorage.getItem("selected_ai_model") || "gemini-3.8-flash");
  const [activePersona, setActivePersona] = useState("general");
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const [attachedImages, setAttachedImages] = useState([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeArtifact, setActiveArtifact] = useState(null);
  const abortControllerRef = useRef(null), onStreamCompleteRef = useRef(null);

  const {
    sessions, setSessions, activeSessionId, setActiveSessionId,
    messages, setMessages, isLoading, fetchSessions,
    createSession, deleteSession, renameSession, updateSessionPersona
  } = useChatSessions();

  const activeSession = sessions.find((s) => s.id === activeSessionId);

  useEffect(() => {
    if (activeSession?.persona) setActivePersona(activeSession.persona);
  }, [activeSession?.persona, activeSessionId]);

  const handleSelectPersona = (id) => {
    setActivePersona(id);
    if (activeSessionId) updateSessionPersona(activeSessionId, id);
  };

  const runStream = async (targetSessionId, promptText, imageBase64, isRegenerate = false, docPayload = {}) => {
    setIsStreaming(true); setStreamingText("");
    const controller = new AbortController(); abortControllerRef.current = controller;
    let accumulated = "";

    await streamCompletion({
      sessionId: targetSessionId, prompt: promptText, model: selectedModel, imageBase64,
      images: docPayload.images || (imageBase64 ? [imageBase64] : null),
      documents: docPayload.documents || null,
      attachmentType: docPayload.documents?.length > 0 ? "document" : (imageBase64 ? "image" : "none"),
      attachmentName: docPayload.documents?.[0]?.name || null,
      attachmentData: docPayload.documents?.[0]?.data || null,
      persona: activePersona, isRegenerate, signal: controller.signal,
      onChunk: (c) => { accumulated += c; setStreamingText((p) => p + c); },
      onComplete: () => {
        setIsStreaming(false); setStreamingText("");
        setMessages((p) => [...p, { id: "ai-" + Date.now(), role: "model", text: accumulated, createdAt: new Date().toISOString() }]);
        fetchSessions();
        if (onStreamCompleteRef.current) onStreamCompleteRef.current(accumulated);
      },
      onError: (err) => { setIsStreaming(false); setStreamingText(""); toast.error(getFriendlyErrorMessage(err)); }
    });
  };

  const handleSendMessage = async (payloadOrText, imageToSend) => {
    let textToSend = inputPrompt;
    let imagesToUpload = Array.isArray(imageToSend) ? imageToSend : (imageToSend ? [imageToSend] : attachedImages);
    let docsToUpload = [];

    if (payloadOrText && typeof payloadOrText === "object") {
      textToSend = payloadOrText.text !== undefined ? payloadOrText.text : inputPrompt;
      if (Array.isArray(payloadOrText.images)) imagesToUpload = payloadOrText.images;
      else if (payloadOrText.attachmentData && payloadOrText.attachmentType === "image") imagesToUpload = [payloadOrText.attachmentData];
      if (Array.isArray(payloadOrText.documents)) docsToUpload = payloadOrText.documents;
      else if (payloadOrText.attachmentData && payloadOrText.attachmentType === "document") docsToUpload = [{ name: payloadOrText.attachmentName, data: payloadOrText.attachmentData }];
    } else if (typeof payloadOrText === "string") textToSend = payloadOrText;

    if ((!textToSend.trim() && imagesToUpload.length === 0 && docsToUpload.length === 0) || isStreaming) return;
    let targetSessionId = activeSessionId;
    if (!targetSessionId) targetSessionId = await createSession(activePersona);
    if (!targetSessionId) return;

    const fallbackDoc = docsToUpload[0]?.name ? `Analyze ${docsToUpload[0].name}` : "Analyze attachment";
    const promptText = textToSend.trim() || (docsToUpload.length > 0 ? fallbackDoc : (imagesToUpload.length > 0 ? "Analyze attached image" : ""));
    const userMsg = {
      id: "usr-" + Date.now(), role: "user", text: promptText,
      attachment: imagesToUpload[0] || docsToUpload[0]?.data || null,
      attachmentType: docsToUpload.length > 0 ? "document" : (imagesToUpload.length > 0 ? "image" : "none"),
      attachmentName: docsToUpload[0]?.name || null,
      images: imagesToUpload, documents: docsToUpload, createdAt: new Date().toISOString()
    };
    setMessages((prev) => [...prev, userMsg]);
    setInputPrompt(""); setAttachedImages([]);

    const currSess = sessions.find((s) => s.id === targetSessionId);
    if (!currSess || currSess.title === "New Chat") {
      const words = promptText.split(/\s+/).slice(0, 4).join(" ");
      const autoTitle = words ? words.charAt(0).toUpperCase() + words.slice(1) : "Document Chat";
      setSessions((p) => p.map((s) => (s.id === targetSessionId ? { ...s, title: autoTitle } : s)));
    }
    await runStream(targetSessionId, promptText, imagesToUpload[0] || null, false, { images: imagesToUpload, documents: docsToUpload });
  };

  const { isCallActive, callPhase, isMinimized, toggleMinimize, nesaState, isListening: isNesaListening, transcript: nesaTranscript, startCall, endCall, onStreamComplete, connectionError, forceReply } = useNesaCall({ onSendMessage: handleSendMessage, isStreaming, onMicDenied: (m) => toast.error(m || "Microphone access is required") });
  onStreamCompleteRef.current = onStreamComplete;

  const handleRegenerate = async () => {
    if (isStreaming || !activeSessionId) return;
    setMessages((prev) => (prev[prev.length - 1]?.role === "model" ? prev.slice(0, -1) : prev));
    await runStream(activeSessionId, "", null, true);
  };

  const handleEditMessage = (id, text, att) => {
    setInputPrompt(text || "");
    if (att) setAttachedImages(Array.isArray(att) ? att : [att]);
    setMessages((p) => { const idx = p.findIndex((m) => m.id === id); return idx === -1 ? p : p.slice(0, idx); });
  };

  return (
    <div className="flex h-full w-full bg-surface-base text-text-primary overflow-hidden select-none pt-2 sm:pt-3">
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
                className="flex items-center gap-1.5 px-2 sm:px-2.5 py-1.5 rounded-[var(--radius-sm)] border border-border bg-surface text-text-muted hover:text-text-primary hover:border-accent text-xs font-semibold transition-colors cursor-pointer shrink-0"
                title="Show History" aria-label="Open chat history"
              >
                <ClockCounterClockwise size={14} weight="bold" />
                <span className="hidden sm:inline">History</span>
              </button>
            )}
            <span className={`font-semibold text-xs text-text-primary truncate ${!isSidebarOpen ? "border-l border-border pl-2.5" : ""}`}>
              {activeSession?.title || "New Chat"}
            </span>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <button
              type="button" onClick={startCall} disabled={isStreaming || isCallActive}
              className="flex items-center justify-center h-8 w-8 sm:w-auto sm:h-auto gap-1.5 px-2 py-1.5 sm:px-2.5 rounded-lg border border-accent/40 bg-accent/10 hover:bg-accent/20 text-accent text-xs font-medium transition-colors cursor-pointer disabled:opacity-50 shrink-0"
              title="Call Nesa" aria-label="Call Nesa"
            >
              <PhoneCall size={14} weight="fill" />
              <span className="hidden md:inline">Call Nesa</span>
            </button>
            <PersonaSelector selectedPersona={activePersona} onSelectPersona={handleSelectPersona} disabled={isStreaming} />
            <ModelSelector selectedModel={selectedModel} onSelectModel={(id) => { setSelectedModel(id); localStorage.setItem("selected_ai_model", id); }} />
          </div>
        </div>

        <div className="flex-1 flex min-w-0 h-full overflow-hidden relative">
          <div className={`flex flex-col min-w-0 h-full transition-all duration-200 ${activeArtifact ? "hidden lg:flex lg:w-1/2 border-r border-border" : "flex-1"}`}>
            <ChatCanvas
              messages={messages} activeSession={activeSession} activePersona={activePersona}
              isStreaming={isStreaming} streamingText={streamingText}
              onEdit={handleEditMessage} onRegenerate={handleRegenerate}
              onSendSuggested={(s) => handleSendMessage(s)} onOpenArtifact={setActiveArtifact}
              onSelectChoice={(c) => !isStreaming && handleSendMessage(c)}
              isSidebarOpen={isSidebarOpen}
            />
            <ChatInput
              inputPrompt={inputPrompt} setInputPrompt={setInputPrompt}
              onSubmit={(p) => handleSendMessage(p)} isStreaming={isStreaming}
              onStop={() => { abortControllerRef.current?.abort(); setIsStreaming(false); }}
              selectedModel={selectedModel} attachedImages={attachedImages} setAttachedImages={setAttachedImages}
            />
          </div>
          {activeArtifact && <ArtifactPanel artifact={activeArtifact} onClose={() => setActiveArtifact(null)} />}
        </div>
      </main>

      <NesaCallInterface
        isActive={isCallActive} callPhase={callPhase} isMinimized={isMinimized}
        onToggleMinimize={toggleMinimize} onEndCall={endCall} nesaState={nesaState}
        isListening={isNesaListening} transcript={nesaTranscript}
        connectionError={connectionError} onRetry={startCall} forceReply={forceReply}
      />
    </div>
  );
}

export default Studio;
