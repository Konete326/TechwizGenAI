export function parseChartFromText(text) {
  if (!text || typeof text !== "string") return null;
  const clean = text.trim();

  try {
    const parsed = JSON.parse(clean);
    if (parsed && Array.isArray(parsed.data) && parsed.data.length > 0) {
      return {
        type: parsed.type || "bar",
        title: parsed.title || "Analytical Chart",
        data: parsed.data
      };
    }
  } catch {}

  if (clean.startsWith("pie")) {
    const titleMatch = clean.match(/title\s+([^\n\r]+)/i);
    const title = titleMatch ? titleMatch[1].trim() : "Distribution Chart";
    const data = [];
    const itemRegex = /(?:"([^"]+)"|([a-zA-Z0-9_\s]+))\s*:\s*([\d.]+)/g;
    let match;
    while ((match = itemRegex.exec(clean)) !== null) {
      const name = (match[1] || match[2] || "").trim();
      const val = parseFloat(match[3]);
      if (name && !isNaN(val)) data.push({ name, value: val });
    }
    if (data.length > 0) return { type: "pie", title, data };
  }

  if (clean.includes("xychart")) {
    const titleMatch = clean.match(/title\s+"?([^"\n\r]+)"?/i);
    const title = titleMatch ? titleMatch[1].trim() : "Trend Chart";
    const xMatch = clean.match(/x-axis\s*\[(.*?)\]/i);
    const yMatch = clean.match(/(bar|line)\s*\[(.*?)\]/i);
    if (xMatch && yMatch) {
      const labels = xMatch[1].split(",").map((s) => s.trim().replace(/^["']|["']$/g, ""));
      const values = yMatch[2].split(",").map((s) => parseFloat(s.trim()) || 0);
      const data = labels.map((name, i) => ({ name, value: values[i] !== undefined ? values[i] : 0 }));
      if (data.length > 0) {
        return {
          type: yMatch[1].toLowerCase() === "line" ? "line" : "bar",
          title,
          data
        };
      }
    }
  }

  return null;
}

export default parseChartFromText;
