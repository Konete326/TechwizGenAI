import { PaperPlaneRight, Paperclip, Stop, Microphone } from "@phosphor-icons/react";

export function ChatInputButtons({
  isStreaming,
  onStop,
  hasAttachment,
  handleAttachmentClick,
  fileInputRef,
  isListening,
  toggleListening,
  inputPrompt,
  setInputPrompt,
  textareaRef,
  handleKeyDown,
  handlePaste,
  placeholderText
}) {
  return (
    <>
      <button
        type="button"
        data-nesa-target="chat_attach"
        onClick={() => handleAttachmentClick(fileInputRef)}
        className={`p-2 rounded transition-colors cursor-pointer shrink-0 ${hasAttachment ? "text-accent bg-accent/15" : "text-text-muted hover:text-text-primary hover:bg-surface-elevated"}`}
        title="Attach files"
      >
        <Paperclip size={18} />
      </button>
      <button
        type="button"
        data-nesa-target="chat_mic"
        onClick={toggleListening}
        className={`p-2 rounded transition-colors cursor-pointer shrink-0 ${isListening ? "animate-pulse text-red-500 bg-red-500/20" : "text-text-muted hover:text-text-primary hover:bg-surface-elevated"}`}
        title="Speech to text"
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
        <button type="button" onClick={onStop} className="p-2 rounded bg-rose-600 text-white shrink-0"><Stop size={15} weight="fill" /></button>
      ) : (
        <button type="submit" disabled={!inputPrompt.trim() && !hasAttachment} className="p-2 rounded bg-accent text-white disabled:opacity-40 shrink-0"><PaperPlaneRight size={15} weight="fill" /></button>
      )}
    </>
  );
}
