import { useState, useRef, useEffect } from "react";
import mermaid from "mermaid";
import { FileDoc, FileXls, DownloadSimple, ArrowSquareOut } from "@phosphor-icons/react";
import { useToast } from "@/context/ToastContext";
import { ArtifactEditor } from "./ArtifactEditor";
import { SandboxViewer } from "./SandboxViewer";
import { ArtifactHeader } from "./ArtifactHeader";
import { VITE_SERVER_URL } from "@/config/env";

const textEditable = ["csv", "tsv", "txt", "html", "htm", "json", "xml", "md", "svg", "js", "jsx", "css"];
const viewportWidths = { desktop: "100%", tablet: "768px", mobile: "375px" };

export function ArtifactPanel({ artifact, onClose }) {
  const [activeTab, setActiveTab] = useState("preview");
  const [viewport, setViewport] = useState("desktop");
  const [reloadKey, setReloadKey] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const [editableContent, setEditableContent] = useState("");
  const [modifiedUrl, setModifiedUrl] = useState(null);
  const [isLoadingContent, setIsLoadingContent] = useState(false);
  const mermaidRef = useRef(null);
  const toast = useToast();

  const isMermaid = artifact?.type === "mermaid";
  const ext = (artifact?.extension || "pdf").toLowerCase().replace(/^\./, "");
  const isCodeArtifact = artifact?.type === "code" || ["html", "svg", "js", "jsx"].includes(ext);
  const isEditable = !isMermaid && !isCodeArtifact && textEditable.includes(ext);

  useEffect(() => {
    setIsEditing(false);
    setActiveTab("preview");
    setViewport("desktop");
    setEditableContent(artifact?.content || "");
    setModifiedUrl(null);
  }, [artifact]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  useEffect(() => {
    if (!isMermaid || !artifact?.content || !mermaidRef.current) return;
    let active = true;
    const renderSvg = async () => {
      try {
        const id = "panel-mmd-" + Math.random().toString(36).substring(2, 9);
        const { svg } = await mermaid.render(id, artifact.content);
        if (!active || !mermaidRef.current) return;
        mermaidRef.current.innerHTML = svg;
        const svgEl = mermaidRef.current.querySelector("svg");
        if (svgEl) { svgEl.style.maxWidth = "100%"; svgEl.style.height = "auto"; }
      } catch {}
    };
    renderSvg();
    return () => {
      active = false;
      document.querySelectorAll('[id^="dpanel-mmd-"], [id^="dmermaid"]').forEach((el) => el.remove());
    };
  }, [isMermaid, artifact?.content]);

  const handleDownload = () => {
    if (isMermaid) {
      const svgEl = mermaidRef.current?.querySelector("svg");
      if (!svgEl) return;
      const u = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(svgEl)], { type: "image/svg+xml;charset=utf-8" }));
      const a = Object.assign(document.createElement("a"), { href: u, download: `diagram-${Date.now()}.svg` });
      document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(u);
      return;
    }
    if (isCodeArtifact) {
      const textToSave = editableContent || artifact?.content || "";
      const mime = ext === "svg" ? "image/svg+xml" : (ext === "html" ? "text/html" : "text/plain");
      const u = URL.createObjectURL(new Blob([textToSave], { type: mime }));
      const a = Object.assign(document.createElement("a"), { href: u, download: `artifact-${Date.now()}.${ext}` });
      document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(u);
      return;
    }
    const resolvedTarget = resolveDocUrl(modifiedUrl || artifact?.url);
    const a = Object.assign(document.createElement("a"), { href: resolvedTarget, download: `document.${ext}`, target: "_blank" });
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
  };

  const resolveDocUrl = (rawUrl) => {
    if (!rawUrl) return "";
    if (rawUrl.includes("cloudinary.com") && rawUrl.includes("doc_") && rawUrl.endsWith(".pdf")) {
      const match = rawUrl.match(/(doc_\d+\.pdf)/);
      if (match) return `${VITE_SERVER_URL}/uploads/documents/${match[1]}`;
    }
    return rawUrl;
  };

  const fetchRawContent = async () => {
    if (!isEditable) return;
    if (editableContent) return setIsEditing(true);
    setIsLoadingContent(true);
    try {
      const res = await fetch(resolveDocUrl(modifiedUrl || artifact?.url));
      if (!res.ok) throw new Error("Fetch failed");
      setEditableContent(await res.text());
      setIsEditing(true);
    } catch {
      toast.error("Unable to load document content for editing");
    } finally {
      setIsLoadingContent(false);
    }
  };

  const handleSave = () => {
    try {
      const mime = ext === "csv" ? "text/csv;charset=utf-8" : "text/plain;charset=utf-8";
      if (modifiedUrl) URL.revokeObjectURL(modifiedUrl);
      setModifiedUrl(URL.createObjectURL(new Blob([editableContent], { type: mime })));
      setIsEditing(false);
      toast.success("Document updated successfully");
    } catch {
      toast.error("Failed to save changes");
    }
  };

  const currentUrl = resolveDocUrl(modifiedUrl || artifact?.url);
  const isLocal = Boolean(currentUrl.includes("localhost") || currentUrl.includes("127.0.0.1"));
  const isPdf = ext === "pdf";
  const isBinaryDoc = ext === "docx" || ext === "xlsx" || ext === "xls";

  let previewSource = currentUrl;
  if (!modifiedUrl && !isPdf && isBinaryDoc && !isLocal && currentUrl) {
    previewSource = `https://docs.google.com/viewer?url=${encodeURIComponent(currentUrl)}&embedded=true`;
  }

  const headerArtifact = artifact ? { ...artifact, url: currentUrl } : artifact;

  return (
    <div className="w-full lg:w-1/2 flex-1 flex flex-col h-full min-w-0 bg-surface-card border-l border-border animate-in slide-in-from-right-8 duration-200 z-20 overflow-hidden">
      <ArtifactHeader
        artifact={headerArtifact} ext={ext} isMermaid={isMermaid}
        isCodeArtifact={isCodeArtifact} isEditable={isEditable}
        activeTab={activeTab} setActiveTab={setActiveTab}
        viewport={viewport} setViewport={setViewport}
        onReload={() => setReloadKey((k) => k + 1)}
        isEditing={isEditing} setIsEditing={setIsEditing}
        isLoadingContent={isLoadingContent} onFetchRaw={fetchRawContent}
        onSave={handleSave} onDownload={handleDownload}
        onClose={onClose} modifiedUrl={modifiedUrl}
      />

      <div className="flex-1 w-full h-full min-w-0 overflow-hidden relative bg-zinc-950">
        {isMermaid ? (
          <div className="w-full h-full p-4 overflow-auto flex items-center justify-center">
            <div ref={mermaidRef} className="w-full max-w-full flex items-center justify-center [&>svg]:max-w-full [&>svg]:h-auto" />
          </div>
        ) : isCodeArtifact ? (
          activeTab === "preview" ? (
            <SandboxViewer code={editableContent || artifact?.content || ""} viewportWidth={viewportWidths[viewport]} key={reloadKey} />
          ) : (
            <ArtifactEditor content={editableContent || artifact?.content || ""} onChange={setEditableContent} extension={ext} />
          )
        ) : isEditing ? (
          <ArtifactEditor content={editableContent} onChange={setEditableContent} extension={ext} />
        ) : isBinaryDoc && isLocal ? (
          <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center bg-surface-card space-y-4">
            <div className="p-4 rounded-2xl bg-surface border border-border shadow-md">
              {ext === "docx" ? <FileDoc size={48} className="text-blue-500" /> : <FileXls size={48} className="text-emerald-500" />}
            </div>
            <div className="space-y-1 max-w-sm">
              <h3 className="text-sm font-semibold text-text-primary">Document Generated ({ext.toUpperCase()})</h3>
              <p className="text-xs text-text-muted">Generated document is compiled and ready for download.</p>
            </div>
            <div className="flex items-center gap-2 pt-2">
              <button type="button" onClick={handleDownload} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-accent hover:bg-accent-hover text-white text-xs font-semibold shadow-sm transition-colors cursor-pointer">
                <DownloadSimple size={15} weight="bold" /><span>Download {ext.toUpperCase()}</span>
              </button>
              <a href={currentUrl} target="_blank" rel="noreferrer" className="flex items-center gap-2 px-4 py-2 rounded-lg bg-surface hover:bg-surface-elevated border border-border text-xs text-text-primary font-medium transition-colors">
                <ArrowSquareOut size={15} /><span>Open File</span>
              </a>
            </div>
          </div>
        ) : (
          <iframe src={previewSource} title={`Artifact Preview ${ext}`} className="w-full h-full border-none bg-white" />
        )}
      </div>
    </div>
  );
}

export default ArtifactPanel;
