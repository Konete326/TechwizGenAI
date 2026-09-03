import { useRef, useEffect } from "react";
import { PaperPlaneRight, Paperclip, Stop, X, Microphone } from "@phosphor-icons/react";
import { useToast } from "@/context/ToastContext";
import { useSpeechToText } from "./useSpeechToText";

export function ChatInput({
  inputPrompt,
  setInputPrompt,
  onSubmit,
  isStreaming,
  onStop,
  selectedModel = "gemini-3.7-flash",
  attachedImage,
  setAttachedImage
}) {
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);
  const toast = useToast();
  const { isListening, toggleListening } = useSpeechToText(setInputPrompt);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [inputPrompt]);

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!isStreaming && (inputPrompt.trim() || attachedImage)) {
        onSubmit();
      }
    }
  };

  const handlePaste = (e) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of items) {
      if (item.type.startsWith("image/")) {
        const file = item.getAsFile();
        if (file) {
          if (file.size > 5 * 1024 * 1024) return toast.error("Pasted image exceeds 5 MB limit");
          const reader = new FileReader();
          reader.onload = () => setAttachedImage(reader.result);
          reader.readAsDataURL(file);
          e.preventDefault();
          break;
        }
      }
    }
  };

  const handleAttachmentClick = () => {
    if (selectedModel === "gemini-1.5-flash-8b") {
      toast.error("This model does not support image attachments. Please select a superior model.");
      return;
    }
    fileInputRef.current?.click();
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Attachment image must be under 5 MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setAttachedImage(reader.result);
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  return (
    <div className="p-3 md:p-4 border-t border-border bg-surface-card/90 backdrop-blur shrink-0 w-full">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!isStreaming && (inputPrompt.trim() || attachedImage)) onSubmit();
        }}
        className="w-full space-y-2"
      >
        {attachedImage && (
          <div className="relative inline-flex items-center gap-2 p-1.5 rounded-lg bg-surface border border-accent/40 shadow-sm">
            <img src={attachedImage} alt="Attachment" className="w-12 h-12 object-cover rounded-md" />
            <div className="text-[11px] font-mono text-text-muted pr-2">
              <span className="text-accent font-semibold block">Image Ready</span>
              <span>Attached to prompt</span>
            </div>
            <button
              type="button"
              onClick={() => setAttachedImage(null)}
              className="w-5 h-5 rounded-full bg-rose-600 text-white flex items-center justify-center text-[10px] shadow cursor-pointer hover:bg-rose-500 transition-colors"
              title="Remove attachment"
            >
              <X size={11} weight="bold" />
            </button>
          </div>
        )}

        <div className="relative flex items-end gap-2 p-2 rounded-[var(--radius-md)] bg-surface border border-border focus-within:border-accent shadow-sm transition-all w-full">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png, image/jpeg, image/webp"
            onChange={handleFileChange}
            className="hidden"
          />

          <button
            type="button"
            onClick={handleAttachmentClick}
            className={`p-2 rounded transition-colors cursor-pointer shrink-0 ${
              attachedImage ? "text-accent bg-accent/15" : "text-text-muted hover:text-text-primary hover:bg-surface-elevated"
            }`}
            title="Attach image"
            aria-label="Attach image"
          >
            <Paperclip size={18} />
          </button>

          <button
            type="button"
            onClick={toggleListening}
            className={`p-2 rounded transition-colors cursor-pointer shrink-0 ${
              isListening
                ? "animate-pulse text-red-500 bg-red-500/20 border border-red-500/40"
                : "text-text-muted hover:text-text-primary hover:bg-surface-elevated"
            }`}
            title={isListening ? "Stop listening" : "Speech to text"}
            aria-label="Speech to text"
          >
            <Microphone size={18} weight={isListening ? "fill" : "regular"} />
          </button>

          <textarea
            ref={textareaRef}
            rows={1}
            value={inputPrompt}
            onChange={(e) => setInputPrompt(e.target.value)}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            placeholder={attachedImage ? "Ask anything about this image... (or press Enter)" : "Ask Gemini anything... (attach image, speak or type prompt)"}
            className="flex-1 max-h-32 bg-transparent text-text-primary text-xs resize-none focus:outline-none py-1.5 px-1 leading-relaxed"
          />

          {isStreaming ? (
            <button
              type="button"
              onClick={onStop}
              className="p-2 rounded-[var(--radius-sm)] bg-rose-600 hover:bg-rose-500 text-white transition-colors btn-tactile cursor-pointer shrink-0 flex items-center justify-center"
              title="Stop generating"
              aria-label="Stop generating"
            >
              <Stop size={15} weight="fill" />
            </button>
          ) : (
            <button
              type="submit"
              disabled={!inputPrompt.trim() && !attachedImage}
              className="p-2 rounded-[var(--radius-sm)] bg-accent hover:bg-accent-hover text-white transition-colors btn-tactile cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shrink-0 flex items-center justify-center shadow-sm"
              title="Send message"
              aria-label="Send message"
            >
              <PaperPlaneRight size={15} weight="fill" />
            </button>
          )}
        </div>
      </form>
    </div>
  );
}

export default ChatInput;
