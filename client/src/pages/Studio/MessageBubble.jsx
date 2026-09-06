import { useState, memo } from "react";
import {
  PencilSimple, ArrowClockwise, Copy, Check, SpeakerHigh, Stop,
  DownloadSimple, Trash
} from "@phosphor-icons/react";
import { MarkdownRenderer } from "./MarkdownRenderer";
import { DocumentBadge } from "./DocumentBadge";
import logoImg from "@/assets/logo.png";

function checkIsImage(url, type, name) {
  if (type === "image") return true;
  if (type === "document") return false;
  const str = String(url || "");
  if (str.startsWith("data:image/")) return true;
  if (str.startsWith("data:application/") || str.startsWith("data:text/")) return false;
  const ext = `${name || ""} ${str.split("?")[0]}`.toLowerCase();
  return /\.(jpe?g|png|webp|gif|svg)($|\s)/i.test(ext);
}

function checkIsDoc(url, type, name) {
  if (type === "document") return true;
  if (type === "image") return false;
  const str = String(url || "");
  if (str.startsWith("data:application/") || str.startsWith("data:text/")) return true;
  if (str.startsWith("data:image/")) return false;
  const ext = `${name || ""} ${str.split("?")[0]}`.toLowerCase();
  return /\.(pdf|docx?|txt|csv|xlsx?|json)($|\s)/i.test(ext) || (!checkIsImage(url, type, name) && Boolean(url));
}

