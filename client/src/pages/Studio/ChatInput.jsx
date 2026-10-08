import { useRef, useEffect } from "react";
import { ChatInputButtons } from "./ChatInputButtons";
import { useChatInputSubmit } from "./useChatInputSubmit";
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
  selectedModel = "gemini-3.6-flash",
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

  const { handleFormSubmit, handleKeyDown, placeholderText } = useChatInputSubmit({
    isStreaming, inputPrompt, hasAttachment, onSubmit, currentImgList, attachedDocs, hasDocs, hasImages, clearAllAttachments, setInputPrompt
  });

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

          <ChatInputButtons
            isStreaming={isStreaming}
            onStop={onStop}
            hasAttachment={hasAttachment}
            handleAttachmentClick={handleAttachmentClick}
            fileInputRef={fileInputRef}
            isListening={isListening}
            toggleListening={toggleListening}
            inputPrompt={inputPrompt}
            setInputPrompt={setInputPrompt}
            textareaRef={textareaRef}
            handleKeyDown={handleKeyDown}
            handlePaste={handlePaste}
            placeholderText={placeholderText}
          />
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
