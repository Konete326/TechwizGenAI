export function parseChartFromText(text) {
  if (!text || typeof text !== "string") return null;
  let clean = text.trim().replace(/^```+(?:chart|json|mermaid)?\s*/i, "").replace(/```+\s*$/, "").trim();

  const jsonMatch = clean.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    let jsonStr = jsonMatch[0].replace(/,\s*([\]\}])/g, "$1").replace(/'([^'\\]*(?:\\.[^'\\]*)*)'/g, '"$1"');
    try {
      const parsed = JSON.parse(jsonStr);
      const rawData = Array.isArray(parsed.data) ? parsed.data : (Array.isArray(parsed) ? parsed : null);
      if (rawData && rawData.length > 0) {
        const data = rawData.map((d, i) => {
          if (typeof d === "number") return { name: `Item ${i + 1}`, value: d };
          const name = d.name || d.label || d.category || d.title || d.x || d.month || d.year || Object.keys(d)[0] || `Item ${i + 1}`;
          const numKey = Object.keys(d).find((k) => k !== "name" && k !== "label" && typeof d[k] === "number");
          const val = Number(d.value ?? d.val ?? d.amount ?? d.count ?? d.sales ?? d.revenue ?? d.total ?? d.y ?? (numKey ? d[numKey] : 0));
          return { name: String(name), value: isNaN(val) ? 0 : val };
        });
        return {
          type: (parsed.type || "bar").toLowerCase(),
          title: parsed.title || "Analytical Chart",
          data
        };
      }
    } catch {}
  }

  if (/pie/i.test(clean)) {
    const titleMatch = clean.match(/title\s+["']?([^"'\n\r]+)["']?/i);
    const title = titleMatch ? titleMatch[1].trim() : "Distribution Chart";
    const data = [];
    const itemRegex = /(?:"([^"]+)"|'([^']+)'|([a-zA-Z0-9_\s]+))\s*:\s*([\d.]+)/g;
    let match;
    while ((match = itemRegex.exec(clean)) !== null) {
      const name = (match[1] || match[2] || match[3] || "").trim();
      const val = parseFloat(match[4]);
      if (name && !isNaN(val) && !/^(title|showData)$/i.test(name)) data.push({ name, value: val });
    }
    if (data.length > 0) return { type: "pie", title, data };
  }

  if (/xychart/i.test(clean)) {
    const titleMatch = clean.match(/title\s+["']?([^"'\n\r]+)["']?/i);
    const title = titleMatch ? titleMatch[1].trim() : "Trend Chart";
    const xMatch = clean.match(/x-axis\s*\[(.*?)\]/i);
    const yMatch = clean.match(/(bar|line|area)\s*\[(.*?)\]/i);
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
