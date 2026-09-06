import { useState, useEffect, useMemo } from "react";
import { AssetHeader } from "./AssetHeader";
import { AssetSearchFilter } from "./AssetSearchFilter";
import { AssetCard } from "./AssetCard";
import { AssetUploader } from "./AssetUploader";
import { AssetPreviewModal } from "./AssetPreviewModal";
import { AssetPagination } from "./AssetPagination";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/context/ToastContext";
import { useAssets } from "./useAssets";

const ITEMS_PER_PAGE = 4;

export function Assets() {
  const { assets, loading, isDeleting, handleUploadSuccess, handleDelete } = useAssets();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFormat, setSelectedFormat] = useState("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const [isUploaderOpen, setIsUploaderOpen] = useState(false);
  const [previewAsset, setPreviewAsset] = useState(null);
  const [assetToDelete, setAssetToDelete] = useState(null);
  const toast = useToast();

  const user = (() => {
    try {
      return JSON.parse(localStorage.getItem("user") || "{}");
    } catch {
      return {};
    }
  })();
  const isAdmin = user?.role === "admin";

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedFormat]);

  const handleConfirmDelete = async () => {
    if (!assetToDelete) return;
    await handleDelete(assetToDelete.id);
    setAssetToDelete(null);
    toast.success("Asset Deleted Successfully", 4000, "Asset Removed", "/assets");
  };

  const filteredAssets = useMemo(() => {
    let result = assets;
    if (selectedFormat !== "ALL") {
      result = result.filter((a) => a.format?.toLowerCase() === selectedFormat.toLowerCase());
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter((a) => {
        const titleMatch = (a.title || "").toLowerCase().includes(q);
        const ownerNameMatch = (a.ownerName || "").toLowerCase().includes(q);
        const ownerEmailMatch = (a.ownerEmail || "").toLowerCase().includes(q);
        return titleMatch || ownerNameMatch || ownerEmailMatch;
      });
    }
    return result;
  }, [assets, searchQuery, selectedFormat]);

  const totalPages = Math.ceil(filteredAssets.length / ITEMS_PER_PAGE) || 1;
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedAssets = useMemo(() => {
    return filteredAssets.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredAssets, startIndex]);

  return (
    <div className="w-full space-y-6 pb-12">
      <AssetHeader totalCount={assets.length} onOpenUpload={() => setIsUploaderOpen(true)} isAdmin={isAdmin} />

      <AssetSearchFilter
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        selectedFormat={selectedFormat}
        setSelectedFormat={setSelectedFormat}
        totalResults={filteredAssets.length}
      />

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-[var(--radius-md)] bg-surface-card border border-border p-3 space-y-3">
              <Skeleton className="h-36 w-full" />
              <div className="space-y-1.5">
                <Skeleton className="h-4 w-3/4" />
                <div className="flex justify-between">
                  <Skeleton className="h-3 w-12" /><Skeleton className="h-3 w-16" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : filteredAssets.length === 0 ? (
        <div className="p-12 text-center text-xs text-text-muted bg-surface-card border border-border rounded-[var(--radius-md)]">
          No media assets found matching your criteria.
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            {paginatedAssets.map((asset) => (
              <AssetCard key={asset.id} asset={asset} onPreview={setPreviewAsset} onDelete={setAssetToDelete} isAdmin={isAdmin} />
            ))}
          </div>

          <AssetPagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={filteredAssets.length}
            startIndex={startIndex}
            endIndex={startIndex + ITEMS_PER_PAGE}
            onPageChange={setCurrentPage}
          />
        </div>
      )}

      <AssetUploader
        isOpen={isUploaderOpen}
        onClose={() => setIsUploaderOpen(false)}
        onUploadSuccess={(newAsset) => {
          handleUploadSuccess(newAsset);
          setCurrentPage(1);
        }}
      />
      <AssetPreviewModal asset={previewAsset} onClose={() => setPreviewAsset(null)} />
      <ConfirmModal
        isOpen={!!assetToDelete}
        onClose={() => setAssetToDelete(null)}
        onConfirm={handleConfirmDelete}
        title="Delete Asset"
        description="Are you sure you want to permanently delete this asset?"
        confirmText="Delete"
        isDestructive={true}
        isLoading={isDeleting}
      />
    </div>
  );
}

export default Assets;
