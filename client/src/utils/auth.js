let isLoggingOut = false;

export const isTokenValid = (token) => {
  if (!token || typeof token !== "string") return false;
  const parts = token.split(".");
  if (parts.length !== 3) return false;
  try {
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    const payload = JSON.parse(jsonPayload);
    if (!payload || typeof payload !== "object") return false;
    if (payload.exp && typeof payload.exp === "number") {
      return Date.now() < payload.exp * 1000;
    }
    return true;
  } catch {
    return false;
  }
};

export const clearAuth = () => {
  if (isLoggingOut) return;
  isLoggingOut = true;
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  localStorage.removeItem("platform_usage_bytes");
  window.dispatchEvent(new CustomEvent("auth:logout"));
  if (
    typeof window !== "undefined" &&
    window.location.pathname !== "/login" &&
    window.location.pathname !== "/register" &&
    window.location.pathname !== "/auth"
  ) {
    window.location.replace("/login");
  }
  setTimeout(() => {
    isLoggingOut = false;
  }, 1000);
};

export const handleUnauthorized = (response) => {
  if (response && response.status === 401) {
    clearAuth();
    return true;
  }
  return false;
};

export const authFetch = async (url, options = {}) => {
  const token = localStorage.getItem("token");
  if (!token || !isTokenValid(token)) {
    clearAuth();
    return null;
  }
  const headers = {
    ...(options.headers || {}),
    Authorization: `Bearer ${token}`
  };
  try {
    const res = await fetch(url, { ...options, headers });
    if (res.status === 401) {
      clearAuth();
      return null;
    }
    return res;
  } catch (err) {
    throw err;
  }
};
