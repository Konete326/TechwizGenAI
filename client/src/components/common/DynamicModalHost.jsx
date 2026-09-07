import { useState, useEffect, useRef } from "react";
import { X, UploadSimple, FileText, CheckCircle, SignOut } from "@phosphor-icons/react";
import { VITE_API_URL } from "@/config/env";
import { Loader } from "@/components/ui/Loader";

export function DynamicModalHost() {
  const [isOpen, setIsOpen] = useState(false), [activeType, setActiveType] = useState("upload_asset");
  const [title, setTitle] = useState("Dynamic Action"), [content, setContent] = useState("");
  const [inputPlaceholder, setInputPlaceholder] = useState(""), [inputVal, setInputVal] = useState("");
  const [copied, setCopied] = useState(false), [file, setFile] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false), [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState(""), fileInputRef = useRef(null);

  useEffect(() => {
    const handleToolCall = (e) => {
      const detail = e?.detail || {};
      if (detail.name === "closeModal") {
        setIsOpen(false); setFile(null); setError(""); setIsSuccess(false); setIsSubmitting(false);
        return;
      }
      if (detail.name !== "openDynamicModal") return;
      const args = detail.args || detail;
      const mType = args.modalType || "upload_asset";
      setActiveType(mType);
      setTitle(args.title || (mType === "logout_confirm" ? "Confirm Logout" : mType === "translation" ? "Translation" : mType === "input_prompt" ? "Input Prompt" : mType === "text_note" ? "Note" : "Upload Asset"));
      setContent(args.content || (mType === "logout_confirm" ? "Logging out will immediately disconnect Nesa and end your active voice session." : ""));
      setInputPlaceholder(args.inputPlaceholder || "Type your response...");
      setInputVal(""); setCopied(false); setFile(null); setError(""); setIsSuccess(false); setIsSubmitting(false); setIsOpen(true);
    };
    window.addEventListener("nesa:toolcall", handleToolCall);
    return () => window.removeEventListener("nesa:toolcall", handleToolCall);
  }, []);

  const close = () => {
    if (isSubmitting) return;
    setIsOpen(false); setFile(null); setError(""); setIsSuccess(false); setCopied(false); setInputVal("");
  };

  const handleFileDrop = (e) => {
    e.preventDefault();
    if (e.dataTransfer?.files?.[0]) setFile(e.dataTransfer.files[0]);
  };

  const handleUpload = async () => {
    if (!file) { setError("Please select a file to upload"); return; }
    const token = localStorage.getItem("token");
    if (!token) { setError("Authentication token not found"); return; }
    setIsSubmitting(true); setError("");
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(`${VITE_API_URL}/assets`, { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: formData });
      const data = await res.json();
      if (res.ok && data.success) {
        setIsSuccess(true);
        window.dispatchEvent(new CustomEvent("asset:uploaded", { detail: data.data }));
        window.dispatchEvent(new CustomEvent("storage_updated"));
        setTimeout(() => close(), 1200);
      } else setError(data.message || "Failed to upload asset");
    } catch {
      setError("Network error while uploading asset");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;
  const formatSize = (b) => {
    if (!b) return "0 B";
    const k = 1024, s = ["B", "KB", "MB", "GB"], i = Math.floor(Math.log(b) / Math.log(k));
    return `${(b / Math.pow(k, i)).toFixed(1)} ${s[i]}`;
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={close}>
      <div className="bg-surface-card border border-border rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
        <div className="p-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${activeType === "logout_confirm" ? "bg-rose-500/15 border border-rose-500/30 text-rose-500" : "bg-accent/15 border border-accent/30 text-accent"}`}>
              {activeType === "upload_asset" ? <UploadSimple size={16} weight="bold" /> : activeType === "logout_confirm" ? <SignOut size={16} weight="bold" /> : <FileText size={16} weight="bold" />}
            </div>
            <div>
              <h3 className="text-sm font-semibold text-text-primary">{title}</h3>
              <p className="text-[11px] text-text-muted">Nesa Dynamic Runtime Modal</p>
            </div>
          </div>
          <button type="button" onClick={close} className="p-1 rounded-md text-text-muted hover:text-text-primary hover:bg-surface transition-colors cursor-pointer" title="Close" aria-label="Close modal">
            <X size={16} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {error && <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs">{error}</div>}

          {activeType === "logout_confirm" ? (
            <div className="space-y-4">
              <p className="text-xs text-text-muted leading-relaxed">
                {content || "Logging out will immediately disconnect Nesa and end your active voice session."}
              </p>
              <div className="flex items-center justify-end gap-2 pt-1">
                <button type="button" onClick={close} className="px-3.5 py-1.5 rounded-lg border border-border text-xs text-text-muted hover:text-text-primary transition-colors cursor-pointer">
                  Cancel
                </button>
                <button type="button" onClick={() => { window.dispatchEvent(new CustomEvent("auth:logout")); close(); }} className="px-4 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold shadow-sm transition-colors cursor-pointer">
                  Yes, Log Out
                </button>
              </div>
            </div>
          ) : (activeType === "text_note" || activeType === "translation") ? (
            <div className="space-y-4">
              <div className="p-3.5 rounded-xl bg-surface/50 border border-border text-xs text-text-primary leading-relaxed whitespace-pre-wrap max-h-60 overflow-y-auto">
                {content || "No details provided."}
              </div>
              <div className="flex items-center justify-end gap-2 pt-1">
                <button type="button" onClick={() => { if (content) { navigator.clipboard?.writeText(content); setCopied(true); setTimeout(() => setCopied(false), 1500); } }} className="px-3.5 py-1.5 rounded-lg border border-border text-xs text-text-muted hover:text-text-primary transition-colors cursor-pointer">
                  {copied ? "Copied" : "Copy Text"}
                </button>
                <button type="button" onClick={close} className="px-4 py-1.5 rounded-lg bg-accent hover:bg-accent-hover text-white text-xs font-semibold shadow-sm transition-colors cursor-pointer">Understood</button>
              </div>
            </div>
          ) : activeType === "input_prompt" ? (
            <form onSubmit={(e) => { e.preventDefault(); if (!inputVal.trim()) return; window.dispatchEvent(new CustomEvent("nesa:modal:submit", { detail: { value: inputVal, title } })); close(); }} className="space-y-4">
              {content && <p className="text-xs text-text-muted leading-relaxed">{content}</p>}
              <input type="text" value={inputVal} onChange={(e) => setInputVal(e.target.value)} placeholder={inputPlaceholder} autoFocus className="w-full px-3 py-2 rounded-lg bg-surface border border-border focus:border-accent outline-none text-xs text-text-primary" />
              <div className="flex items-center justify-end gap-2 pt-1">
                <button type="button" onClick={close} className="px-3.5 py-1.5 rounded-lg border border-border text-xs text-text-muted hover:text-text-primary transition-colors cursor-pointer">Cancel</button>
                <button type="submit" disabled={!inputVal.trim()} className="px-4 py-1.5 rounded-lg bg-accent hover:bg-accent-hover text-white text-xs font-semibold shadow-sm transition-colors cursor-pointer disabled:opacity-50">Submit</button>
              </div>
            </form>
          ) : isSuccess ? (
            <div className="py-6 flex flex-col items-center justify-center gap-2 text-center">
              <CheckCircle size={36} className="text-emerald-500 animate-bounce" weight="fill" />
              <p className="text-sm font-semibold text-text-primary">Asset Uploaded Successfully</p>
              <p className="text-xs text-text-muted">Closing dialog...</p>
            </div>
          ) : (
            <>
              <div onDragOver={(e) => e.preventDefault()} onDrop={handleFileDrop} onClick={() => fileInputRef.current?.click()} className="border-2 border-dashed border-border hover:border-accent rounded-xl p-6 flex flex-col items-center justify-center gap-2 text-center cursor-pointer transition-colors bg-surface/30 hover:bg-surface/60">
                <input ref={fileInputRef} type="file" accept="image/*,.pdf,.docx,.txt,.csv" className="hidden" onChange={(e) => { if (e.target.files?.[0]) setFile(e.target.files[0]); }} />
                <div className="w-10 h-10 rounded-full bg-surface border border-border flex items-center justify-center text-text-muted"><UploadSimple size={20} /></div>
                <div><p className="text-xs font-medium text-text-primary">Drag and drop or browse files</p><p className="text-[11px] text-text-muted mt-0.5">Images, PDF, DOCX, CSV, TXT up to 10MB</p></div>
              </div>
              {file && (
                <div className="flex items-center justify-between p-2.5 rounded-lg bg-surface border border-border text-xs">
                  <div className="flex items-center gap-2 min-w-0 flex-1 mr-2"><FileText size={16} className="text-accent shrink-0" /><span className="truncate text-text-primary font-medium">{file.name}</span><span className="px-1.5 py-0.5 rounded bg-surface-card border border-border text-[10px] text-text-muted font-mono shrink-0">{formatSize(file.size)}</span></div>
                  <button type="button" onClick={() => setFile(null)} className="p-1 text-text-muted hover:text-rose-400 transition-colors cursor-pointer" title="Remove file" aria-label="Remove file"><X size={14} /></button>
                </div>
              )}
              <div className="flex items-center justify-end gap-2 pt-2">
                <button type="button" onClick={close} disabled={isSubmitting} className="px-3.5 py-1.5 rounded-lg border border-border text-xs text-text-muted hover:text-text-primary transition-colors cursor-pointer">Cancel</button>
                <button type="button" onClick={handleUpload} disabled={!file || isSubmitting} className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-accent hover:bg-accent-hover text-white text-xs font-semibold shadow-sm transition-colors cursor-pointer disabled:opacity-50">
                  {isSubmitting && <Loader size={12} className="text-white" />}<span>{isSubmitting ? "Uploading..." : "Upload Now"}</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default DynamicModalHost;
