import { FilePdf, FileDoc, FileXls, FileCsv, FileText, ArrowSquareOut } from "@phosphor-icons/react";

export function getDocMeta(attachment, rawName) {
  const urlStr = String(attachment || "");
  let displayName = rawName;
  if (!displayName || displayName === "document" || displayName === "attachment") {
    if (urlStr.includes("/")) {
      const part = urlStr.split("?")[0].split("#")[0].split("/").pop();
      if (part?.includes(".")) displayName = decodeURIComponent(part);
    }
  }
  const check = `${displayName || ""} ${urlStr}`.toLowerCase();
  const isPdf = check.includes(".pdf") || urlStr.startsWith("data:application/pdf");
  const isDoc = check.includes(".docx") || check.includes(".doc") || urlStr.includes("wordprocessingml");
  const isXls = check.includes(".xlsx") || check.includes(".xls") || check.includes("spreadsheet");
  const isCsv = check.includes(".csv") || urlStr.includes("text/csv");
  if (!displayName) {
    displayName = isPdf ? "Document.pdf" : (isDoc ? "Document.docx" : (isXls ? "Spreadsheet.xlsx" : (isCsv ? "Data.csv" : "Attached Document")));
  }
  return { displayName, isPdf, isDoc, isXls, isCsv };
}

export function DocumentBadge({ attachment, name, isUser = false }) {
  const { displayName, isPdf, isDoc, isXls, isCsv } = getDocMeta(attachment, name);

  return (
    <div className={`px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-xl flex items-center gap-2 text-xs shadow-sm w-full max-w-full min-w-0 ${
      isUser ? "bg-white/15 border border-white/25 text-white" : "bg-surface-elevated/95 border border-border/80 text-text-primary"
    }`}>
      <div className={`p-1.5 rounded-lg shrink-0 ${
        isUser ? "bg-white/20 text-white" : "bg-surface border border-border"
      }`}>
        {isPdf ? (
          <FilePdf size={18} weight="fill" className={isUser ? "text-white" : "text-rose-500"} />
        ) : isDoc ? (
          <FileDoc size={18} weight="fill" className={isUser ? "text-white" : "text-blue-500"} />
        ) : isXls ? (
          <FileXls size={18} weight="fill" className={isUser ? "text-white" : "text-emerald-500"} />
        ) : isCsv ? (
          <FileCsv size={18} weight="fill" className={isUser ? "text-white" : "text-teal-500"} />
        ) : (
          <FileText size={18} weight="fill" className={isUser ? "text-white" : "text-sky-400"} />
        )}
      </div>
      <div className="min-w-0 flex-1 flex flex-col">
        <span className={`font-medium truncate ${isUser ? "text-white" : "text-text-primary"}`} title={displayName}>
          {displayName}
        </span>
        <span className={`text-[10px] uppercase font-mono ${isUser ? "text-white/70" : "text-text-muted"}`}>
          {isPdf ? "PDF Document" : isDoc ? "Word Document" : isXls ? "Excel Sheet" : isCsv ? "CSV Data" : "Document"}
        </span>
      </div>
      {attachment && (
        <a
          href={attachment}
          download={displayName}
          target="_blank"
          rel="noreferrer"
          className={`ml-auto text-[11px] font-semibold flex items-center gap-1 shrink-0 px-2 py-1 rounded-md transition-colors ${
            isUser ? "bg-white/20 hover:bg-white/30 text-white" : "bg-accent/10 hover:bg-accent/20 text-accent"
          }`}
          title="View document"
          aria-label="View document"
        >
          <span>View</span>
          <ArrowSquareOut size={12} />
        </a>
      )}
    </div>
  );
}

export default DocumentBadge;
