import { useState, useRef, useEffect } from "react";
import { UploadSimple, X, Check, WarningCircle } from "@phosphor-icons/react";
import { VITE_API_URL } from "@/config/env";
import { sanitizeText } from "@/utils/validators";
import { Loader } from "@/components/ui/Loader";
import { useToast } from "@/context/ToastContext";

export function AssetUploader({ isOpen, onClose, onUploadSuccess }) {
  const [file, setFile] = useState(null);
  const [title, setTitle] = useState("");
  const [preview, setPreview] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef(null);
  const toast = useToast();

  const resetForm = () => {
    setFile(null);
    setTitle("");
    setPreview(null);
    setError("");
    setIsDragging(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  useEffect(() => {
    if (isOpen) {
      resetForm();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleClose = () => {
    if (uploading) return;
    resetForm();
    onClose();
  };

  const validateAndSetFile = (selectedFile) => {
    setError("");
    if (!selectedFile) return;
    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedTypes.includes(selectedFile.type)) {
      setError("Only JPEG, PNG, and WebP images are supported.");
      return;
    }
    if (selectedFile.size > 5 * 1024 * 1024) {
      setError("File size exceeds 5MB limit.");
      return;
    }
    setFile(selectedFile);
    if (!title) setTitle(selectedFile.name.replace(/\.[^/.]+$/, ""));
    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target.result);
    reader.readAsDataURL(selectedFile);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files?.[0]) validateAndSetFile(e.dataTransfer.files[0]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const cleanTitle = sanitizeText(title).trim();
    if (!file || !cleanTitle) {
      setError("Please provide a valid image and title.");
      return;
    }
    setUploading(true);
    setError("");
    try {
      const token = localStorage.getItem("token");
      const formData = new FormData();
      formData.append("file", file);
      formData.append("title", cleanTitle);
      const res = await fetch(`${VITE_API_URL}/assets/upload`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const result = await res.json();
      if (!res.ok || !result.success) throw new Error(result.message || "Upload failed");
      onUploadSuccess(result.data);
      toast.success("Asset Uploaded Successfully");
      resetForm();
      onClose();
    } catch (err) {
      setError(err.message || "Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-surface-card border border-border rounded-[var(--radius-md)] p-6 shadow-2xl space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-border">
          <div className="flex items-center gap-2">
            <UploadSimple size={18} className="text-accent" />
            <h3 className="text-sm font-semibold text-text-primary">Upload Media Asset</h3>
          </div>
          <button type="button" onClick={handleClose} disabled={uploading} className="p-1 rounded text-text-muted hover:text-text-primary cursor-pointer">
            <X size={16} />
          </button>
        </div>

        {error && (
          <div className="p-2.5 rounded-[var(--radius-sm)] bg-rose-950/40 border border-rose-800/50 text-rose-300 text-xs flex items-center gap-2">
            <WarningCircle size={14} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div
            onDrop={handleDrop}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-[var(--radius-md)] p-6 text-center cursor-pointer transition-colors ${
              isDragging ? "border-accent bg-accent/10" : file ? "border-emerald-500/50 bg-emerald-500/5" : "border-border hover:border-accent/50 bg-surface/40"
            }`}
          >
            <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => validateAndSetFile(e.target.files?.[0])} className="hidden" />
            {preview ? (
              <div className="flex flex-col items-center gap-1.5">
                <img src={preview} alt="Upload preview" className="w-28 h-20 object-cover rounded border border-border" />
                <span className="text-xs text-emerald-400 font-medium flex items-center gap-1"><Check size={12} /> {file?.name}</span>
              </div>
            ) : (
              <div className="space-y-1.5">
                <UploadSimple size={24} className="mx-auto text-text-muted" />
                <p className="text-xs text-text-primary font-medium">Click or drag image here</p>
                <p className="text-[11px] text-text-muted">JPEG, PNG, WebP up to 5MB</p>
              </div>
            )}
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-text-muted">Asset Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Concept Art"
              maxLength={100}
              required
              className="w-full h-8 px-3 text-xs bg-surface border border-border rounded-[var(--radius-sm)] text-text-primary focus:outline-none focus:border-accent"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
            <button type="button" onClick={handleClose} disabled={uploading} className="px-3 py-1.5 rounded border border-border text-xs text-text-muted hover:text-text-primary cursor-pointer">
              Cancel
            </button>
            <button
              type="submit"
              disabled={uploading || !file || !title.trim()}
              className="px-4 py-1.5 rounded bg-accent hover:bg-accent-hover disabled:opacity-40 text-white text-xs font-semibold shadow-sm transition-colors flex items-center gap-1.5 cursor-pointer disabled:cursor-not-allowed"
            >
              {uploading ? (
                <>
                  <Loader size={13} className="text-white" />
                  <span>Uploading...</span>
                </>
              ) : (
                "Upload to Cloud"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default AssetUploader;
