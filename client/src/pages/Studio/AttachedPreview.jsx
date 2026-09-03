import { X, FilePdf, FileText, FileDoc } from "@phosphor-icons/react";

function formatFileSize(bytes) {
  if (!bytes) return "0 KB";
  const kb = bytes / 1024;
  return kb >= 1024 ? `${(kb / 1024).toFixed(1)} MB` : `${Math.round(kb)} KB`;
}

export function AttachedPreview({
  attachedImage,
  onClearImage,
  attachedDocument,
  onClearDocument
}) {
  if (attachedImage) {
    return (
      <div className="relative inline-flex items-center gap-2 p-1.5 rounded-lg bg-surface border border-accent/40 shadow-sm">
        <img src={attachedImage} alt="Attachment" className="w-12 h-12 object-cover rounded-md" />
        <div className="text-[11px] font-mono text-text-muted pr-2">
          <span className="text-accent font-semibold block">Image Ready</span>
          <span>Attached to prompt</span>
        </div>
        <button
          type="button"
          onClick={onClearImage}
          className="w-5 h-5 rounded-full bg-rose-600 text-white flex items-center justify-center text-[10px] shadow cursor-pointer hover:bg-rose-500 transition-colors"
          title="Remove attachment"
          aria-label="Remove image attachment"
        >
          <X size={11} weight="bold" />
        </button>
      </div>
    );
  }

  if (attachedDocument) {
    const isPdf = attachedDocument.name?.toLowerCase().endsWith(".pdf");
    const isDoc = attachedDocument.name?.toLowerCase().endsWith(".docx") || attachedDocument.name?.toLowerCase().endsWith(".doc");
    return (
      <div className="relative inline-flex items-center gap-2.5 px-3 py-2 rounded-xl bg-surface-card border border-accent shadow-sm max-w-sm truncate">
        <div className="p-2 rounded-lg bg-surface border border-border text-accent shrink-0">
          {isPdf ? <FilePdf size={20} className="text-rose-500" /> : (isDoc ? <FileDoc size={20} className="text-blue-500" /> : <FileText size={20} className="text-sky-500" />)}
        </div>
        <div className="text-[11px] font-mono text-text-muted pr-2 truncate min-w-0">
          <span className="text-accent text-[10px] font-bold block uppercase tracking-wider">Document Ready</span>
          <span className="text-text-primary font-semibold block truncate">{attachedDocument.name}</span>
          <span className="text-[10px] text-text-muted">{formatFileSize(attachedDocument.size)}</span>
        </div>
        <button
          type="button"
          onClick={onClearDocument}
          className="w-5 h-5 rounded-full bg-surface hover:bg-rose-600 hover:text-white text-text-muted border border-border flex items-center justify-center text-[10px] transition-colors cursor-pointer shrink-0 ml-auto"
          title="Remove document"
          aria-label="Remove document attachment"
        >
          <X size={11} weight="bold" />
        </button>
      </div>
    );
  }

  return null;
}

export default AttachedPreview;
