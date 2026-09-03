import Editor from "react-simple-code-editor";
import Prism from "prismjs";
import "prismjs/themes/prism-tomorrow.css";
import "prismjs/components/prism-clike";
import "prismjs/components/prism-javascript";
import "prismjs/components/prism-markup";
import "prismjs/components/prism-css";

const CodeEditor = (typeof Editor === "function" || Editor?.render)
  ? Editor
  : (Editor?.default?.render || typeof Editor?.default === "function" ? Editor.default : Editor);

export function ArtifactEditor({ content, onChange, extension = "txt" }) {
  const highlightCode = (code) => {
    try {
      const lang = extension === "html" ? "markup" : (Prism.languages[extension] ? extension : "clike");
      const grammar = Prism.languages[lang] || Prism.languages.markup;
      return Prism.highlight(code || "", grammar, lang);
    } catch {
      return code || "";
    }
  };

  const isEditorValid = typeof CodeEditor === "function" || Boolean(CodeEditor?.render);

  return (
    <div className="h-full w-full overflow-auto bg-zinc-950 p-4 font-mono text-xs text-zinc-300 rounded-b-xl border-t border-zinc-800">
      {isEditorValid ? (
        <CodeEditor
          value={content}
          onValueChange={onChange}
          highlight={highlightCode}
          padding={10}
          className="min-h-full font-mono outline-none leading-relaxed"
          textareaClassName="outline-none"
        />
      ) : (
        <textarea
          value={content}
          onChange={(e) => onChange(e.target.value)}
          className="w-full h-full min-h-[300px] bg-transparent outline-none resize-none font-mono text-xs text-zinc-300 leading-relaxed"
        />
      )}
    </div>
  );
}

export default ArtifactEditor;

