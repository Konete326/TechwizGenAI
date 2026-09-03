import { useRef, useEffect } from "react";
import { Lightning, Lightbulb, Code } from "@phosphor-icons/react";
import { MessageBubble } from "./MessageBubble";
import { AiThinking } from "@/components/ui/AiThinking";
import logoImg from "@/assets/logo.png";

const SUGGESTIONS = [
  { icon: Lightbulb, title: "Brainstorm campaign ideas", prompt: "Give me 5 creative campaign ideas for our AI marketing platform." },
  { icon: Code, title: "Generate clean API code", prompt: "Write an Express.js JWT authentication middleware with error handling." },
  { icon: Lightning, title: "Optimize system performance", prompt: "What are the top 3 best practices for low-latency full-stack apps?" }
];

export function ChatCanvas({
  messages,
  activeSession,
  isStreaming,
  streamingText,
  onEdit,
  onRegenerate,
  onSendSuggested
}) {
  const scrollBottomRef = useRef(null);

  useEffect(() => {
    const frameId = requestAnimationFrame(() => {
      scrollBottomRef.current?.scrollIntoView({ behavior: "smooth" });
    });
    return () => cancelAnimationFrame(frameId);
  }, [messages, streamingText]);

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
      <div className="w-full space-y-6">
        {messages.length === 0 && !isStreaming ? (
          <div className="py-12 md:py-16 text-center space-y-6">
            <div className="w-14 h-14 rounded-2xl bg-surface-card border border-border p-2.5 flex items-center justify-center mx-auto shadow-lg">
              <img src={logoImg} alt="Techwiz GenAI" className="w-full h-full object-contain" />
            </div>

            <div className="space-y-1.5 max-w-md mx-auto">
              <h3 className="text-base font-bold text-text-primary">
                {activeSession?.title || "AI Studio Assistant"}
              </h3>
              <p className="text-xs text-text-muted leading-relaxed">
                Powered by Techwiz GenAI and Google Gemini Intelligence. Ask questions, generate technical assets, or debug complex architectures.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4 text-left">
              {SUGGESTIONS.map((item, idx) => {
                const Icon = item.icon;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => onSendSuggested(item.prompt)}
                    className="p-3.5 rounded-[var(--radius-md)] bg-surface-card border border-border hover:border-accent hover:bg-surface transition-all text-xs text-text-muted hover:text-text-primary cursor-pointer group"
                  >
                    <div className="flex items-center gap-2 mb-1.5 text-accent">
                      <Icon size={16} />
                      <span className="font-semibold text-text-primary text-[11px]">{item.title}</span>
                    </div>
                    <p className="line-clamp-2 text-[11px] leading-relaxed text-text-muted">{item.prompt}</p>
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          messages.map((m) => (
            <MessageBubble
              key={m.id}
              message={m}
              onEdit={onEdit}
              onRegenerate={onRegenerate}
              isStreaming={false}
            />
          ))
        )}

        {isStreaming && (
          streamingText ? (
            <MessageBubble
              message={{ id: "streaming-temp", role: "model", text: streamingText }}
              isStreaming={true}
            />
          ) : (
            <AiThinking />
          )
        )}

        <div ref={scrollBottomRef} />
      </div>
    </div>
  );
}

export default ChatCanvas;
