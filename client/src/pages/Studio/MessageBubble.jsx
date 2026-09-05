import { useState } from "react";
import { PencilSimple, ArrowClockwise, Copy, Check, SpeakerHigh, Stop, FilePdf, FileText, ArrowSquareOut } from "@phosphor-icons/react";
import { MarkdownRenderer } from "./MarkdownRenderer";
import logoImg from "@/assets/logo.png";

function DocumentBadge({ attachment, name }) {
  const isPdf = (name || "").toLowerCase().endsWith(".pdf");
  return (
    <div className="bg-surface-elevated/95 border border-border px-3 py-2 rounded-lg flex items-center gap-2 text-xs shadow-sm max-w-sm">
      {isPdf ? <FilePdf size={18} className="text-rose-400 shrink-0" /> : <FileText size={18} className="text-sky-400 shrink-0" />}
      <span className="font-mono truncate font-medium text-text-primary">{name || "Attached Document"}</span>
      {attachment && (
        <a href={attachment} download={name || "document"} target="_blank" rel="noreferrer" className="ml-auto text-accent hover:text-accent-hover text-[11px] font-semibold flex items-center gap-1 shrink-0 transition-colors" title="View document" aria-label="View document">
          <span>View</span>
          <ArrowSquareOut size={12} />
        </a>
      )}
    </div>
  );
}

export function MessageBubble({ message, onEdit, onRegenerate, isStreaming, onOpenArtifact, onSpeak, isSpeakingThisMessage, onSelectChoice }) {
  const [copied, setCopied] = useState(false);
  const isUser = message.role === "user";
  const isDoc = message.attachmentType === "document" || Boolean(message.attachmentName && !String(message.attachment || "").startsWith("data:image/"));

  const handleCopy = () => {
    navigator.clipboard.writeText(message.text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (isUser) {
    return (
      <div className="flex w-full justify-end">
        <div className="max-w-[85%] md:max-w-[80%] min-w-0 flex flex-col items-end group">
          <div className="w-full min-w-0 flex flex-col gap-2 p-4 bg-accent text-white rounded-2xl rounded-tr-sm shadow-sm">
            {message.attachment && (isDoc ? <DocumentBadge attachment={message.attachment} name={message.attachmentName} /> : (
              <img src={message.attachment} alt="Attachment" className="max-w-xs max-h-60 object-cover rounded-md border border-white/20 shadow-sm cursor-pointer" onClick={() => window.open(message.attachment, "_blank")} />
            ))}
            <div className="text-xs leading-relaxed break-words whitespace-pre-wrap">{message.text}</div>
          </div>
          <div className="flex items-center gap-1 pt-1 opacity-0 group-hover:opacity-100 transition-opacity text-text-muted">
            <button type="button" onClick={() => onEdit && onEdit(message.id, message.text, message.attachment)} className="p-1 rounded hover:text-text-primary hover:bg-surface-card transition-colors cursor-pointer" title="Edit in input field" aria-label="Edit message">
              <PencilSimple size={13} />
            </button>
            <button type="button" onClick={handleCopy} className="p-1 rounded hover:text-text-primary hover:bg-surface-card transition-colors cursor-pointer" title={copied ? "Copied" : "Copy text"} aria-label="Copy text">
              {copied ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex w-full justify-start">
      <div className="max-w-[85%] md:max-w-[80%] min-w-0 flex flex-col items-start group">
        <div className="w-full min-w-0 flex flex-col gap-2 p-4 bg-surface-card border border-border text-text-primary rounded-2xl rounded-tl-sm shadow-sm">
          <div className="flex items-center gap-1.5 text-[10px] font-mono text-text-muted">
            <img src={logoImg} alt="Techwiz GenAI" className="w-3.5 h-3.5 object-contain" />
            <span>Techwiz AI</span>
          </div>
          {message.attachment && (isDoc ? <DocumentBadge attachment={message.attachment} name={message.attachmentName} /> : (
            <img src={message.attachment} alt="Attachment" className="max-w-xs max-h-60 object-cover rounded-md border border-border shadow-sm cursor-pointer" onClick={() => window.open(message.attachment, "_blank")} />
          ))}
          <div className="text-xs leading-relaxed break-words min-w-0 w-full">
            <MarkdownRenderer content={message.text || ""} onOpenArtifact={onOpenArtifact} onSelectChoice={onSelectChoice} isStreaming={isStreaming} />
            {isStreaming && <span className="inline-block w-1.5 h-3.5 ml-1 bg-accent animate-pulse align-middle" />}
          </div>
        </div>
        <div className="flex items-center gap-1 pt-1 opacity-0 group-hover:opacity-100 transition-opacity text-text-muted">
          <button type="button" onClick={() => onRegenerate && onRegenerate()} disabled={isStreaming} className="p-1 rounded hover:text-text-primary hover:bg-surface-card transition-colors cursor-pointer disabled:opacity-40" title="Regenerate response" aria-label="Regenerate response">
            <ArrowClockwise size={13} />
          </button>
          {onSpeak && (
            <button type="button" onClick={() => onSpeak(message.id || message._id, message.text)} disabled={isStreaming} className={`p-1 rounded hover:text-text-primary hover:bg-surface-card transition-colors cursor-pointer disabled:opacity-40 ${isSpeakingThisMessage ? "text-accent animate-pulse" : ""}`} title={isSpeakingThisMessage ? "Stop reading" : "Read aloud"} aria-label={isSpeakingThisMessage ? "Stop reading" : "Read aloud"}>
              {isSpeakingThisMessage ? <Stop size={13} weight="fill" /> : <SpeakerHigh size={13} />}
            </button>
          )}
          <button type="button" onClick={handleCopy} className="p-1 rounded hover:text-text-primary hover:bg-surface-card transition-colors cursor-pointer" title={copied ? "Copied" : "Copy text"} aria-label="Copy text">
            {copied ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
          </button>
        </div>
      </div>
    </div>
  );
}

export default MessageBubble;
