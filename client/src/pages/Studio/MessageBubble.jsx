import { useState, memo } from "react";
import { PencilSimple, ArrowClockwise, Copy, Check, SpeakerHigh, DownloadSimple, Trash, ThumbsUp, ThumbsDown, User } from "@phosphor-icons/react";
import { MarkdownRenderer } from "./MarkdownRenderer";
import { DocumentBadge } from "./DocumentBadge";
import logoImg from "@/assets/logo.png";
import { ProviderIcon, MODEL_TIERS } from "./ModelSelector";
import { getConvertedImageUrl, isCloudinaryUrl } from "@/utils/cloudinaryUtils";

function checkIsImage(url, type, name) {
  if (type === "image") return true;
  if (type === "document" || String(url || "").startsWith("data:application/") || String(url || "").startsWith("data:text/")) return false;
  return String(url || "").startsWith("data:image/") || /\.(jpe?g|png|webp|gif|svg)($|\s)/i.test(`${name || ""} ${String(url || "").split("?")[0]}`.toLowerCase());
}

function checkIsDoc(url, type, name) {
  if (type === "document" || String(url || "").startsWith("data:application/") || String(url || "").startsWith("data:text/")) return true;
  if (type === "image" || String(url || "").startsWith("data:image/")) return false;
  return /\.(pdf|docx?|txt|csv|xlsx?|json)($|\s)/i.test(`${name || ""} ${String(url || "").split("?")[0]}`.toLowerCase()) || (!checkIsImage(url, type, name) && Boolean(url));
}

