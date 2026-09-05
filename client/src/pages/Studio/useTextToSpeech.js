import { useState, useEffect, useCallback, useRef } from "react";
import { puter } from "@heyputer/puter.js";

export function sanitizeForSpeech(text) {
  if (!text) return "";
  return text
    .replace(/```[\s\S]*?```/g, "")
    .replace(/\[(ARTIFACT|DOC_REQ|IMAGE_REQ):[^\]]*\]/gi, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/^[#>\s*-+]+(?=\S)/gm, "")
    .replace(/[*_~]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function detectLanguage(text) {
  if (/[\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF]/.test(text)) return { lang: "ur", bcp47: "ur-PK" };
  if (/[\u0900-\u097F]/.test(text)) return { lang: "hi", bcp47: "hi-IN" };
  if (/[\u4E00-\u9FFF]/.test(text)) return { lang: "zh", bcp47: "zh-CN" };
  if (/[\u3040-\u309F\u30A0-\u30FF]/.test(text)) return { lang: "ja", bcp47: "ja-JP" };
  if (/[\u0400-\u04FF]/.test(text)) return { lang: "ru", bcp47: "ru-RU" };
  if (/\b(kya|hai|hain|kaise|kaisay|main|mera|meri|mere|aap|tum|yeh|woh|nhi|nahi|raha|rahi|shukriya|theek)\b/i.test(text)) return { lang: "hi", bcp47: "en-IN" };
  return { lang: "en", bcp47: "en-US" };
}

export function useTextToSpeech() {
  const [speakingMessageId, setSpeakingMessageId] = useState(null);
  const currentAudioRef = useRef(null);

  const stop = useCallback(() => {
    if (currentAudioRef.current) {
      try {
        currentAudioRef.current.pause();
        currentAudioRef.current.currentTime = 0;
      } catch {}
      currentAudioRef.current = null;
    }
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      try { window.speechSynthesis.cancel(); } catch {}
    }
    setSpeakingMessageId(null);
  }, []);

  const playBrowserSpeech = useCallback((text, onEnd) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      setSpeakingMessageId(null);
      if (onEnd) onEnd();
      return;
    }
    const detected = detectLanguage(text);
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = detected.bcp47;
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.onend = () => { setSpeakingMessageId(null); if (onEnd) onEnd(); };
    utterance.onerror = () => { setSpeakingMessageId(null); if (onEnd) onEnd(); };
    window.speechSynthesis.speak(utterance);
  }, []);

  const speak = useCallback(async (messageId, rawText, onEnd) => {
    if (speakingMessageId === messageId) {
      stop();
      return;
    }
    stop();

    const cleanText = sanitizeForSpeech(rawText);
    if (!cleanText) {
      if (onEnd) onEnd();
      return;
    }

    setSpeakingMessageId(messageId);

    try {
      const puterClient = (typeof window !== "undefined" && window.puter) || puter;
      if (puterClient?.ai?.txt2speech) {
        const audio = await puterClient.ai.txt2speech(cleanText.slice(0, 3000));
        if (audio) {
          currentAudioRef.current = audio;
          audio.onended = () => {
            currentAudioRef.current = null;
            setSpeakingMessageId(null);
            if (onEnd) onEnd();
          };
          audio.onerror = () => {
            currentAudioRef.current = null;
            playBrowserSpeech(cleanText, onEnd);
          };
          await audio.play();
          return;
        }
      }
    } catch {}

    playBrowserSpeech(cleanText, onEnd);
  }, [speakingMessageId, stop, playBrowserSpeech]);

  useEffect(() => {
    return () => stop();
  }, [stop]);

  return { speakingMessageId, speak, stop };
}

export default useTextToSpeech;
