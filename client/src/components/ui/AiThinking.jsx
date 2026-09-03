import { useState, useEffect, useRef } from "react";
import { Sparkle } from "@phosphor-icons/react";
import { Spinner } from "./spinner";
import { Card, CardContent } from "./Card";
import { cn } from "@/lib/utils";

const DEFAULT_THINKING_STEPS = [
  "Analyzing token distribution and query parameters...",
  "Querying neural semantic index for contextual vectors...",
  "Synthesizing deep reasoning paths across constraints...",
  "Validating format contract against schema requirements...",
  "Streaming generated response through pipeline..."
];

function useTimer() {
  const [seconds, setSeconds] = useState("0.0");

  useEffect(() => {
    const startTime = Date.now();
    const interval = setInterval(() => {
      setSeconds(((Date.now() - startTime) / 1000).toFixed(1));
    }, 100);
    return () => clearInterval(interval);
  }, []);

  return seconds;
}

function useAutoScroll(scrollRef) {
  useEffect(() => {
    if (!scrollRef.current) return;
    const el = scrollRef.current;
    const interval = setInterval(() => {
      el.scrollTop += 1;
      if (el.scrollTop + el.clientHeight >= el.scrollHeight) {
        el.scrollTop = 0;
      }
    }, 45);
    return () => clearInterval(interval);
  }, [scrollRef]);
}

function FadeOverlay() {
  return (
    <>
      <div className="pointer-events-none absolute inset-x-0 top-0 h-4 bg-gradient-to-b from-surface-card to-transparent z-10" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-4 bg-gradient-to-t from-surface-card to-transparent z-10" />
    </>
  );
}

function ThinkingHeader({ elapsed }) {
  return (
    <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-border/60 bg-surface/40">
      <div className="flex items-center gap-2">
        <Spinner className="w-3.5 h-3.5 text-accent" />
        <span className="text-xs font-semibold text-text-primary flex items-center gap-1.5">
          <Sparkle size={13} className="text-purple-400" />
          Thinking Process
        </span>
      </div>
      <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-surface border border-border text-text-muted">
        {elapsed}s
      </span>
    </div>
  );
}

export function AiThinking({ className, steps = DEFAULT_THINKING_STEPS }) {
  const elapsed = useTimer();
  const scrollRef = useRef(null);
  useAutoScroll(scrollRef);

  return (
    <div className="flex w-full justify-start animate-in fade-in-50 duration-200">
      <Card className={cn("max-w-sm md:max-w-md w-full border border-border bg-surface-card shadow-sm rounded-2xl rounded-tl-sm overflow-hidden py-0 gap-0", className)}>
        <div className="relative h-0.5 w-full bg-border overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-accent to-transparent animate-shimmer" />
        </div>

        <ThinkingHeader elapsed={elapsed} />

        <CardContent className="relative p-0 h-24 overflow-hidden">
          <FadeOverlay />
          <div
            ref={scrollRef}
            className="h-full overflow-y-auto px-4 py-3 space-y-2 no-scrollbar"
          >
            {steps.concat(steps).map((step, idx) => (
              <div
                key={idx}
                className="flex items-center gap-2 text-[11px] font-mono text-text-muted leading-relaxed"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-accent/60 shrink-0" />
                <span className="truncate">{step}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default AiThinking;
