import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const markdownComponents = {
  p: ({ children }) => <p className="mb-2 last:mb-0 leading-relaxed text-zinc-200">{children}</p>,
  h1: ({ children }) => <h1 className="font-bold text-zinc-100 mt-4 mb-2 text-base">{children}</h1>,
  h2: ({ children }) => <h2 className="font-semibold text-zinc-100 mt-3 mb-1.5 text-sm">{children}</h2>,
  h3: ({ children }) => <h3 className="font-semibold text-zinc-100 mt-3 mb-1.5 text-xs">{children}</h3>,
  ul: ({ children }) => <ul className="list-disc pl-4 mb-2 space-y-1">{children}</ul>,
  ol: ({ children }) => <ol className="list-decimal pl-4 mb-2 space-y-1">{children}</ol>,
  li: ({ children }) => <li className="text-zinc-200 text-xs">{children}</li>,
  code: ({ inline, className, children, ...props }) => (
    <code className="bg-zinc-800 text-zinc-100 px-1.5 py-0.5 rounded-md text-xs font-mono" {...props}>
      {children}
    </code>
  ),
  pre: ({ children }) => (
    <pre className="bg-zinc-950 p-3.5 rounded-lg overflow-x-auto text-xs font-mono my-2.5 border border-zinc-800 text-zinc-300">
      {children}
    </pre>
  ),
  a: ({ href, children }) => (
    <a href={href} className="text-blue-400 hover:underline cursor-pointer" target="_blank" rel="noreferrer">
      {children}
    </a>
  )
};

export function MarkdownRenderer({ content }) {
  return (
    <div className="text-xs leading-relaxed break-words">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
        {content}
      </ReactMarkdown>
    </div>
  );
}

export default MarkdownRenderer;
