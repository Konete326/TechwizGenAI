import { Sparkle } from "@phosphor-icons/react";

export const MODEL_TIERS = [
  { id: "gemini-3.7-flash", label: "Gemini 3.7 Flash (Latest Reasoning & Speed)" },
  { id: "gemini-3.6-flash", label: "Gemini 3.6 Flash (High Throughput & Vision)" },
  { id: "gemini-3.5-pro", label: "Gemini 3.5 Pro (Deep Multimodal Analysis)" },
  { id: "gemini-2.5-flash", label: "Gemini 2.5 Flash (Fast & Stable Default)" }
];

export function ModelSelector({ selectedModel, onSelectModel }) {
  return (
    <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-[var(--radius-sm)] bg-surface border border-border">
      <Sparkle size={13} className="text-purple-400 shrink-0" />
      <select
        value={selectedModel}
        onChange={(e) => onSelectModel(e.target.value)}
        className="bg-transparent text-text-primary text-xs font-medium focus:outline-none cursor-pointer pr-1"
        aria-label="Select Gemini Model Tier"
      >
        {MODEL_TIERS.map((tier) => (
          <option key={tier.id} value={tier.id} className="bg-surface-card text-text-primary">
            {tier.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export default ModelSelector;
