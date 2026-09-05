import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Play } from "@phosphor-icons/react";
import { ArtifactPreviewer } from "./ArtifactPreviewer";
import { DashboardChart } from "./DashboardChart";
import { parseChartFromText } from "./chartParser";
import { MermaidChart } from "./MermaidChart";
import { ChoiceChips } from "./ChoiceChips";

const getMarkdownComponents = (onOpenArtifact) => ({
  p: ({ children }) => <p className="mb-2 last:mb-0 leading-relaxed text-text-primary">{children}</p>,
  h1: ({ children }) => <h1 className="font-bold text-text-primary mt-4 mb-2 text-base">{children}</h1>,
  h2: ({ children }) => <h2 className="font-semibold text-text-primary mt-3 mb-1.5 text-sm">{children}</h2>,
  h3: ({ children }) => <h3 className="font-semibold text-text-primary mt-3 mb-1.5 text-xs">{children}</h3>,
  ul: ({ children }) => <ul className="list-disc pl-4 mb-2 space-y-1">{children}</ul>,
  ol: ({ children }) => <ol className="list-decimal pl-4 mb-2 space-y-1">{children}</ol>,
  li: ({ children }) => <li className="text-text-primary text-xs">{children}</li>,
  code: ({ inline, className, children, ...props }) => {
    const raw = String(children).replace(/\n$/, "");
    const parsed = parseChartFromText(raw);
    if (parsed) return <DashboardChart type={parsed.type} title={parsed.title} data={parsed.data} />;

    const isDiagram = /(mermaid|diagram|flowchart|graph)/i.test(className || "") ||
      (!inline && /^\s*(graph|flowchart|sequenceDiagram|classDiagram|stateDiagram|erDiagram|pie|gantt|gitGraph|journey|mindmap|xychart)\b/i.test(raw));
    if (isDiagram) return <MermaidChart chart={raw} onOpenArtifact={onOpenArtifact} />;

    const langMatch = /language-(html|javascript|js|jsx|svg)/i.exec(className || "");
    const isSandboxable = Boolean(langMatch) && raw.split("\n").length > 3 && Boolean(onOpenArtifact);

    if (isSandboxable) {
      const lang = langMatch[1].toLowerCase();
      const ext = lang === "javascript" ? "js" : lang;
      return (
        <div className="relative my-2.5 rounded-lg border border-zinc-800 bg-zinc-950 overflow-hidden group">
          <div className="flex items-center justify-between px-3 py-1.5 bg-zinc-900/80 border-b border-zinc-800 text-[11px] font-mono text-zinc-400">
            <span className="uppercase tracking-wider font-semibold text-zinc-300">{lang}</span>
            <button
              type="button"
              onClick={() => onOpenArtifact({ type: "code", extension: ext, content: raw })}
              className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-indigo-600 hover:bg-indigo-500 text-white font-sans text-xs font-medium transition-colors cursor-pointer shadow-xs"
              title="Open in Live Sandbox"
            >
              <Play size={11} weight="fill" />
              <span>Open Interactive Sandbox</span>
            </button>
          </div>
          <pre className="p-3.5 overflow-x-auto text-xs font-mono text-zinc-300 max-w-full">
            <code {...props}>{children}</code>
          </pre>
        </div>
      );
    }

    return <code className="bg-surface border border-border text-text-primary px-1.5 py-0.5 rounded-md text-xs font-mono" {...props}>{children}</code>;
  },
  pre: ({ children, ...props }) => {
    const childClass = children?.props?.className || "";
    if (/(mermaid|chart|diagram|flowchart|graph)/i.test(childClass)) return children;
    const rawText = typeof children?.props?.children === "string" ? children.props.children : "";
    if (/^\s*(graph|flowchart|sequenceDiagram|classDiagram|stateDiagram|erDiagram|pie|gantt|gitGraph|journey|mindmap|xychart|\{)/i.test(rawText)) return children;
    if (/language-(html|javascript|js|jsx|svg)/i.test(childClass)) return children;
    return <pre className="bg-zinc-950 p-2.5 sm:p-3.5 rounded-lg overflow-x-auto text-xs font-mono my-2.5 border border-zinc-800 text-zinc-300 min-w-0 max-w-full" {...props}>{children}</pre>;
  },
  img: ({ src, alt }) => (
    <img
      src={src}
      alt={alt || "Image"}
      className="w-full max-w-full sm:max-w-md max-h-80 object-contain rounded-lg border border-border my-2 shadow-xs cursor-pointer"
      onClick={() => window.open(src, "_blank")}
    />
  ),
  table: ({ children }) => (
    <div className="w-full overflow-x-auto my-2 border border-border rounded-lg">
      <table className="w-full text-left text-xs border-collapse">{children}</table>
    </div>
  ),
  a: ({ href, children }) => <a href={href} className="text-accent hover:underline cursor-pointer" target="_blank" rel="noreferrer">{children}</a>
});

export function MarkdownRenderer({ content, onOpenArtifact, onSelectChoice, isStreaming = false }) {
  if (!content) return null;
  const markdownComponents = getMarkdownComponents(onOpenArtifact);

  let parsedChoices = [];
  let displayContent = content;

  const choiceMatch = /\[CHOICES:\s*([^\]]+)\]/i.exec(content);
  if (choiceMatch) {
    parsedChoices = choiceMatch[1].split("|").map((s) => s.trim()).filter(Boolean);
    displayContent = content.replace(/\[CHOICES:\s*([^\]]+)\]/i, "").trim();
  }

  const matcher = /\[ARTIFACT:\s*([a-zA-Z0-9]+)\s*\|\s*([^\]]+)\]/g;

  if (!matcher.test(displayContent)) {
    return (
      <div className="text-xs leading-relaxed break-words min-w-0 w-full overflow-hidden">
        <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
          {displayContent}
        </ReactMarkdown>
        {parsedChoices.length > 0 && (
          <ChoiceChips choices={parsedChoices} onSelectChoice={onSelectChoice} disabled={isStreaming} />
        )}
      </div>
    );
  }

  const parts = [];
  let lastIndex = 0;
  let match;
  matcher.lastIndex = 0;
  while ((match = matcher.exec(displayContent)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: "markdown", text: displayContent.slice(lastIndex, match.index) });
    }
    parts.push({ type: "artifact", extension: match[1].trim(), url: match[2].trim() });
    lastIndex = matcher.lastIndex;
  }
  if (lastIndex < displayContent.length) {
    parts.push({ type: "markdown", text: displayContent.slice(lastIndex) });
  }

  return (
    <div className="text-xs leading-relaxed break-words min-w-0 w-full overflow-hidden space-y-2">
      {parts.map((p, idx) => {
        if (p.type === "artifact") {
          return <ArtifactPreviewer key={idx} extension={p.extension} url={p.url} onOpenArtifact={onOpenArtifact} />;
        }
        if (!p.text.trim()) return null;
        return (
          <ReactMarkdown key={idx} remarkPlugins={[remarkGfm]} components={markdownComponents}>
            {p.text}
          </ReactMarkdown>
        );
      })}
      {parsedChoices.length > 0 && (
        <ChoiceChips choices={parsedChoices} onSelectChoice={onSelectChoice} disabled={isStreaming} />
      )}
    </div>
  );
}

export default MarkdownRenderer;
