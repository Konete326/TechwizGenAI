const sanitizeApiUrl = (url) => {
  if (!url) {
    if (typeof window !== "undefined" && window.location.hostname !== "localhost" && window.location.hostname !== "127.0.0.1") {
      return `${window.location.origin}/api`;
    }
    return "http://localhost:5000/api";
  }
  let clean = url.trim().replace(/\/+$/, "");
  if (!clean.endsWith("/api")) {
    clean = `${clean}/api`;
  }
  return clean;
};

const sanitizeServerUrl = (url, apiUrl) => {
  if (url) return url.trim().replace(/\/+$/, "").replace(/\/api$/, "");
  return apiUrl.replace(/\/api$/, "");
};

const rawApi = import.meta.env.VITE_API_URL;
const rawServer = import.meta.env.VITE_SERVER_URL;

export const VITE_API_URL = sanitizeApiUrl(rawApi);
export const VITE_SERVER_URL = sanitizeServerUrl(rawServer, VITE_API_URL);

export default VITE_API_URL;
