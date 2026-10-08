import { useRef, useEffect, useCallback } from "react";
import { streamCompletion, getFriendlyErrorMessage } from "@/utils/aiStream";
import { useToast } from "@/context/ToastContext";
import { formatToolResponse } from "./nesaTools";

export function useStudioStream({
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
  setActiveArtifact
}) {
  const toast = useToast();
  const abortControllerRef = useRef(null);
  const queuedPromptRef = useRef(null);

  const runStream = useCallback(async (targetSessionId, promptText, imageBase64, isRegenerate = false, docPayload = {}) => {
    setIsStreaming(true); setStreamingText("");
    const controller = new AbortController(); abortControllerRef.current = controller;
    let accumulated = "";

    await streamCompletion({
      sessionId: targetSessionId, prompt: promptText, model: selectedModel, imageBase64,
      images: docPayload.images || (imageBase64 ? [imageBase64] : null), documents: docPayload.documents || null,
      attachmentType: docPayload.documents?.length > 0 ? "document" : (imageBase64 ? "image" : "none"),
      attachmentName: docPayload.documents?.[0]?.name || null, attachmentData: docPayload.documents?.[0]?.data || null,
      persona: activePersona, isRegenerate, signal: controller.signal,
      onChunk: (c) => { accumulated += c; setStreamingText((p) => p + c); },
      onComplete: () => {
        setIsStreaming(false); setStreamingText("");
        setMessages((p) => [...p, { id: "ai-" + Date.now(), role: "model", text: accumulated, createdAt: new Date().toISOString() }]);
        fetchSessions();
      },
      onError: (err) => {
        setIsStreaming(false);
        if (accumulated) setMessages((p) => [...p, { id: "ai-" + Date.now(), role: "model", text: accumulated, createdAt: new Date().toISOString() }]);
        setStreamingText("");
        toast.error(getFriendlyErrorMessage(err));
      }
    });
  }, [selectedModel, activePersona, setMessages, setIsStreaming, setStreamingText, fetchSessions, toast]);

  const handleSendMessage = useCallback(async (payloadOrText, imageToSend) => {
    let textToSend = inputPrompt, imagesToUpload = Array.isArray(imageToSend) ? imageToSend : (imageToSend ? [imageToSend] : attachedImages), docsToUpload = [];

    if (payloadOrText && typeof payloadOrText === "object") {
      textToSend = payloadOrText.text !== undefined ? payloadOrText.text : inputPrompt;
      if (Array.isArray(payloadOrText.images)) imagesToUpload = payloadOrText.images;
      else if (payloadOrText.attachmentData && payloadOrText.attachmentType === "image") imagesToUpload = [payloadOrText.attachmentData];
      if (Array.isArray(payloadOrText.documents)) docsToUpload = payloadOrText.documents;
      else if (payloadOrText.attachmentData && payloadOrText.attachmentType === "document") docsToUpload = [{ name: payloadOrText.attachmentName, data: payloadOrText.attachmentData }];
    } else if (typeof payloadOrText === "string") textToSend = payloadOrText;

    if ((!textToSend.trim() && imagesToUpload.length === 0 && docsToUpload.length === 0) || isStreaming) return;
    const targetSessionId = activeSessionId || (await createSession(activePersona));
    if (!targetSessionId) return;

    const fallbackDoc = docsToUpload[0]?.name ? `Analyze ${docsToUpload[0].name}` : "Analyze attachment";
    const promptText = textToSend.trim() || (docsToUpload.length > 0 ? fallbackDoc : (imagesToUpload.length > 0 ? "Analyze attached image" : ""));
    const userMsg = {
      id: "usr-" + Date.now(), role: "user", text: promptText, attachment: imagesToUpload[0] || docsToUpload[0]?.data || null,
      attachmentType: docsToUpload.length > 0 ? "document" : (imagesToUpload.length > 0 ? "image" : "none"),
      attachmentName: docsToUpload[0]?.name || null, images: imagesToUpload, documents: docsToUpload, createdAt: new Date().toISOString()
    };
    setMessages((prev) => [...prev, userMsg]);
    setInputPrompt(""); setAttachedImages([]);

    const currSess = sessions.find((s) => s.id === targetSessionId);
    if (!currSess || currSess.title === "New Chat") {
      const words = promptText.split(/\s+/).slice(0, 4).join(" "), autoTitle = words ? words.charAt(0).toUpperCase() + words.slice(1) : "Document Chat";
      setSessions((p) => p.map((s) => (s.id === targetSessionId ? { ...s, title: autoTitle } : s)));
    }
    await runStream(targetSessionId, promptText, imagesToUpload[0] || null, false, { images: imagesToUpload, documents: docsToUpload });
  }, [inputPrompt, attachedImages, isStreaming, activeSessionId, createSession, activePersona, setMessages, setInputPrompt, setAttachedImages, sessions, setSessions, runStream]);

  const handleRegenerate = async () => { if (!isStreaming && activeSessionId) { setMessages((p) => (p[p.length - 1]?.role === "model" ? p.slice(0, -1) : p)); await runStream(activeSessionId, "", null, true); } };

  const stopStreaming = () => { if (abortControllerRef.current) { abortControllerRef.current.abort(); abortControllerRef.current = null; } };

  useEffect(() => {
    if (!isStreaming && queuedPromptRef.current) {
      const q = queuedPromptRef.current; queuedPromptRef.current = null; handleSendMessage(q);
    }
    const handleToolCall = (e) => {
      const { text, args } = e.detail;
      const formatted = formatToolResponse(text, args);
      if (isStreaming) { queuedPromptRef.current = formatted; stopStreaming(); } else handleSendMessage(formatted);
    };
    const handleArtifact = (e) => setActiveArtifact(e.detail);
    window.addEventListener("nesaLiveToolCall", handleToolCall);
    window.addEventListener("nesaLiveArtifact", handleArtifact);
    return () => { window.removeEventListener("nesaLiveToolCall", handleToolCall); window.removeEventListener("nesaLiveArtifact", handleArtifact); };
  }, [isStreaming, handleSendMessage, setActiveArtifact]);

  return { handleSendMessage, handleRegenerate, stopStreaming, abortControllerRef, runStream };
}
