import { useState, useEffect } from "react";
import { VITE_API_URL } from "@/config/env";

export function useAssets() {
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchAssets = async () => {
    const token = localStorage.getItem("token");
    if (!token) return;
    try {
      const res = await fetch(`${VITE_API_URL}/assets`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        let assetList = data.data;
        let storedUser = JSON.parse(localStorage.getItem("user") || "{}");
        if (storedUser?.profileImage && storedUser.profileImage.includes("unsplash.com")) {
          storedUser.profileImage = "";
          localStorage.setItem("user", JSON.stringify(storedUser));
        }
        if (storedUser?.profileImage && !assetList.some((a) => a.url === storedUser.profileImage || a.publicId?.startsWith("avatar_"))) {
          assetList = [
            {
              id: "avatar-" + (storedUser.id || "admin"),
              title: `${storedUser.name || "Admin"} Profile Picture`,
              url: storedUser.profileImage,
              publicId: "avatar_" + (storedUser.id || "admin"),
              format: "png",
              bytes: 42800,
              createdAt: storedUser.createdAt || new Date().toISOString()
            },
            ...assetList
          ];
        }
        setAssets(assetList);
        const totalBytes = assetList.reduce((acc, curr) => acc + (curr.bytes || 0), 0);
        localStorage.setItem("platform_usage_bytes", String(totalBytes));
        window.dispatchEvent(new CustomEvent("storage_updated", { detail: { bytes: totalBytes } }));
      }
    } catch {
      return;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssets();
    const interval = setInterval(fetchAssets, 4000);
    const handleSync = () => fetchAssets();
    window.addEventListener("profile_updated", handleSync);
    window.addEventListener("asset_uploaded", handleSync);
    window.addEventListener("focus", handleSync);
    return () => {
      clearInterval(interval);
      window.removeEventListener("profile_updated", handleSync);
      window.removeEventListener("asset_uploaded", handleSync);
      window.removeEventListener("focus", handleSync);
    };
  }, []);

  const handleUploadSuccess = (newAsset) => {
    setAssets((prev) => [newAsset, ...prev]);
    const addedBytes = newAsset.bytes || 0;
    const currentBytes = Number(localStorage.getItem("platform_usage_bytes") || 0);
    const nextBytes = currentBytes + addedBytes;
    localStorage.setItem("platform_usage_bytes", String(nextBytes));
    window.dispatchEvent(new CustomEvent("storage_updated", { detail: { bytes: nextBytes } }));
    window.dispatchEvent(new CustomEvent("asset_uploaded"));
  };

  const handleDelete = async (assetId) => {
    if (assetId.startsWith("avatar-")) {
      const storedUser = JSON.parse(localStorage.getItem("user") || "{}");
      storedUser.profileImage = "";
      localStorage.setItem("user", JSON.stringify(storedUser));
      window.dispatchEvent(new CustomEvent("profile_updated", { detail: storedUser }));
    }

    const token = localStorage.getItem("token");
    if (!token) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`${VITE_API_URL}/assets/${assetId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setAssets((prev) => {
          const removed = prev.find((a) => a.id === assetId);
          if (removed) {
            const currentBytes = Number(localStorage.getItem("platform_usage_bytes") || 0);
            const nextBytes = Math.max(0, currentBytes - (removed.bytes || 0));
            localStorage.setItem("platform_usage_bytes", String(nextBytes));
            window.dispatchEvent(new CustomEvent("storage_updated", { detail: { bytes: nextBytes } }));
          }
          return prev.filter((a) => a.id !== assetId);
        });
      }
    } catch {
      return;
    } finally {
      setIsDeleting(false);
    }
  };

  return {
    assets,
    setAssets,
    loading,
    isDeleting,
    fetchAssets,
    handleUploadSuccess,
    handleDelete
  };
}

export default useAssets;
