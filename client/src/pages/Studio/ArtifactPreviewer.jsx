import {
  FilePdf,
  FileCsv,
  FileXls,
  FileText,
  DownloadSimple,
  Eye,
  ArrowSquareOut
} from "@phosphor-icons/react";
import { resolveDocumentUrl } from "@/utils/resolveDocumentUrl";

export function ArtifactPreviewer({ extension = "pdf", url, onOpenArtifact }) {
  const ext = (extension || "pdf").toLowerCase().replace(/^\./, "");
  const resolvedUrl = resolveDocumentUrl(url);

  const getIconInfo = () => {
    switch (ext) {
      case "pdf":
        return { Icon: FilePdf, color: "text-rose-500 bg-rose-500/10 border-rose-500/20" };
      case "csv":
        return { Icon: FileCsv, color: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20" };
      case "xlsx":
      case "xls":
        return { Icon: FileXls, color: "text-green-500 bg-green-500/10 border-green-500/20" };
      case "docx":
      case "doc":
        return { Icon: FileText, color: "text-blue-500 bg-blue-500/10 border-blue-500/20" };
      default:
        return { Icon: FileText, color: "text-purple-500 bg-purple-500/10 border-purple-500/20" };
    }
  };

  const { Icon, color } = getIconInfo();

  const handleDownload = () => {
    if (resolvedUrl.startsWith("data:") || resolvedUrl.startsWith("blob:")) {
      const a = document.createElement("a");
      a.href = resolvedUrl;
      a.download = `document_${Date.now()}.${ext}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      return;
    }
    const a = document.createElement("a");
    a.href = resolvedUrl;
    a.download = `document.${ext}`;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleOpenWindow = () => {
    if (resolvedUrl.startsWith("data:")) {
      try {
        const byteCharacters = atob(resolvedUrl.split(",")[1]);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) byteNumbers[i] = byteCharacters.charCodeAt(i);
        const mime = resolvedUrl.split(";")[0].replace("data:", "") || "application/pdf";
        const blob = new Blob([new Uint8Array(byteNumbers)], { type: mime });
        const bUrl = URL.createObjectURL(blob);
        window.open(bUrl, "_blank");
        return;
      } catch {}
    }
    window.open(resolvedUrl, "_blank");
  };

  const handlePreview = () => {
    if (onOpenArtifact) {
      onOpenArtifact({ type: "document", extension: ext, url: resolvedUrl });
    } else {
      handleOpenWindow();
    }
  };

  return (
    <div className="my-3 w-full max-w-full sm:max-w-md rounded-xl border border-border bg-surface-card/95 p-3 sm:p-3.5 shadow-sm transition-all hover:border-accent/40">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3">
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          <div className={`p-2 sm:p-2.5 rounded-lg border shrink-0 ${color}`}>
            <Icon size={22} weight="fill" />
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="text-xs font-semibold text-text-primary truncate">
              Generated Document (.{ext})
            </h4>
            <p className="text-[11px] text-text-muted font-mono truncate">
              Ready for viewing & download
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0 flex-wrap sm:flex-nowrap pt-1 sm:pt-0">
          <button
            type="button"
            onClick={handlePreview}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-surface hover:bg-surface-elevated border border-border text-xs font-medium text-text-primary transition-colors cursor-pointer"
            title="Preview document"
          >
            <Eye size={13} weight="bold" />
            <span>Preview</span>
          </button>
          <button
            type="button"
            onClick={handleDownload}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-accent hover:bg-accent-hover text-xs font-medium text-white transition-colors cursor-pointer"
            title="Download document"
          >
            <DownloadSimple size={13} weight="bold" />
            <span>Download</span>
          </button>
          <button
            type="button"
            onClick={handleOpenWindow}
            className="p-1.5 rounded-md bg-surface hover:bg-surface-elevated border border-border text-xs text-text-muted hover:text-text-primary transition-colors cursor-pointer"
            title="Open in new window"
            aria-label="Open document in new window"
          >
            <ArrowSquareOut size={13} />
          </button>
        </div>
      </div>
    </div>
  );
}

export default ArtifactPreviewer;
