import { VITE_API_URL } from "@/config/env";

export function getFriendlyErrorMessage(error) {
  if (!error) return "AI service is temporarily unavailable. Please try again shortly.";
  const raw = typeof error === "string" ? error : (error.message || "");
  const lower = raw.toLowerCase();
  if (lower.includes("custom_api_failed") || lower.includes("custom api key")) {
    return "Custom API key authentication failed or quota exceeded. Please check Settings.";
  }
  if (lower.includes("server error") || lower.includes("500") || lower.includes("failed to fetch") || lower.includes("network") || lower.includes("internal")) {
    return "AI service is temporarily unavailable. Please try again in a moment.";
  }
  if (lower.includes("quota") || lower.includes("rate limit") || lower.includes("429") || lower.includes("resource_exhausted")) {
    return "API request limit reached. Please wait a few seconds before trying again.";
  }
  if (lower.includes("401") || lower.includes("unauthorized") || lower.includes("token")) {
    return "Session expired. Please sign in again to continue.";
  }
  return raw || "AI service is temporarily unavailable. Please try again shortly.";
}

export async function streamCompletion({
  sessionId,
  prompt,
  model = "gemini-3.8-flash",
  imageBase64 = null,
  images = null,
  attachmentType = "none",
  attachmentName = null,
  attachmentData = null,
  documents = null,
  persona = "general",
  isRegenerate = false,
  onChunk,
  onComplete,
  onError,
  signal
}) {
  try {
    const token = localStorage.getItem("token");
    if (!token) {
      throw new Error("Authentication token is missing. Please sign in.");
    }

    const customApiKey = localStorage.getItem("techwiz_custom_api_key") || localStorage.getItem("custom_api_key") || "";
    const customProvider = localStorage.getItem("custom_ai_provider") || "";

    const headers = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    };
    if (customApiKey) headers["x-custom-api-key"] = customApiKey;
    if (customProvider) headers["x-ai-provider"] = customProvider;

    const endpoint = isRegenerate
      ? `${VITE_API_URL}/ai/sessions/${sessionId}/regenerate`
      : `${VITE_API_URL}/ai/sessions/${sessionId}/stream`;

    let response;
    let retries = 3;
    let delay = 1500;

    while (retries >= 0) {
      response = await fetch(endpoint, {
        method: "POST",
        headers,
        body: JSON.stringify({ prompt, model, imageBase64, images, attachmentType, attachmentName, attachmentData, documents, persona }),
        signal
      });

      if (response.status === 500 && retries > 0) {
        const cloned = response.clone();
        const errData = await cloned.json().catch(() => ({}));
        const msg = String(errData.message || "");
        if (msg.toLowerCase().includes("busy") || msg.toLowerCase().includes("temporarily") || msg.toLowerCase().includes("unavailable")) {
          retries--;
          await new Promise((resolve) => setTimeout(resolve, delay));
          delay *= 1.5;
          continue;
        }
      }
      break;
    }

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      if (errData.error === "CUSTOM_API_FAILED" || (response.status === 401 && customApiKey)) {
        window.dispatchEvent(new CustomEvent("api_key_failed"));
        throw new Error("Custom API key authentication failed or quota exceeded. Please check Settings.");
      }
      const candidate = errData.message || "";
      if (!candidate || candidate.toLowerCase().includes("server error") || response.status >= 500) {
        throw new Error("AI service is temporarily unavailable. Please try again in a moment.");
      }
      throw new Error(candidate);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder("utf-8");
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith("data:")) continue;

        const dataStr = trimmed.replace(/^data:\s*/, "");
        if (dataStr === "[DONE]") {
          if (onComplete) onComplete();
          return;
        }

        try {
          const parsed = JSON.parse(dataStr);
          if (parsed.error) {
            if (parsed.error === "IMAGE_NOT_SUPPORTED") {
              window.dispatchEvent(new CustomEvent("image_capability_failed"));
              if (onComplete) onComplete();
              return;
            }
            if (parsed.error === "CUSTOM_API_FAILED") {
              window.dispatchEvent(new CustomEvent("api_key_failed"));
              throw new Error("Custom API key authentication failed or quota exceeded. Please check Settings.");
            }
            const candidate = parsed.message || parsed.error;
            if (typeof candidate === "string" && candidate.toLowerCase().includes("server error")) {
              throw new Error("AI service is temporarily unavailable. Please try again in a moment.");
            }
            throw new Error(candidate);
          }
          if (parsed.text && onChunk) {
            onChunk(parsed.text);
          }
        } catch (e) {
          if (e.message && e.message !== "Unexpected end of JSON input") {
            if (onError) onError(e);
          }
        }
      }
    }

    if (onComplete) onComplete();
  } catch (error) {
    if (error.name !== "AbortError" && onError) {
      onError(error);
    }
  }
}

export default streamCompletion;
