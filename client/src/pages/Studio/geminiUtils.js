import { VITE_API_URL } from "@/config/env";
import { isTokenValid, clearAuth } from "@/utils/auth";

export async function fetchVoiceToken(clientId = null) {
  if (import.meta.env.DEV) {
    const c = localStorage.getItem("techwiz_custom_api_key") || localStorage.getItem("custom_api_key");
    if (c) return c;
  }
  try {
    const token = localStorage.getItem("token");
    let url = `${VITE_API_URL}/live/token`;
    let headers = {};
    let body = null;
    
    if (clientId) {
      url = `${VITE_API_URL}/live/widget-token`;
      headers["Content-Type"] = "application/json";
      body = JSON.stringify({ clientId });
    } else {
      if (!token || !isTokenValid(token)) {
        clearAuth();
        throw new Error("Authentication required");
      }
      headers["Authorization"] = `Bearer ${token}`;
    }

    const res = await fetch(url, {
      method: "POST",
      headers,
      body
    });
    
    if (res.status === 401 && !clientId) {
      clearAuth();
    }

    const text = await res.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      throw new Error(`Status ${res.status}: ${text.substring(0, 100)}`, { cause: e });
    }
    
    if (!res.ok) throw new Error(data.message || "Failed to fetch token");
    return data.token || "";
  } catch (err) {
    console.error("Token fetch error:", err);
    throw err;
  }
}