import { useState, useRef } from "react";
import { useToast } from "@/context/ToastContext";

export function useSpeechToText(onTranscript) {
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef(null);
  const toast = useToast();

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.error("Speech recognition is not supported in your browser.");
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = "en-US";

      recognition.onstart = () => setIsListening(true);
      recognition.onresult = (e) => {
        let speech = "";
        for (let i = e.resultIndex; i < e.results.length; i++) {
          speech += e.results[i][0].transcript;
        }
        if (speech && onTranscript) {
          onTranscript((prev) => (prev ? `${prev} ${speech}` : speech));
        }
      };
      recognition.onerror = () => {
        setIsListening(false);
        toast.error("Microphone access denied or error occurred");
      };
      recognition.onend = () => setIsListening(false);
      recognitionRef.current = recognition;
      recognition.start();
    } catch {
      setIsListening(false);
      toast.error("Could not initiate speech recognition");
    }
  };

  return { isListening, toggleListening };
}

export default useSpeechToText;
