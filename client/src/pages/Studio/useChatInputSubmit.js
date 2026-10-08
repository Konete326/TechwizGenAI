export function useChatInputSubmit({
  isStreaming,
  inputPrompt,
  hasAttachment,
  onSubmit,
  currentImgList,
  attachedDocs,
  hasDocs,
  hasImages,
  clearAllAttachments,
  setInputPrompt
}) {
  const handleFormSubmit = (e) => {
    if (e) e.preventDefault();
    if (isStreaming) return;
    if (!inputPrompt.trim() && !hasAttachment) return;
    onSubmit({
      text: inputPrompt,
      images: currentImgList,
      documents: attachedDocs,
      attachmentType: hasDocs ? "document" : (hasImages ? "image" : "none"),
      attachmentName: hasDocs ? attachedDocs[0].name : null,
      attachmentData: hasDocs ? attachedDocs[0].data : (hasImages ? currentImgList[0] : null)
    });
    clearAllAttachments();
    setInputPrompt("");
  };
  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleFormSubmit(); }
  };
  const placeholderText = hasDocs
    ? (attachedDocs.length === 1 ? `Ask about ${attachedDocs[0].name}...` : `Ask about ${attachedDocs.length} documents...`)
    : (hasImages ? (currentImgList.length === 1 ? "Ask about image..." : `Ask about ${currentImgList.length} images...`) : "Ask anything...");
  return { handleFormSubmit, handleKeyDown, placeholderText };
}
