import { VITE_SERVER_URL } from "@/config/env";

export function resolveDocumentUrl(rawUrl) {
  if (!rawUrl || typeof rawUrl !== "string") return "";
  const trimmed = rawUrl.trim();

  if (trimmed.includes("cloudinary.com") || trimmed.includes("res.cloudinary.com")) {
    return trimmed;
  }

  const isLocal = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?/i.test(trimmed);
  const isClientRemote = typeof window !== "undefined" &&
    window.location.hostname !== "localhost" &&
    window.location.hostname !== "127.0.0.1";

  if (isLocal) {
    const hasRemoteServer = VITE_SERVER_URL && !/^https?:\/\/(localhost|127\.0\.0\.1)/i.test(VITE_SERVER_URL);
    if (hasRemoteServer) {
      return trimmed.replace(/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?/, VITE_SERVER_URL);
    }
    if (isClientRemote) {
      return trimmed.replace(/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?/, window.location.origin);
    }
  }

  if (trimmed.startsWith("/uploads/")) {
    const hasRemoteServer = VITE_SERVER_URL && !/^https?:\/\/(localhost|127\.0\.0\.1)/i.test(VITE_SERVER_URL);
    const base = hasRemoteServer ? VITE_SERVER_URL : (isClientRemote ? window.location.origin : (VITE_SERVER_URL || ""));
    return `${base}${trimmed}`;
  }

  return trimmed;
}

export default resolveDocumentUrl;
