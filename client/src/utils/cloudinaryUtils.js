export function isCloudinaryUrl(url) {
  return typeof url === "string" && (url.includes("res.cloudinary.com") || url.includes("cloudinary.com"));
}

export function getConvertedImageUrl(originalUrl, targetFormat, forceDownload = false) {
  if (!originalUrl || typeof originalUrl !== "string") return "";
  if (!isCloudinaryUrl(originalUrl)) return originalUrl;
  const [base, query] = originalUrl.split("?");
  const format = String(targetFormat || "").toLowerCase().replace(/^\./, "");
  let updated = base;
  if (format) {
    if (/\.[a-zA-Z0-9]+$/.test(updated)) {
      updated = updated.replace(/\.[a-zA-Z0-9]+$/, `.${format}`);
    } else {
      updated = `${updated}.${format}`;
    }
  }
  if (forceDownload && !updated.includes("fl_attachment")) {
    if (updated.includes("/image/upload/")) {
      updated = updated.replace("/image/upload/", "/image/upload/fl_attachment/");
    } else if (updated.includes("/upload/")) {
      updated = updated.replace("/upload/", "/upload/fl_attachment/");
    }
  }
  return query ? `${updated}?${query}` : updated;
}

export default { isCloudinaryUrl, getConvertedImageUrl };