export const MessageBubble = memo(function MessageBubble({ message, onEdit, onRegenerate, isStreaming, onOpenArtifact, onSpeak, isSpeakingThisMessage, onSelectChoice }) {
  const [copied, setCopied] = useState(false);
  const isUser = message.role === "user";
  const artifactMatch = /\[ARTIFACT:\s*([a-zA-Z0-9]+)\s*\|\s*([^\]]+)\]/i.exec(message.text || "");
  const markdownImgMatch = /!\[.*?\]\((https?:\/\/[^\s)]+)\)/i.exec(message.text || "");

  const isAttachmentDeleted = Boolean(message.attachmentDeleted || message.attachmentName?.includes("[Attachment was deleted") || message.text?.includes("[Attachment was deleted"));
  const deletedNotice = message.attachmentName?.includes("administrator") || message.text?.includes("administrator") ? "Attachment was deleted by administrator" : "Attachment was deleted";

  const isArtifact = Boolean(artifactMatch);
  const isMarkdownImg = Boolean(markdownImgMatch);
  const isDoc = !isAttachmentDeleted && (isArtifact || checkIsDoc(message.attachment, message.attachmentType, message.attachmentName));
  const isImage = !isAttachmentDeleted && (isMarkdownImg || checkIsImage(message.attachment, message.attachmentType, message.attachmentName));
  const isMedia = !isAttachmentDeleted && (isDoc || isImage);

  const downloadUrl = isAttachmentDeleted ? "" : (markdownImgMatch?.[1] || artifactMatch?.[2] || message.attachment || "");
  const downloadName = isArtifact ? `document.${artifactMatch[1].toLowerCase()}` : (isMarkdownImg ? "generated-image.jpg" : (message.attachmentName || (isDoc ? "document.pdf" : "image.png")));

  const handleCopy = () => {
    navigator.clipboard.writeText(message.text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = async (e) => {
    if (e) e.stopPropagation();
    if (!downloadUrl) return;
    try {
      if (downloadUrl.startsWith("data:") || downloadUrl.startsWith("blob:")) {
        const a = document.createElement("a");
        a.href = downloadUrl;
        a.download = downloadName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        return;
      }
      const res = await fetch(downloadUrl);
      const blob = await res.blob();
      const bUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = bUrl;
      a.download = downloadName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(bUrl);
    } catch {
      const a = document.createElement("a");
      a.href = downloadUrl;
      a.download = downloadName;
      a.target = "_blank";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  if (isUser) {
    return (
      <div className="flex w-full justify-end">
        <div className="max-w-[92%] sm:max-w-[85%] md:max-w-[80%] min-w-0 flex flex-col items-end group">
          <div className="w-full min-w-0 flex flex-col gap-2 p-3 sm:p-4 bg-accent text-white rounded-2xl rounded-tr-sm shadow-sm">
            {Array.isArray(message.images) && message.images.length > 0 ? (
              <div className="flex flex-wrap gap-2 max-w-full">
                {message.images.map((img, i) => (
                  <img key={i} src={img} alt={`Attachment ${i + 1}`} className="w-full max-w-full sm:max-w-xs max-h-60 object-contain rounded-md border border-white/20 shadow-sm cursor-pointer" onClick={() => window.open(img, "_blank")} />
                ))}
              </div>
            ) : (message.attachment && isImage ? (
              <img src={message.attachment} alt="Attachment" className="w-full max-w-full sm:max-w-xs max-h-60 object-contain rounded-md border border-white/20 shadow-sm cursor-pointer" onClick={() => window.open(message.attachment, "_blank")} />
            ) : null)}
            {Array.isArray(message.documents) && message.documents.length > 0 ? (
              <div className="flex flex-col gap-1.5 w-full">
                {message.documents.map((doc, i) => (
                  <DocumentBadge key={i} attachment={doc.data} name={doc.name} isUser={true} />
                ))}
              </div>
            ) : (message.attachment && isDoc ? (
              <DocumentBadge attachment={message.attachment} name={message.attachmentName} isUser={true} />
            ) : null)}
            {isAttachmentDeleted && (
              <div className="bg-white/10 border border-white/20 text-white text-xs px-2.5 py-1.5 rounded-lg flex items-center gap-2">
                <Trash size={14} className="shrink-0 text-rose-300" />
                <span className="font-medium">{deletedNotice}</span>
              </div>
            )}
            <div className="text-xs leading-relaxed break-words whitespace-pre-wrap">{message.text}</div>
          </div>
          <div className="flex items-center gap-1 pt-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity text-text-muted">
            <button type="button" onClick={() => onEdit && onEdit(message.id, message.text, message.attachment)} className="p-1 rounded hover:text-text-primary hover:bg-surface-card transition-colors cursor-pointer" title="Edit in input field" aria-label="Edit message">
              <PencilSimple size={13} />
            </button>
            {isMedia && downloadUrl ? (
              <button type="button" onClick={handleDownload} className="p-1 rounded hover:text-text-primary hover:bg-surface-card transition-colors cursor-pointer" title="Download attachment" aria-label="Download attachment">
                <DownloadSimple size={13} />
              </button>
            ) : (
              <button type="button" onClick={handleCopy} className="p-1 rounded hover:text-text-primary hover:bg-surface-card transition-colors cursor-pointer" title={copied ? "Copied" : "Copy text"} aria-label="Copy text">
                {copied ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex w-full justify-start">
      <div className="max-w-[96%] sm:max-w-[88%] md:max-w-[80%] min-w-0 flex flex-col items-start group">
        <div className="w-full min-w-0 flex flex-col gap-2 p-3 sm:p-4 bg-surface-card border border-border text-text-primary rounded-2xl rounded-tl-sm shadow-sm">
          <div className="flex items-center gap-1.5 text-[10px] font-mono text-text-muted">
            <img src={logoImg} alt="Techwiz GenAI" className="w-3.5 h-3.5 object-contain" />
            <span>Techwiz AI</span>
          </div>
          {isAttachmentDeleted && (
            <div className="bg-rose-500/10 border border-rose-500/25 text-rose-300 text-xs px-2.5 py-1.5 rounded-lg flex items-center gap-2">
              <Trash size={14} className="shrink-0 text-rose-400" />
              <span className="font-medium">{deletedNotice}</span>
            </div>
          )}
          {message.attachment && isDoc && (
            <DocumentBadge attachment={message.attachment} name={message.attachmentName} isUser={false} />
          )}
          {message.attachment && isImage && (
            <img src={message.attachment} alt="Attachment" className="w-full max-w-full sm:max-w-xs max-h-60 object-contain rounded-md border border-border shadow-sm cursor-pointer" onClick={() => window.open(message.attachment, "_blank")} />
          )}
          <div className="text-xs leading-relaxed break-words min-w-0 w-full overflow-hidden">
            <MarkdownRenderer content={message.text || ""} onOpenArtifact={onOpenArtifact} onSelectChoice={onSelectChoice} isStreaming={isStreaming} />
            {isStreaming && <span className="inline-block w-1.5 h-3.5 ml-1 bg-accent animate-pulse align-middle" />}
          </div>
        </div>
        <div className="flex items-center gap-1 pt-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity text-text-muted">
          <button type="button" onClick={() => onRegenerate && onRegenerate()} disabled={isStreaming} className="p-1 rounded hover:text-text-primary hover:bg-surface-card transition-colors cursor-pointer disabled:opacity-40" title="Regenerate response" aria-label="Regenerate response">
            <ArrowClockwise size={13} />
          </button>
          {!isMedia && onSpeak && (
            <button type="button" onClick={() => onSpeak(message.id || message._id, message.text)} disabled={isStreaming} className={`p-1 rounded hover:text-text-primary hover:bg-surface-card transition-colors cursor-pointer disabled:opacity-40 ${isSpeakingThisMessage ? "text-accent animate-pulse" : ""}`} title={isSpeakingThisMessage ? "Stop reading" : "Read aloud"} aria-label={isSpeakingThisMessage ? "Stop reading" : "Read aloud"}>
              {isSpeakingThisMessage ? <Stop size={13} weight="fill" /> : <SpeakerHigh size={13} />}
            </button>
          )}
          {isMedia && downloadUrl ? (
            <button type="button" onClick={handleDownload} className="p-1 rounded hover:text-text-primary hover:bg-surface-card transition-colors cursor-pointer" title="Download media" aria-label="Download media">
              <DownloadSimple size={13} />
            </button>
          ) : (
            <button type="button" onClick={handleCopy} className="p-1 rounded hover:text-text-primary hover:bg-surface-card transition-colors cursor-pointer" title={copied ? "Copied" : "Copy text"} aria-label="Copy text">
              {copied ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
            </button>
          )}
        </div>
      </div>
    </div>
  );
});

export default MessageBubble;
