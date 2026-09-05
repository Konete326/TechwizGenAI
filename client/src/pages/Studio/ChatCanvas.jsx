import { useRef, useEffect } from "react";
import { MessageBubble } from "./MessageBubble";
import { AiThinking } from "@/components/ui/AiThinking";
import { useTextToSpeech } from "./useTextToSpeech";
import { PersonaStarters } from "./PersonaStarters";

export function ChatCanvas({
  messages,
  activeSession,
  activePersona = "general",
  isStreaming,
  streamingText,
  onEdit,
  onRegenerate,
  onSendSuggested,
  onOpenArtifact,
  onSelectChoice
}) {
  const containerRef = useRef(null);
  const scrollBottomRef = useRef(null);
  const { speakingMessageId, speak, stop } = useTextToSpeech();

  useEffect(() => {
    if (isStreaming) {
      stop();
    }
  }, [isStreaming, stop]);

  useEffect(() => {
    stop();
  }, [activeSession?.id, stop]);

  useEffect(() => {
    const frameId = requestAnimationFrame(() => {
      if (containerRef.current) {
        containerRef.current.scrollTop = containerRef.current.scrollHeight;
      }
    });
    return () => cancelAnimationFrame(frameId);
  }, [messages, streamingText]);

  return (
    <div ref={containerRef} className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
      <div className="w-full space-y-6">
        {messages.length === 0 && !isStreaming ? (
          <PersonaStarters persona={activePersona} onSelectStarter={onSendSuggested} />
        ) : (
          messages.map((m) => (
            <MessageBubble
              key={m.id || m._id}
              message={m}
              onEdit={onEdit}
              onRegenerate={onRegenerate}
              isStreaming={false}
              onOpenArtifact={onOpenArtifact}
              onSpeak={speak}
              isSpeakingThisMessage={speakingMessageId === (m.id || m._id)}
              onSelectChoice={onSelectChoice}
            />
          ))
        )}

        {isStreaming && (
          streamingText ? (
            <MessageBubble
              message={{ id: "streaming-temp", role: "model", text: streamingText }}
              isStreaming={true}
              onOpenArtifact={onOpenArtifact}
              onSelectChoice={onSelectChoice}
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
