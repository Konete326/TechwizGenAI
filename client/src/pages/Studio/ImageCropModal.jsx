import { useState, useRef } from "react";
import { createPortal } from "react-dom";
import ReactCrop from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";
import { X, Crop, Check } from "@phosphor-icons/react";
import { useToast } from "@/context/ToastContext";
import { VITE_API_URL } from "@/config/env";
import { Loader } from "@/components/ui/Loader";

export function ImageCropModal({ isOpen, imageSrc, onClose, onSuccess }) {
  const [crop, setCrop] = useState({ unit: "%", width: 80, height: 80, x: 10, y: 10 });
  const [completedCrop, setCompletedCrop] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const imgRef = useRef(null);
  const toast = useToast();

  if (!isOpen || !imageSrc) return null;

  const handleApply = async () => {
    if (!imgRef.current) return;
    const image = imgRef.current;
    const canvas = document.createElement("canvas");
    const cropToUse = completedCrop || { width: image.width, height: image.height, x: 0, y: 0 };
    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;
    const pixelWidth = Math.max(1, Math.floor(cropToUse.width * scaleX));
    const pixelHeight = Math.max(1, Math.floor(cropToUse.height * scaleY));

    canvas.width = pixelWidth;
    canvas.height = pixelHeight;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(
      image,
      cropToUse.x * scaleX,
      cropToUse.y * scaleY,
      cropToUse.width * scaleX,
      cropToUse.height * scaleY,
      0,
      0,
      pixelWidth,
      pixelHeight
    );

    canvas.toBlob(async (blob) => {
      if (!blob) return;
      setIsUploading(true);
      try {
        const token = localStorage.getItem("token");
        const formData = new FormData();
        formData.append("file", blob, "chat-upload.jpg");
        const res = await fetch(`${VITE_API_URL}/assets`, {
          method: "POST",
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          body: formData
        });
        const data = await res.json();
        if (data.success && data.data?.url) {
          window.dispatchEvent(new CustomEvent("asset_uploaded", { detail: data.data }));
          onSuccess(data.data.url, data.data);
        } else {
          toast.error("Failed to upload image to assets");
        }
      } catch {
        toast.error("Image upload failed");
      } finally {
        setIsUploading(false);
      }
    }, "image/jpeg", 0.95);
  };

  const modalContent = (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 animate-in fade-in-50 duration-150 select-none"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isUploading) onClose();
      }}
    >
      <div className="w-full max-w-lg rounded-xl border border-border bg-surface-card p-5 shadow-2xl relative flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between pb-3 border-b border-border">
          <div className="flex items-center gap-2 text-sm font-semibold text-text-primary">
            <Crop size={18} className="text-accent" />
            <span>Crop Attachment</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isUploading}
            className="p-1 rounded text-text-muted hover:text-text-primary hover:bg-surface transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        <div className="my-4 flex-1 overflow-auto flex items-center justify-center bg-black/40 rounded-lg p-2 min-h-[220px]">
          <ReactCrop
            crop={crop}
            onChange={(c) => setCrop(c)}
            onComplete={(c) => setCompletedCrop(c)}
            className="max-h-[55vh]"
          >
            <img
              ref={imgRef}
              src={imageSrc}
              alt="Crop target"
              className="max-h-[55vh] object-contain rounded"
            />
          </ReactCrop>
        </div>

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
          <button
            type="button"
            onClick={onClose}
            disabled={isUploading}
            className="px-3 py-1.5 text-xs rounded-md bg-surface hover:bg-surface-elevated text-text-muted hover:text-text-primary transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleApply}
            disabled={isUploading}
            className="px-4 py-1.5 text-xs rounded-md bg-accent hover:bg-accent-hover text-white font-medium flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
          >
            {isUploading ? (
              <>
                <Loader size={13} className="text-white" />
                <span>Uploading to Assets...</span>
              </>
            ) : (
              <>
                <Check size={14} weight="bold" />
                <span>Apply & Attach</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );

  return typeof document !== "undefined" ? createPortal(modalContent, document.body) : modalContent;
}

export default ImageCropModal;
