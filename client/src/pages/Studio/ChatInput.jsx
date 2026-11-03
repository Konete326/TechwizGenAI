import { useRef, useEffect } from "react";
import { ArrowUp, Paperclip, Stop, Microphone, Plus, Globe } from "@phosphor-icons/react";
import { useChatInputSubmit } from "./useChatInputSubmit";
import { useSpeechToText } from "./useSpeechToText";
import { ImageCropModal } from "./ImageCropModal";
import { AttachedPreview } from "./AttachedPreview";
import { useChatAttachment } from "./useChatAttachment";
import { ModelSelector } from "./ModelSelector";
import { PersonaSelector } from "./PersonaSelector";

export function ChatInput({
  inputPrompt,
  setInputPrompt,
  onSubmit,
  isStreaming,
  onStop,
  selectedModel = "gemini-3.6-flash",
  onSelectModel,
  activePersona = "general",
  onSelectPersona,
  attachedImages = [],
  setAttachedImages,
  attachedImage,
  setAttachedImage
}) {
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);
  const { isListening, toggleListening } = useSpeechToText(setInputPrompt);

  const {
    pendingImageSrc,
    setPendingImageSrc,
    isCropOpen,
    setIsCropOpen,
    attachedDocs,
    handleAttachmentClick,
    handleFileChange,
    handlePaste,
    handleCropSuccess,
    removeImage,
    removeDoc,
    clearAllAttachments
  } = useChatAttachment({ attachedImages, setAttachedImages, attachedImage, setAttachedImage, selectedModel });

  const currentImgList = Array.isArray(attachedImages) && attachedImages.length > 0 ? attachedImages : (attachedImage ? [attachedImage] : []);
  const hasImages = currentImgList.length > 0;
  const hasDocs = attachedDocs.length > 0;
  const hasAttachment = Boolean(hasImages || hasDocs);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 160)}px`;
    }
  }, [inputPrompt]);

  const { handleFormSubmit, handleKeyDown, placeholderText } = useChatInputSubmit({
    isStreaming,
    inputPrompt,
    hasAttachment,
    onSubmit,
    currentImgList,
    attachedDocs,
    hasDocs,
    hasImages,
    clearAllAttachments,
    setInputPrompt
  });

  return (
    <div className="w-full max-w-4xl mx-auto px-3 sm:px-6 md:px-8 pb-3 sm:pb-4 pt-1 shrink-0">
      <form onSubmit={handleFormSubmit} className="relative w-full">
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".pdf,.docx,.doc,.txt,.csv,.xlsx,.xls,application/pdf,text/plain,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/msword,image/*"
          onChange={handleFileChange}
          className="hidden"
        />

        {/* Floating LibreChat Input Container */}
        <div className="flex flex-col rounded-3xl bg-surface-card/95 dark:bg-zinc-900/90 border border-border/80 dark:border-white/10 shadow-lg dark:shadow-2xl backdrop-blur-md transition-all focus-within:border-accent/60 focus-within:ring-2 focus-within:ring-accent/10 p-2.5 sm:p-3 space-y-2">
          
          {/* Attached Files Preview */}
          <AttachedPreview
            attachedImages={currentImgList}
            attachedDocs={attachedDocs}
            onRemoveImage={removeImage}
            onRemoveDoc={removeDoc}
          />

          {/* Text Input Area */}
          <textarea
            ref={textareaRef}
            rows={1}
            value={inputPrompt}
            onChange={(e) => setInputPrompt(e.target.value)}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            placeholder={placeholderText || "Message Nisa or ask anything..."}
            className="w-full bg-transparent text-text-primary text-xs sm:text-[13px] resize-none focus:outline-none px-2 py-1 leading-relaxed max-h-40 placeholder:text-text-muted"
          />

          {/* Bottom Bar Inside Input Box */}
          <div className="flex items-center justify-between gap-2 pt-1 border-t border-border/40 dark:border-white/5">
            
            {/* Left Controls: Attachments & Presets */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                type="button"
                data-nesa-target="chat_attach"
                onClick={() => handleAttachmentClick(fileInputRef)}
                className={`p-1.5 rounded-full transition-colors cursor-pointer shrink-0 ${
                  hasAttachment
                    ? "text-accent bg-accent/15"
                    : "text-text-muted hover:text-text-primary hover:bg-surface"
                }`}
                title="Attach images, documents, or spreadsheets"
                aria-label="Attach files"
              >
                <Plus size={16} weight="bold" />
              </button>

              {onSelectModel && (
                <div className="hidden sm:block">
                  <ModelSelector
                    selectedModel={selectedModel}
                    onSelectModel={onSelectModel}
                    compact={true}
                  />
                </div>
              )}

              {onSelectPersona && (
                <div className="hidden md:block">
                  <PersonaSelector
                    selectedPersona={activePersona}
                    onSelectPersona={onSelectPersona}
                    disabled={isStreaming}
                    compact={true}
                  />
                </div>
              )}
            </div>

            {/* Right Controls: STT & Submit / Stop Button */}
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                data-nesa-target="chat_mic"
                onClick={toggleListening}
                className={`p-1.5 rounded-full transition-colors cursor-pointer shrink-0 ${
                  isListening
                    ? "animate-pulse text-red-500 bg-red-500/20 shadow-xs"
                    : "text-text-muted hover:text-text-primary hover:bg-surface"
                }`}
                title={isListening ? "Listening... click to stop" : "Speech to text"}
                aria-label="Microphone"
              >
                <Microphone size={17} weight={isListening ? "fill" : "regular"} />
              </button>

              {isStreaming ? (
                <button
                  type="button"
                  onClick={onStop}
                  className="w-8 h-8 rounded-full bg-zinc-800 dark:bg-zinc-100 text-white dark:text-zinc-900 flex items-center justify-center hover:opacity-90 transition-opacity cursor-pointer shadow-xs shrink-0"
                  title="Stop generating"
                  aria-label="Stop generating"
                >
                  <Stop size={13} weight="fill" />
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={!inputPrompt.trim() && !hasAttachment}
                  className="w-8 h-8 rounded-full bg-accent text-white flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed hover:bg-accent-hover transition-all cursor-pointer shadow-xs shrink-0"
                  title="Send message (Enter)"
                  aria-label="Send message"
                >
                  <ArrowUp size={15} weight="bold" />
                </button>
              )}
            </div>

          </div>
        </div>
      </form>

      {/* LibreChat Footer Disclaimer */}
      <p className="text-[10px] text-center text-text-muted/70 mt-1.5 select-none font-sans">
        Techwiz AI can make mistakes. Verify important information.
      </p>

      <ImageCropModal
        isOpen={isCropOpen}
        imageSrc={pendingImageSrc}
        onClose={() => {
          setIsCropOpen(false);
          setPendingImageSrc(null);
        }}
        onSuccess={handleCropSuccess}
      />
    </div>
  );
}

export default ChatInput;