export const MessageBubble = memo(function MessageBubble({
  message,
  onEdit,
  onRegenerate,
  isStreaming,
  onOpenArtifact,
  onSpeak,
  isSpeakingThisMessage,
  onSelectChoice,
  selectedModel
}) {
  const [copied, setCopied] = useState(false);
  const [feedback, setFeedback] = useState(null); // "up" | "down" | null

  const isUser = message.role === "user";
  const artifactMatch = /\[ARTIFACT:\s*([a-zA-Z0-9]+)\s*\|\s*([^\]]+)\]/i.exec(message.text || "");
  const markdownImgMatch = /!\[.*?\]\(([^\s)]+)\)/i.exec(message.text || "");

  const isAttachmentDeleted = Boolean(
    message.attachmentDeleted ||
    message.attachmentName?.includes("[Attachment was deleted") ||
    message.text?.includes("[Attachment was deleted")
  );
  const deletedNotice =
    message.attachmentName?.includes("administrator") || message.text?.includes("administrator")
      ? "Attachment was deleted by administrator"
      : "Attachment was deleted";

  const isArtifact = Boolean(artifactMatch);
  const isMarkdownImg = Boolean(markdownImgMatch);
  const isDoc = !isAttachmentDeleted && (isArtifact || checkIsDoc(message.attachment, message.attachmentType, message.attachmentName));
  const isImage = !isAttachmentDeleted && (isMarkdownImg || checkIsImage(message.attachment, message.attachmentType, message.attachmentName));
  const isMedia = !isAttachmentDeleted && (isDoc || isImage);

  const rawImgUrl = markdownImgMatch?.[1] || (checkIsImage(message.attachment, message.attachmentType, message.attachmentName) ? message.attachment : "");
  const cloudinaryImgUrl = isCloudinaryUrl(rawImgUrl) ? rawImgUrl : null;
  const downloadUrl = isAttachmentDeleted ? "" : (markdownImgMatch?.[1] || artifactMatch?.[2] || message.attachment || "");
  const downloadName = isArtifact
    ? `document.${artifactMatch[1].toLowerCase()}`
    : (isMarkdownImg ? "generated-image.jpg" : (message.attachmentName || (isDoc ? "document.pdf" : "image.png")));

  const activeModelMeta = MODEL_TIERS.find((m) => m.id === (message.model || selectedModel)) || MODEL_TIERS[0];

  const handleCopy = () => {
    navigator.clipboard.writeText(message.text || "");
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

  // ─── USER MESSAGE ────────────────────────────────────────────────────────────
  if (isUser) {
    return (
      <div className="w-full flex justify-end group py-1.5 animate-in fade-in duration-150">
        <div className="max-w-[92%] sm:max-w-[85%] md:max-w-[78%] flex flex-col items-end">
          
          <div className="p-3.5 sm:p-4 rounded-3xl rounded-tr-sm bg-accent text-white shadow-sm space-y-2">
            {/* Multi-images preview */}
            {Array.isArray(message.images) && message.images.length > 0 ? (
              <div className="flex flex-wrap gap-2 max-w-full">
                {message.images.map((img, i) => (
                  <img
                    key={i}
                    src={img}
                    alt={`Attachment ${i + 1}`}
                    className="w-full max-w-full sm:max-w-xs max-h-60 object-contain rounded-xl border border-white/20 shadow-sm cursor-pointer"
                    onClick={() => window.open(img, "_blank")}
                  />
                ))}
              </div>
            ) : (message.attachment && isImage ? (
              <img
                src={message.attachment}
                alt="Attachment"
                className="w-full max-w-full sm:max-w-xs max-h-60 object-contain rounded-xl border border-white/20 shadow-sm cursor-pointer"
                onClick={() => window.open(message.attachment, "_blank")}
              />
            ) : null)}

            {/* Document attachments */}
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

            <div className="text-xs sm:text-[13px] leading-relaxed break-words whitespace-pre-wrap">
              {message.text}
            </div>
          </div>

          {/* User Message Action Toolbar */}
          <div className="flex items-center gap-1 pt-1 opacity-0 group-hover:opacity-100 transition-opacity text-text-muted">
            <button
              type="button"
              onClick={() => onEdit && onEdit(message.id, message.text, message.attachment)}
              className="p-1 rounded-md hover:text-text-primary hover:bg-surface-card transition-colors cursor-pointer"
              title="Edit prompt"
              aria-label="Edit prompt"
            >
              <PencilSimple size={13} />
            </button>
            {isMedia && downloadUrl ? (
              <button
                type="button"
                onClick={handleDownload}
                className="p-1 rounded-md hover:text-text-primary hover:bg-surface-card transition-colors cursor-pointer"
                title="Download attachment"
              >
                <DownloadSimple size={13} />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleCopy}
                className="p-1 rounded-md hover:text-text-primary hover:bg-surface-card transition-colors cursor-pointer"
                title={copied ? "Copied" : "Copy text"}
              >
                {copied ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
              </button>
            )}
          </div>

        </div>
      </div>
    );
  }

  // ─── ASSISTANT MESSAGE (LibreChat / ChatGPT Style) ─────────────────────────────
  return (
    <div className="w-full flex justify-start group py-2 animate-in fade-in duration-200">
      <div className="w-full max-w-full flex items-start gap-3">
        
        {/* Assistant Avatar with Provider Emblem */}
        <div className="w-8 h-8 rounded-xl bg-surface-card border border-border/80 shadow-xs flex items-center justify-center shrink-0 mt-0.5">
          <ProviderIcon provider={activeModelMeta.provider} className="w-4 h-4" />
        </div>

        {/* Message Content Body */}
        <div className="flex-1 min-w-0 space-y-1.5">
          
          {/* Model Name & Timestamp Header */}
          <div className="flex items-center gap-2 text-[11px] font-mono text-text-muted">
            <span className="font-semibold text-text-primary">
              {activeModelMeta.name}
            </span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-surface border border-border/60">
              {activeModelMeta.tag}
            </span>
          </div>

          <div className="text-xs sm:text-[13px] text-text-primary leading-relaxed break-words min-w-0 w-full overflow-hidden">
            {isAttachmentDeleted && (
              <div className="bg-rose-500/10 border border-rose-500/25 text-rose-300 text-xs px-2.5 py-1.5 rounded-lg flex items-center gap-2 mb-2">
                <Trash size={14} className="shrink-0 text-rose-400" />
                <span className="font-medium">{deletedNotice}</span>
              </div>
            )}

            {message.attachment && isDoc && (
              <div className="mb-2">
                <DocumentBadge attachment={message.attachment} name={message.attachmentName} isUser={false} />
              </div>
            )}

            {message.attachment && isImage && (
              <div className="mb-2">
                <img
                  src={message.attachment}
                  alt="Attachment"
                  className="w-full max-w-full sm:max-w-md max-h-72 object-contain rounded-xl border border-border shadow-sm cursor-pointer"
                  onClick={() => window.open(message.attachment, "_blank")}
                />
              </div>
            )}

            <MarkdownRenderer
              content={message.text || ""}
              onOpenArtifact={onOpenArtifact}
              onSelectChoice={onSelectChoice}
              isStreaming={isStreaming}
            />

            {isStreaming && (
              <span className="inline-block w-2 h-4 ml-1 bg-accent animate-pulse align-middle" />
            )}
          </div>

          {/* Cloudinary Image Download Buttons */}
          {cloudinaryImgUrl && !isStreaming && (
            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border/40">
              <a
                href={getConvertedImageUrl(cloudinaryImgUrl, "png", true)}
                download="generated-image.png"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium rounded-lg bg-surface hover:bg-surface-elevated border border-border hover:border-accent text-text-primary hover:text-accent transition-colors shadow-xs"
              >
                <DownloadSimple size={12} />
                <span>Download as PNG</span>
              </a>
              <a
                href={getConvertedImageUrl(cloudinaryImgUrl, "jpg", true)}
                download="generated-image.jpg"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium rounded-lg bg-surface hover:bg-surface-elevated border border-border hover:border-accent text-text-primary hover:text-accent transition-colors shadow-xs"
              >
                <DownloadSimple size={12} />
                <span>Download as JPG</span>
              </a>
            </div>
          )}

          {/* Assistant Action Toolbar (LibreChat Style) */}
          {!isStreaming && (
            <div className="flex items-center gap-1 pt-1 opacity-80 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity text-text-muted">
              <button
                type="button"
                onClick={handleCopy}
                className="p-1.5 rounded-lg hover:text-text-primary hover:bg-surface transition-colors cursor-pointer"
                title={copied ? "Copied" : "Copy response"}
              >
                {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
              </button>

              {onRegenerate && (
                <button
                  type="button"
                  onClick={() => onRegenerate()}
                  className="p-1.5 rounded-lg hover:text-text-primary hover:bg-surface transition-colors cursor-pointer"
                  title="Regenerate response"
                >
                  <ArrowClockwise size={14} />
                </button>
              )}

              {onSpeak && !isMedia && (
                <button
                  type="button"
                  onClick={() => onSpeak(message.id || message._id, message.text)}
                  className={`p-1.5 rounded-lg hover:text-text-primary hover:bg-surface transition-colors cursor-pointer ${
                    isSpeakingThisMessage ? "text-accent animate-pulse" : ""
                  }`}
                  title={isSpeakingThisMessage ? "Stop reading aloud" : "Read aloud (TTS)"}
                >
                  <SpeakerHigh size={14} />
                </button>
              )}

              <div className="w-px h-3.5 bg-border/60 mx-1" />

              <button
                type="button"
                onClick={() => setFeedback(feedback === "up" ? null : "up")}
                className={`p-1.5 rounded-lg hover:text-text-primary hover:bg-surface transition-colors cursor-pointer ${
                  feedback === "up" ? "text-emerald-500" : ""
                }`}
                title="Good response"
              >
                <ThumbsUp size={14} weight={feedback === "up" ? "fill" : "regular"} />
              </button>

              <button
                type="button"
                onClick={() => setFeedback(feedback === "down" ? null : "down")}
                className={`p-1.5 rounded-lg hover:text-text-primary hover:bg-surface transition-colors cursor-pointer ${
                  feedback === "down" ? "text-rose-500" : ""
                }`}
                title="Bad response"
              >
                <ThumbsDown size={14} weight={feedback === "down" ? "fill" : "regular"} />
              </button>

              {isMedia && downloadUrl && (
                <button
                  type="button"
                  onClick={handleDownload}
                  className="p-1.5 rounded-lg hover:text-text-primary hover:bg-surface transition-colors cursor-pointer ml-auto"
                  title="Download media"
                >
                  <DownloadSimple size={14} />
                </button>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
});

export default MessageBubble;
