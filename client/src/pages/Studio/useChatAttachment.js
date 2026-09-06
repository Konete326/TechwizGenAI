import { useState } from "react";
import { useToast } from "@/context/ToastContext";
import { VITE_API_URL } from "@/config/env";

const MAX_IMAGES = 3;
const MAX_DOCS = 5;

async function uploadDocToAssets(file) {
  try {
    const token = localStorage.getItem("token");
    if (!token) return;
    const fd = new FormData();
    fd.append("file", file);
    fd.append("title", file.name);
    await fetch(`${VITE_API_URL}/assets`, { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: fd });
  } catch {}
}

export function useChatAttachment({ attachedImages = [], setAttachedImages, attachedImage, setAttachedImage, selectedModel }) {
  const toast = useToast();
  const [pendingImageSrc, setPendingImageSrc] = useState(null);
  const [isCropOpen, setIsCropOpen] = useState(false);
  const [attachedDocs, setAttachedDocs] = useState([]);

  const currentImgList = Array.isArray(attachedImages) && attachedImages.length > 0 ? attachedImages : (attachedImage ? [attachedImage] : []);

  const handleAttachmentClick = (fileInputRef) => {
    if (selectedModel === "gemini-1.5-flash-8b") return toast.error("This model does not support attachments. Please select a superior model.");
    if (currentImgList.length >= MAX_IMAGES && attachedDocs.length >= MAX_DOCS) return toast.error("Maximum 3 images and 5 documents reached");
    fileInputRef.current?.click();
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const incomingImages = [];
    const incomingDocs = [];

    for (const f of files) {
      if (f.size > 10 * 1024 * 1024) { toast.error(`"${f.name}" must be under 10 MB`); continue; }
      if (f.type.startsWith("image/") || /\.(jpe?g|png|webp|gif|svg)$/i.test(f.name)) incomingImages.push(f);
      else incomingDocs.push(f);
    }

    if (incomingImages.length > 0) {
      const avail = MAX_IMAGES - currentImgList.length;
      if (avail <= 0) toast.error("Maximum 3 images allowed");
      else {
        if (incomingImages.length > avail) toast.error("Maximum 3 images allowed");
        const toAdd = incomingImages.slice(0, avail);
        if (toAdd.length === 1 && currentImgList.length === 0) {
          const reader = new FileReader();
          reader.onload = () => { setPendingImageSrc(reader.result); setIsCropOpen(true); };
          reader.readAsDataURL(toAdd[0]);
        } else {
          for (const imgFile of toAdd) {
            const reader = new FileReader();
            reader.onload = () => {
              if (setAttachedImages) setAttachedImages((prev) => (prev.length < MAX_IMAGES ? [...prev, reader.result] : prev));
              else if (setAttachedImage) setAttachedImage(reader.result);
            };
            reader.readAsDataURL(imgFile);
          }
        }
      }
    }

    if (incomingDocs.length > 0) {
      const avail = MAX_DOCS - attachedDocs.length;
      if (avail <= 0) toast.error("Maximum 5 documents allowed");
      else {
        if (incomingDocs.length > avail) toast.error("Maximum 5 documents allowed");
        const toAdd = incomingDocs.slice(0, avail);
        for (const docFile of toAdd) {
          const reader = new FileReader();
          reader.onload = () => {
            const fallback = docFile.name.endsWith(".pdf") ? "application/pdf" : (docFile.name.endsWith(".txt") ? "text/plain" : "application/octet-stream");
            setAttachedDocs((prev) => (prev.length < MAX_DOCS ? [...prev, { data: reader.result, name: docFile.name, type: docFile.type || fallback, size: docFile.size }] : prev));
            uploadDocToAssets(docFile);
          };
          reader.readAsDataURL(docFile);
        }
      }
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
          if (currentImgList.length >= MAX_IMAGES) { toast.error("Maximum 3 images allowed"); e.preventDefault(); return; }
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
    if (setAttachedImages) setAttachedImages((prev) => (prev.length < MAX_IMAGES ? [...prev, url] : prev));
    else if (setAttachedImage) setAttachedImage(url);
    setIsCropOpen(false);
    setPendingImageSrc(null);
  };

  const removeImage = (idx) => {
    if (setAttachedImages) setAttachedImages((prev) => prev.filter((_, i) => i !== idx));
    else if (setAttachedImage) setAttachedImage(null);
  };

  const removeDoc = (idx) => setAttachedDocs((prev) => prev.filter((_, i) => i !== idx));

  const clearAllAttachments = () => {
    if (setAttachedImages) setAttachedImages([]);
    if (setAttachedImage) setAttachedImage(null);
    setAttachedDocs([]);
  };

  return {
    pendingImageSrc, setPendingImageSrc, isCropOpen, setIsCropOpen,
    attachedDocs, setAttachedDocs, attachedDoc: attachedDocs[0] || null,
    setAttachedDoc: (doc) => setAttachedDocs(doc ? [doc] : []),
    handleAttachmentClick, handleFileChange, handlePaste, handleCropSuccess,
    removeImage, removeDoc, clearAllAttachments
  };
}

export default useChatAttachment;
