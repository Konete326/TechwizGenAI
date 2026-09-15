import { MagnifyingGlass, X } from "@phosphor-icons/react";

export function AssetSearchFilter({
  searchQuery,
  setSearchQuery,
  selectedFormat,
  setSelectedFormat,
  totalResults
}) {
  const filterTabs = [
    { id: "ALL", label: "ALL", target: "asset_filter_all" },
    { id: "IMAGES", label: "Images", target: "asset_filter_images" },
    { id: "DOCUMENTS", label: "Docs", target: "asset_filter_documents" },
    { id: "PNG", label: "PNG" },
    { id: "JPG", label: "JPG" },
    { id: "WEBP", label: "WEBP" }
  ];

  return (
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 rounded-[var(--radius-md)] bg-surface-card border border-border">
      <div className="relative flex-1">
        <MagnifyingGlass size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
        <input
          type="text"
          data-nesa-target="asset_search"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search assets by regex or title..."
          className="w-full h-9 pl-9 pr-8 text-xs bg-surface border border-border rounded-[var(--radius-sm)] text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => setSearchQuery("")}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-text-muted hover:text-text-primary"
            aria-label="Clear search"
          >
            <X size={14} />
          </button>
        )}
      </div>

      <div data-nesa-target="asset_filter" className="flex items-center gap-1.5 overflow-x-auto">
        {filterTabs.map((item) => (
          <button
            key={item.id}
            type="button"
            data-nesa-target={item.target}
            onClick={() => setSelectedFormat(item.id)}
            className={`px-2.5 py-1.5 rounded-[var(--radius-sm)] text-[11px] font-mono font-medium transition-colors ${
              selectedFormat === item.id
                ? "bg-accent text-white font-semibold"
                : "bg-surface text-text-muted hover:text-text-primary border border-border"
            }`}
          >
            {item.label}
          </button>
        ))}
        <span className="text-[11px] font-mono text-text-muted pl-2 whitespace-nowrap">
          {totalResults} matched
        </span>
      </div>
    </div>
  );
}

export default AssetSearchFilter;
