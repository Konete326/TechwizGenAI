import { ArrowRight } from "@phosphor-icons/react";

export function ChoiceChips({ choices = [], onSelectChoice, disabled = false }) {
  if (!Array.isArray(choices) || choices.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2 pt-2.5 mt-1 border-t border-border/40">
      {choices.map((choice, idx) => {
        const text = (choice || "").trim();
        if (!text) return null;

        return (
          <button
            key={`${idx}-${text}`}
            type="button"
            disabled={disabled}
            onClick={() => onSelectChoice && onSelectChoice(text)}
            className={`bg-surface-elevated hover:bg-surface-elevated/80 border border-border hover:border-zinc-500 text-text-primary text-xs px-3 py-1.5 rounded-full transition-all duration-150 flex items-center gap-1.5 active:scale-95 ${
              disabled ? "opacity-50 pointer-events-none cursor-not-allowed" : "cursor-pointer"
            }`}
          >
            <span>{text}</span>
            <ArrowRight size={11} className="text-accent shrink-0" />
          </button>
        );
      })}
    </div>
  );
}

export default ChoiceChips;
