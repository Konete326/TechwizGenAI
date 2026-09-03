import { useState } from "react";
import { PencilSimple, ArrowClockwise, Copy, Check } from "@phosphor-icons/react";
import { MarkdownRenderer } from "./MarkdownRenderer";
import logoImg from "@/assets/logo.png";

export function MessageBubble({ message, onEdit, onRegenerate, isStreaming }) {
  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(message.text || "");
  const isUser = message.role === "user";

  const handleCopy = () => {
    navigator.clipboard.writeText(message.text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveEdit = () => {
    if (!editText.trim()) return;
    setIsEditing(false);
    if (onEdit) onEdit(message.id, editText.trim());
  };

  if (isUser) {
    return (
      <div className="flex w-full justify-end">
        <div className="max-w-[80%] flex flex-col items-end group">
          <div className="w-full flex flex-col gap-2 p-4 bg-accent text-white rounded-2xl rounded-tr-sm shadow-sm">
            {message.attachment && (
              <img
                src={message.attachment}
                alt="Attachment"
                className="max-w-xs max-h-60 object-cover rounded-md border border-white/20 shadow-sm"
              />
            )}

            {isEditing ? (
              <div className="space-y-2">
                <textarea
                  rows={2}
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  className="w-full bg-white/10 text-white text-xs p-2 rounded border border-white/30 focus:outline-none resize-none leading-relaxed"
                />
                <div className="flex items-center justify-end gap-1.5 text-[10px]">
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="px-2 py-1 rounded bg-white/20 hover:bg-white/30 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveEdit}
                    className="px-2 py-1 rounded bg-white text-accent font-semibold hover:bg-white/90 transition-colors cursor-pointer"
                  >
                    Save & Resend
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-xs leading-relaxed break-words whitespace-pre-wrap">
                {message.text}
              </div>
            )}
          </div>

          {!isEditing && (
            <div className="flex items-center gap-1 pt-1 opacity-0 group-hover:opacity-100 transition-opacity text-text-muted">
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="p-1 rounded hover:text-text-primary hover:bg-surface-card transition-colors cursor-pointer"
                title="Edit message"
                aria-label="Edit message"
              >
                <PencilSimple size={13} />
              </button>
              <button
                type="button"
                onClick={handleCopy}
                className="p-1 rounded hover:text-text-primary hover:bg-surface-card transition-colors cursor-pointer"
                title={copied ? "Copied" : "Copy text"}
                aria-label="Copy text"
              >
                {copied ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex w-full justify-start">
      <div className="max-w-[80%] flex flex-col items-start group">
        <div className="w-full flex flex-col gap-2 p-4 bg-surface-card border border-border text-zinc-100 rounded-2xl rounded-tl-sm shadow-sm">
          <div className="flex items-center gap-1.5 text-[10px] font-mono text-text-muted">
            <img src={logoImg} alt="Techwiz GenAI" className="w-3.5 h-3.5 object-contain" />
            <span>Techwiz AI</span>
          </div>

          {message.attachment && (
            <img
              src={message.attachment}
              alt="Attachment"
              className="max-w-xs max-h-60 object-cover rounded-md border border-border shadow-sm"
            />
          )}

          <div className="text-xs leading-relaxed break-words">
            <MarkdownRenderer content={message.text || ""} />
            {isStreaming && (
              <span className="inline-block w-1.5 h-3.5 ml-1 bg-accent animate-pulse align-middle" />
            )}
          </div>
        </div>

        <div className="flex items-center gap-1 pt-1 opacity-0 group-hover:opacity-100 transition-opacity text-text-muted">
          <button
            type="button"
            onClick={() => onRegenerate && onRegenerate()}
            disabled={isStreaming}
            className="p-1 rounded hover:text-text-primary hover:bg-surface-card transition-colors cursor-pointer disabled:opacity-40"
            title="Regenerate response"
            aria-label="Regenerate response"
          >
            <ArrowClockwise size={13} />
          </button>
          <button
            type="button"
            onClick={handleCopy}
            className="p-1 rounded hover:text-text-primary hover:bg-surface-card transition-colors cursor-pointer"
            title={copied ? "Copied" : "Copy text"}
            aria-label="Copy text"
          >
            {copied ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
          </button>
        </div>
      </div>
    </div>
  );
}

export default MessageBubble;
