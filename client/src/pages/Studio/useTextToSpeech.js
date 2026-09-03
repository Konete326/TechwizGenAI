import { useState, useEffect, useCallback, useRef } from "react";

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

function findVoice(voices, { lang, bcp47 }) {
  if (!voices?.length) return null;
  return voices.find((v) => v.lang?.toLowerCase() === bcp47.toLowerCase()) ||
    voices.find((v) => v.lang?.toLowerCase().startsWith(lang)) ||
    voices.find((v) => v.lang?.toLowerCase().startsWith(bcp47.split("-")[0])) ||
    (lang === "ur" ? voices.find((v) => v.lang?.toLowerCase().startsWith("ar") || v.lang?.toLowerCase().startsWith("hi")) : null) ||
    voices.find((v) => v.lang?.toLowerCase().startsWith("en")) || voices[0] || null;
}

export function useTextToSpeech() {
  const [speakingMessageId, setSpeakingMessageId] = useState(null);
  const [voices, setVoices] = useState([]);
  const utteranceRef = useRef(null);

  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    const load = () => { const v = window.speechSynthesis.getVoices(); if (v?.length) setVoices(v); };
    load();
    window.speechSynthesis.addEventListener("voiceschanged", load);
    return () => window.speechSynthesis.removeEventListener("voiceschanged", load);
  }, []);

  const stop = useCallback(() => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
    setSpeakingMessageId(null);
    utteranceRef.current = null;
  }, []);

  const speak = useCallback((messageId, rawText) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    if (speakingMessageId === messageId) return stop();
    stop();

    const cleanText = sanitizeForSpeech(rawText);
    if (!cleanText) return;

    const detected = detectLanguage(cleanText);
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.lang = detected.bcp47;

    const allVoices = voices.length ? voices : window.speechSynthesis.getVoices();
    const matchedVoice = findVoice(allVoices, detected);
    if (matchedVoice) {
      utterance.voice = matchedVoice;
      utterance.lang = matchedVoice.lang || detected.bcp47;
    }

    const handleReset = () => { setSpeakingMessageId(null); utteranceRef.current = null; };
    utterance.onend = handleReset;
    utterance.onerror = handleReset;
    utteranceRef.current = utterance;
    setSpeakingMessageId(messageId);
    window.speechSynthesis.speak(utterance);
  }, [speakingMessageId, stop, voices]);

  useEffect(() => {
    return () => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
    };
  }, []);

  return { speakingMessageId, speak, stop };
}

export default useTextToSpeech;
