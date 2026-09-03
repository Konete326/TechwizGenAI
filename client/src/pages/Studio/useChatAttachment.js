import { useState } from "react";
import { useToast } from "@/context/ToastContext";
import { VITE_API_URL } from "@/config/env";

async function uploadDocToAssets(file) {
  try {
    const token = localStorage.getItem("token");
    if (!token) return;
    const fd = new FormData();
    fd.append("file", file);
    fd.append("title", file.name);
    await fetch(`${VITE_API_URL}/assets`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: fd
    });
  } catch {}
}

export function useChatAttachment({ setAttachedImage, selectedModel }) {
  const toast = useToast();
  const [pendingImageSrc, setPendingImageSrc] = useState(null);
  const [isCropOpen, setIsCropOpen] = useState(false);
  const [attachedDoc, setAttachedDoc] = useState(null);

  const handleAttachmentClick = (fileInputRef) => {
    if (selectedModel === "gemini-1.5-flash-8b") {
      toast.error("This model does not support attachments. Please select a superior model.");
      return;
    }
    fileInputRef.current?.click();
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Attachment must be under 10 MB");
      return;
    }
    const isImage = file.type.startsWith("image/") || /\.(jpe?g|png|webp|gif|svg)$/i.test(file.name);
    if (isImage) {
      const reader = new FileReader();
      reader.onload = () => { setPendingImageSrc(reader.result); setIsCropOpen(true); };
      reader.readAsDataURL(file);
    } else {
      const reader = new FileReader();
      reader.onload = () => {
        const fallbackType = file.name.endsWith(".pdf") ? "application/pdf" : (file.name.endsWith(".txt") ? "text/plain" : "application/octet-stream");
        setAttachedDoc({ data: reader.result, name: file.name, type: file.type || fallbackType, size: file.size });
        setAttachedImage(null);
        toast.success("Document attached: " + file.name);
        uploadDocToAssets(file);
      };
      reader.readAsDataURL(file);
    }
    e.target.value = "";
  };

  const handlePaste = (e) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of items) {
      if (item.type.startsWith("image/")) {
        const file = item.getAsFile();
        if (file) {
          if (file.size > 5 * 1024 * 1024) return toast.error("Pasted image exceeds 5 MB limit");
          const reader = new FileReader();
          reader.onload = () => { setPendingImageSrc(reader.result); setIsCropOpen(true); };
          reader.readAsDataURL(file);
          e.preventDefault();
          break;
        }
      }
    }
  };

  const handleCropSuccess = (url) => {
    setAttachedImage(url);
    setAttachedDoc(null);
    setIsCropOpen(false);
    setPendingImageSrc(null);
  };

  return {
    pendingImageSrc,
    setPendingImageSrc,
    isCropOpen,
    setIsCropOpen,
    attachedDoc,
    setAttachedDoc,
    handleAttachmentClick,
    handleFileChange,
    handlePaste,
    handleCropSuccess
  };
}

export default useChatAttachment;
