import { X, FilePdf, FileText, FileDoc } from "@phosphor-icons/react";

function formatFileSize(bytes) {
  if (!bytes) return "0 KB";
  const kb = bytes / 1024;
  return kb >= 1024 ? `${(kb / 1024).toFixed(1)} MB` : `${Math.round(kb)} KB`;
}

export function AttachedPreview({
  attachedImages = [],
  attachedDocs = [],
  onRemoveImage,
  onRemoveDoc,
  attachedImage,
  onClearImage,
  attachedDocument,
  onClearDocument
}) {
  const images = Array.isArray(attachedImages) && attachedImages.length > 0
    ? attachedImages
    : (attachedImage ? [attachedImage] : []);
  const docs = Array.isArray(attachedDocs) && attachedDocs.length > 0
    ? attachedDocs
    : (attachedDocument ? [attachedDocument] : []);

  if (images.length === 0 && docs.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 pb-1 max-w-full">
      {images.map((imgSrc, idx) => (
        <div
          key={`img-${idx}`}
          className="relative inline-flex items-center gap-2 p-1.5 rounded-lg bg-surface border border-accent/40 shadow-sm shrink-0"
        >
          <img src={imgSrc} alt={`Attachment ${idx + 1}`} className="w-10 h-10 object-cover rounded-md" />
          <div className="text-[10px] font-mono text-text-muted pr-1">
            <span className="text-accent font-semibold block">Image {idx + 1}/3</span>
            <span>Attached</span>
          </div>
          <button
            type="button"
            onClick={() => (onRemoveImage ? onRemoveImage(idx) : onClearImage?.())}
            className="w-4 h-4 rounded-full bg-rose-600 text-white flex items-center justify-center text-[9px] shadow cursor-pointer hover:bg-rose-500 transition-colors shrink-0"
            title="Remove image"
            aria-label={`Remove image ${idx + 1}`}
          >
            <X size={10} weight="bold" />
          </button>
        </div>
      ))}

      {docs.map((doc, idx) => {
        const isPdf = doc.name?.toLowerCase().endsWith(".pdf");
        const isDoc = doc.name?.toLowerCase().endsWith(".docx") || doc.name?.toLowerCase().endsWith(".doc");
        return (
          <div
            key={`doc-${idx}`}
            className="relative inline-flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-surface-card border border-accent/50 shadow-sm max-w-[240px] truncate shrink-0"
          >
            <div className="p-1 rounded-lg bg-surface border border-border text-accent shrink-0">
              {isPdf ? <FilePdf size={16} className="text-rose-500" /> : (isDoc ? <FileDoc size={16} className="text-blue-500" /> : <FileText size={16} className="text-sky-500" />)}
            </div>
            <div className="text-[10px] font-mono text-text-muted pr-1 truncate min-w-0">
              <span className="text-accent text-[9px] font-bold block uppercase tracking-wider">Doc {idx + 1}/5</span>
              <span className="text-text-primary font-semibold block truncate">{doc.name}</span>
              <span className="text-[9px] text-text-muted">{formatFileSize(doc.size)}</span>
            </div>
            <button
              type="button"
              onClick={() => (onRemoveDoc ? onRemoveDoc(idx) : onClearDocument?.())}
              className="w-4 h-4 rounded-full bg-surface hover:bg-rose-600 hover:text-white text-text-muted border border-border flex items-center justify-center text-[9px] transition-colors cursor-pointer shrink-0 ml-auto"
              title="Remove document"
              aria-label={`Remove document ${idx + 1}`}
            >
              <X size={10} weight="bold" />
            </button>
          </div>
        );
      })}
    </div>
  );
}

export default AttachedPreview;
