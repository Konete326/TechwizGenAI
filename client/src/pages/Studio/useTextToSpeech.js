import { useState, useEffect, useCallback, useRef } from "react";
import { base64DecodeAudio } from "./audioUtils";

const TTS_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent";

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
  const audioCtxRef = useRef(null);
  const currentSourceRef = useRef(null);
  const abortControllerRef = useRef(null);

  const stop = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    if (currentSourceRef.current) {
      try { currentSourceRef.current.stop(); } catch {}
      currentSourceRef.current = null;
    }
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      try { window.speechSynthesis.cancel(); } catch {}
    }
    setSpeakingMessageId(null);
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

    const apiKey = localStorage.getItem("techwiz_custom_api_key") ||
      localStorage.getItem("custom_api_key") ||
      import.meta.env.VITE_GEMINI_API_KEY || "";

    if (apiKey) {
      try {
        const controller = new AbortController();
        abortControllerRef.current = controller;

        const res = await fetch(`${TTS_URL}?key=${apiKey}`, {
          method: "POST",
          signal: controller.signal,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: cleanText.slice(0, 1500) }] }],
            generationConfig: {
              responseModalities: ["AUDIO"],
              speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: "Aoede" } } }
            }
          })
        });

        if (res.ok) {
          const json = await res.json();
          const base64Data = json.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
          if (base64Data) {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            const ctx = audioCtxRef.current || new AudioCtx({ sampleRate: 24000 });
            audioCtxRef.current = ctx;
            if (ctx.state === "suspended") await ctx.resume();

            const float32 = base64DecodeAudio(base64Data);
            const buffer = ctx.createBuffer(1, float32.length, 24000);
            buffer.copyToChannel(float32, 0);

            const source = ctx.createBufferSource();
            source.buffer = buffer;
            source.connect(ctx.destination);
            currentSourceRef.current = source;

            source.onended = () => {
              if (currentSourceRef.current === source) {
                currentSourceRef.current = null;
                setSpeakingMessageId(null);
                if (onEnd) onEnd();
              }
            };

            source.start(0);
            return;
          }
        }
      } catch (err) {
        if (err.name === "AbortError") return;
      }
    }

    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      const detected = detectLanguage(cleanText);
      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.lang = detected.bcp47;
      utterance.onend = () => { setSpeakingMessageId(null); if (onEnd) onEnd(); };
      utterance.onerror = () => { setSpeakingMessageId(null); if (onEnd) onEnd(); };
      window.speechSynthesis.speak(utterance);
    } else {
      setSpeakingMessageId(null);
    }
  }, [speakingMessageId, stop]);

  useEffect(() => {
    return () => stop();
  }, [stop]);

  return { speakingMessageId, speak, stop };
}

export default useTextToSpeech;
