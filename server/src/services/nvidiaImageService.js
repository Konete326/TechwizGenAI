import { nvidiaKeys } from "../config/env.js";

const ENDPOINTS = [
  { url: "https://ai.api.nvidia.com/v1/genai/black-forest-labs/flux.2-klein-4b", model: "flux.2-klein-4b", timeout: 12000 },
  { url: "https://ai.api.nvidia.com/v1/genai/black-forest-labs/flux.1-schnell", model: "flux.1-schnell", timeout: 4000 }
];

export async function generate(prompt) {
  const cleanPrompt = (prompt || "").trim() || "Creative AI Artwork";
  const keys = nvidiaKeys.length > 0 ? nvidiaKeys : [process.env.NVIDIA_API_KEY_1, process.env.NVIDIA_API_KEY_2].filter(Boolean);
  if (keys.length === 0) {
    throw new Error("Missing NVIDIA API keys");
  }

  let lastError = null;
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    for (const ep of ENDPOINTS) {
      try {
        const res = await fetch(ep.url, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${key}`,
            "Content-Type": "application/json",
            Accept: "application/json"
          },
          body: JSON.stringify({ prompt: cleanPrompt }),
          signal: AbortSignal.timeout(ep.timeout)
        });

        if (res.status === 429) {
          lastError = new Error(`NVIDIA rate limit on key ${i + 1}`);
          break;
        }

        if (res.ok) {
          const data = await res.json();
          const b64 = data?.artifacts?.[0]?.base64 || data?.data?.[0]?.b64_json;
          let resultUrl = data?.data?.[0]?.url || data?.url;
          if (b64) {
            resultUrl = b64.startsWith("data:") ? b64 : `data:image/jpeg;base64,${b64}`;
          }
          if (resultUrl) {
            return {
              success: true,
              url: resultUrl,
              imageUrl: resultUrl,
              model: ep.model
            };
          }
        }
      } catch (err) {
        lastError = err;
      }
    }
  }

  throw lastError || new Error("All NVIDIA image generation keys failed");
}

export const generateImage = generate;
export default { generate, generateImage };
