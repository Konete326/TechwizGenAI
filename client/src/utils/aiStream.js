import { VITE_API_URL } from "@/config/env";

export async function streamCompletion({
  sessionId,
  prompt,
  model = "gemini-3.7-flash",
  imageBase64 = null,
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

    const customApiKey = localStorage.getItem("custom_api_key") || "";
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

    const response = await fetch(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify({ prompt, model, imageBase64 }),
      signal
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      if (errData.error === "CUSTOM_API_FAILED" || (response.status === 401 && customApiKey)) {
        window.dispatchEvent(new CustomEvent("api_key_failed"));
        throw new Error("Custom API key authentication failed or exceeded quota.");
      }
      throw new Error(errData.message || `Request failed with status ${response.status}`);
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
            if (parsed.error === "CUSTOM_API_FAILED") {
              window.dispatchEvent(new CustomEvent("api_key_failed"));
            }
            throw new Error(parsed.message || parsed.error);
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
