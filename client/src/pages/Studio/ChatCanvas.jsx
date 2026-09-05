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
  onSelectChoice,
  isSidebarOpen = false
}) {
  const containerRef = useRef(null);
  const isAtBottomRef = useRef(true);
  const prevSessionIdRef = useRef(activeSession?.id);
  const { speakingMessageId, speak, stop } = useTextToSpeech();

  const handleScroll = () => {
    if (!containerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    isAtBottomRef.current = scrollHeight - scrollTop - clientHeight < 80;
  };

  useEffect(() => {
    if (isStreaming) stop();
  }, [isStreaming, stop]);

  useEffect(() => {
    stop();
    if (activeSession?.id !== prevSessionIdRef.current) {
      prevSessionIdRef.current = activeSession?.id;
      isAtBottomRef.current = true;
      if (containerRef.current) containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [activeSession?.id, stop]);

  useEffect(() => {
    const isNewUserMsg = messages.length > 0 && messages[messages.length - 1]?.role === "user";
    if (isNewUserMsg) isAtBottomRef.current = true;
    if (!isAtBottomRef.current) return;
    const frameId = requestAnimationFrame(() => {
      if (containerRef.current && isAtBottomRef.current) {
        containerRef.current.scrollTop = containerRef.current.scrollHeight;
      }
    });
    return () => cancelAnimationFrame(frameId);
  }, [messages, streamingText]);

  return (
    <div ref={containerRef} onScroll={handleScroll} className="flex-1 overflow-y-auto p-2 sm:p-4 md:p-6 space-y-4 sm:space-y-6">
      <div className="w-full space-y-4 sm:space-y-6">
        {messages.length === 0 && !isStreaming ? (
          <div className={`w-full ${isSidebarOpen ? "hidden md:block" : "block"}`}>
            <PersonaStarters persona={activePersona} onSelectStarter={onSendSuggested} />
          </div>
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
