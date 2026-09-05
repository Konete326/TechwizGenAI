export function sanitizeMermaid(raw) {
  if (!raw || typeof raw !== "string") return "";
  let clean = raw.trim();
  clean = clean.replace(/^```+(?:mermaid|diagram|graph|flowchart)?\s*/i, "").replace(/```+\s*$/, "").trim();

  const lines = clean.split("\n");
  const firstLine = lines[0]?.trim().toLowerCase() || "";
  const knownTypes = [
    "graph", "flowchart", "sequencediagram", "classdiagram",
    "statediagram", "erdiagram", "pie", "gantt", "gitgraph",
    "journey", "mindmap", "quadrantchart", "xychart", "timeline",
    "sankey", "packet", "kanban", "block", "architecture", "c4context"
  ];
  const hasKnownType = knownTypes.some((t) => firstLine.startsWith(t));
  if (!hasKnownType) {
    clean = "flowchart TD\n" + clean;
  } else if (/^(graph|flowchart)$/i.test(firstLine)) {
    lines[0] = `${firstLine} TD`;
    clean = lines.join("\n");
  }

  clean = clean.replace(/([a-zA-Z0-9_-]+)\[([^\]"\n\r]*[\(\)\/\:\&\#\@\%\*\+\=\<\>][^\]"\n\r]*)\]/g, (_, id, label) => {
    const safe = label.replace(/"/g, "'");
    return `${id}["${safe}"]`;
  });

  clean = clean.replace(/([a-zA-Z0-9_-]+)\(([^)\"\n\r]*[\[\]\/\:\&\#\@\%\*\+\=\<\>][^)\"\n\r]*)\)/g, (_, id, label) => {
    const safe = label.replace(/"/g, "'");
    return `${id}("${safe}")`;
  });

  clean = clean.replace(/^(participant|actor)\s+([a-zA-Z0-9_-]+)\s+as\s+([^"\n\r]+)$/gm, (m, kw, id, alias) => {
    const trimmed = alias.trim();
    if (!trimmed.startsWith('"')) return `${kw} ${id} as "${trimmed.replace(/"/g, "'")}"`;
    return m;
  });

  clean = clean.replace(/<br\s*>/gi, "<br/>");
  clean = clean.replace(/-->\s*\|([^|"\n\r]+)\|/g, (m, lbl) => `-->|"${lbl.trim()}"|`);
  return clean;
}

export function aggressiveCleanMermaid(code) {
  let clean = sanitizeMermaid(code);
  clean = clean.replace(/\*\*([^*]+)\*\*/g, "$1");
  clean = clean.replace(/;(?=\s*$)/gm, "");
  if (/^graph\b/i.test(clean)) {
    clean = clean.replace(/^graph\s+[A-Z]{2}/i, "flowchart TD");
  }
  return clean;
}

export function parseFallbackNodes(text) {
  if (!text || typeof text !== "string") return [];
  const clean = text.replace(/^```+[^\n]*\n?/, "").replace(/\n?```+$/, "").trim();
  const nodeMap = new Map();
  const nodeRegex = /([a-zA-Z0-9_-]+)\s*(?:\[["']?([^\]"']+)["']?\]|\(["']?([^)"']+)["']?\))/g;
  let match;
  while ((match = nodeRegex.exec(clean)) !== null) {
    const id = match[1];
    const label = match[2] || match[3] || id;
    if (!nodeMap.has(id)) nodeMap.set(id, label);
  }
  return Array.from(nodeMap.entries()).map(([id, label]) => ({ id, label }));
}

export default { sanitizeMermaid, aggressiveCleanMermaid, parseFallbackNodes };
