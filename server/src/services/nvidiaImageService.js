import { nvidiaKeys } from "../config/env.js";

export const selectModel = (prompt) => {
  const p = (prompt || "").trim();
  const wordCount = p.split(/\s+/).filter(Boolean).length;
  if (wordCount > 12 || p.length > 75) {
    return "qwen/qwen-image";
  }
  return "black-forest-labs/flux.2-klein-4b";
};

export async function generate(prompt) {
  const cleanPrompt = (prompt || "").trim() || "Creative AI Artwork";
  const selectedModel = selectModel(cleanPrompt);
  const keys = nvidiaKeys.length > 0 ? nvidiaKeys : [process.env.NVIDIA_API_KEY_1, process.env.NVIDIA_API_KEY_2].filter(Boolean);
  if (keys.length === 0) {
    throw new Error("Missing NVIDIA API keys");
  }

  let lastError = null;
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    try {
      const endpoints = [
        `https://ai.api.nvidia.com/v1/genai/${selectedModel}`,
        "https://ai.api.nvidia.com/v1/genai/black-forest-labs/flux.2-klein-4b"
      ];
      for (const endpoint of endpoints) {
        try {
          const res = await fetch(endpoint, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${key}`,
              "Content-Type": "application/json",
              Accept: "application/json"
            },
            body: JSON.stringify({ prompt: cleanPrompt })
          });
          if (res.status === 429) {
            lastError = new Error(`NVIDIA rate limit on key ${i + 1}`);
            break;
          }
          if (res.ok) {
            const data = await res.json();
            const b64 = data?.artifacts?.[0]?.base64 || data?.data?.[0]?.b64_json;
            const resultUrl = b64 ? `data:image/jpeg;base64,${b64}` : (data?.data?.[0]?.url || data?.url);
            if (resultUrl) {
              return { url: resultUrl, imageUrl: resultUrl, model: selectedModel };
            }
          }
        } catch (innerErr) {
          lastError = innerErr;
        }
      }
    } catch (keyErr) {
      lastError = keyErr;
    }
  }
  throw lastError || new Error("All NVIDIA image generation keys failed");
}

export const generateImage = generate;
export default { generate, generateImage, selectModel };
