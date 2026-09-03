import { DownloadSimple, X, PencilSimple, Check, ArrowCounterClockwise, ArrowSquareOut, FilePdf, FileCsv, FileXls, FileText, TreeStructure, Code, Play, Desktop, DeviceTablet, DeviceMobile, ArrowsClockwise } from "@phosphor-icons/react";

export function ArtifactHeader({
  artifact, ext, isMermaid, isCodeArtifact, isEditable,
  activeTab, setActiveTab, viewport, setViewport, onReload,
  isEditing, setIsEditing, isLoadingContent, onFetchRaw, onSave,
  onDownload, onClose, modifiedUrl
}) {
  const getIcon = () => {
    if (isMermaid) return <TreeStructure size={16} weight="fill" className="text-purple-400" />;
    if (isCodeArtifact) return <Code size={16} weight="fill" className="text-indigo-400" />;
    if (ext === "pdf") return <FilePdf size={16} weight="fill" className="text-rose-500" />;
    if (ext === "csv") return <FileCsv size={16} weight="fill" className="text-emerald-500" />;
    if (ext === "xlsx" || ext === "xls") return <FileXls size={16} weight="fill" className="text-green-500" />;
    return <FileText size={16} weight="fill" className="text-blue-500" />;
  };

  return (
    <div className="h-12 px-3 sm:px-4 border-b border-border bg-surface flex items-center justify-between shrink-0 gap-2">
      <div className="flex items-center gap-2 min-w-0">
        <div className="p-1 rounded bg-surface-card border border-border shrink-0">{getIcon()}</div>
        <span className="text-xs font-semibold text-text-primary truncate">
          {isMermaid ? "Mermaid Diagram" : (isCodeArtifact ? `Web Sandbox (.${ext})` : `Document (.${ext})`)}
        </span>
        {isCodeArtifact && (
          <div className="flex items-center bg-zinc-900 rounded-lg p-0.5 border border-zinc-800 ml-1">
            <button
              type="button"
              onClick={() => setActiveTab("preview")}
              className={`flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                activeTab === "preview" ? "bg-accent text-white" : "text-text-muted hover:text-text-primary"
              }`}
            >
              <Play size={10} weight="fill" />
              <span>Preview</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("code")}
              className={`flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                activeTab === "code" ? "bg-accent text-white" : "text-text-muted hover:text-text-primary"
              }`}
            >
              <Code size={11} />
              <span>Source Code</span>
            </button>
          </div>
        )}
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        {isCodeArtifact && activeTab === "preview" && (
          <div className="hidden sm:flex items-center bg-zinc-900 rounded-lg p-0.5 border border-zinc-800 mr-1">
            <button
              type="button"
              onClick={() => setViewport("desktop")}
              className={`p-1 rounded text-xs transition-colors cursor-pointer ${viewport === "desktop" ? "bg-zinc-800 text-white" : "text-zinc-400 hover:text-white"}`}
              title="Desktop (100%)"
            >
              <Desktop size={13} />
            </button>
            <button
              type="button"
              onClick={() => setViewport("tablet")}
              className={`p-1 rounded text-xs transition-colors cursor-pointer ${viewport === "tablet" ? "bg-zinc-800 text-white" : "text-zinc-400 hover:text-white"}`}
              title="Tablet (768px)"
            >
              <DeviceTablet size={13} />
            </button>
            <button
              type="button"
              onClick={() => setViewport("mobile")}
              className={`p-1 rounded text-xs transition-colors cursor-pointer ${viewport === "mobile" ? "bg-zinc-800 text-white" : "text-zinc-400 hover:text-white"}`}
              title="Mobile (375px)"
            >
              <DeviceMobile size={13} />
            </button>
            <button
              type="button"
              onClick={onReload}
              className="p-1 rounded text-xs text-zinc-400 hover:text-white transition-colors cursor-pointer border-l border-zinc-800 ml-0.5 pl-1.5"
              title="Reload Sandbox"
            >
              <ArrowsClockwise size={13} />
            </button>
          </div>
        )}

        {isEditable && (
          isEditing ? (
            <>
              <button type="button" onClick={() => setIsEditing(false)} className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-surface-elevated hover:bg-surface border border-border text-xs text-text-primary transition-colors cursor-pointer">
                <ArrowCounterClockwise size={13} /><span>Cancel</span>
              </button>
              <button type="button" onClick={onSave} className="flex items-center gap-1 px-3 py-1 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium transition-colors cursor-pointer">
                <Check size={13} weight="bold" /><span>Save</span>
              </button>
            </>
          ) : (
            <button type="button" onClick={onFetchRaw} disabled={isLoadingContent} className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-surface-elevated hover:bg-surface border border-border text-xs text-text-primary transition-colors cursor-pointer disabled:opacity-50">
              <PencilSimple size={13} /><span>{isLoadingContent ? "Loading..." : "Edit"}</span>
            </button>
          )
        )}
        <button type="button" onClick={onDownload} className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-accent hover:bg-accent-hover text-white text-xs font-medium transition-colors cursor-pointer" title="Download Artifact">
          <DownloadSimple size={13} weight="bold" /><span>Download</span>
        </button>
        {!isMermaid && !isCodeArtifact && artifact?.url && (
          <button type="button" onClick={() => window.open(modifiedUrl || artifact.url, "_blank")} className="p-1 rounded-md text-text-muted hover:text-text-primary hover:bg-surface transition-colors cursor-pointer" title="Open in new window">
            <ArrowSquareOut size={16} />
          </button>
        )}
        <button
          type="button"
          onClick={onClose}
          className="flex items-center gap-1 px-2 py-1 rounded-md bg-surface-card hover:bg-rose-500/20 hover:text-rose-400 border border-border hover:border-rose-500/40 text-xs text-text-muted hover:text-text-primary transition-colors cursor-pointer shrink-0 ml-1 font-medium"
          title="Close Panel (Esc)"
          aria-label="Close document preview"
        >
          <X size={14} weight="bold" />
          <span className="hidden sm:inline">Close</span>
        </button>
      </div>
    </div>
  );
}

export default ArtifactHeader;
