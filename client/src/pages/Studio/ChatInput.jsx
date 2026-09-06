import { useRef, useEffect } from "react";
import { PaperPlaneRight, Paperclip, Stop, Microphone } from "@phosphor-icons/react";
import { useSpeechToText } from "./useSpeechToText";
import { ImageCropModal } from "./ImageCropModal";
import { AttachedPreview } from "./AttachedPreview";
import { useChatAttachment } from "./useChatAttachment";

export function ChatInput({
  inputPrompt,
  setInputPrompt,
  onSubmit,
  isStreaming,
  onStop,
  selectedModel = "gemini-3.8-flash",
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
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [inputPrompt]);

  const handleFormSubmit = (e) => {
    if (e) e.preventDefault();
    if (isStreaming) return;
    if (!inputPrompt.trim() && !hasAttachment) return;

    onSubmit({
      text: inputPrompt,
      images: currentImgList,
      documents: attachedDocs,
      attachmentType: hasDocs ? "document" : (hasImages ? "image" : "none"),
      attachmentName: hasDocs ? attachedDocs[0].name : null,
      attachmentData: hasDocs ? attachedDocs[0].data : (hasImages ? currentImgList[0] : null)
    });
    clearAllAttachments();
    setInputPrompt("");
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleFormSubmit();
    }
  };

  const placeholderText = hasDocs
    ? (attachedDocs.length === 1 ? `Ask about ${attachedDocs[0].name}...` : `Ask about ${attachedDocs.length} documents...`)
    : (hasImages ? (currentImgList.length === 1 ? "Ask about image..." : `Ask about ${currentImgList.length} images...`) : "Ask anything...");

  return (
    <div className="p-3 md:p-4 border-t border-border bg-surface-card/90 backdrop-blur shrink-0 w-full">
      <form onSubmit={handleFormSubmit} className="w-full space-y-2">
        <AttachedPreview
          attachedImages={currentImgList}
          attachedDocs={attachedDocs}
          onRemoveImage={removeImage}
          onRemoveDoc={removeDoc}
        />

        <div className="relative flex items-end gap-2 p-2 rounded-[var(--radius-md)] bg-surface border border-border focus-within:border-accent shadow-sm transition-all w-full">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf,.docx,.doc,.txt,.csv,.xlsx,.xls,application/pdf,text/plain,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/msword,image/*"
            onChange={handleFileChange}
            className="hidden"
          />

          <button
            type="button"
            onClick={() => handleAttachmentClick(fileInputRef)}
            className={`p-2 rounded transition-colors cursor-pointer shrink-0 ${
              hasAttachment ? "text-accent bg-accent/15" : "text-text-muted hover:text-text-primary hover:bg-surface-elevated"
            }`}
            title="Attach files (up to 3 images, 5 documents)"
            aria-label="Attach files"
          >
            <Paperclip size={18} />
          </button>

          <button
            type="button"
            onClick={toggleListening}
            className={`p-2 rounded transition-colors cursor-pointer shrink-0 ${
              isListening ? "animate-pulse text-red-500 bg-red-500/20 border border-red-500/40" : "text-text-muted hover:text-text-primary hover:bg-surface-elevated"
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
            placeholder={placeholderText}
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
              disabled={!inputPrompt.trim() && !hasAttachment}
              className="p-2 rounded-[var(--radius-sm)] bg-accent hover:bg-accent-hover text-white transition-colors btn-tactile cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shrink-0 flex items-center justify-center shadow-sm"
              title="Send message"
              aria-label="Send message"
            >
              <PaperPlaneRight size={15} weight="fill" />
            </button>
          )}
        </div>
      </form>
      <ImageCropModal
        isOpen={isCropOpen}
        imageSrc={pendingImageSrc}
        onClose={() => { setIsCropOpen(false); setPendingImageSrc(null); }}
        onSuccess={handleCropSuccess}
      />
    </div>
  );
}

export default ChatInput;
