import { useState, useEffect, useCallback } from "react";
import { VITE_API_URL } from "@/config/env";

export function useDashboardData() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem("token");
      const res = await fetch(`${VITE_API_URL}/dashboard/stats`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });

      if (!res.ok) {
        throw new Error(`Failed to load dashboard telemetry (${res.status})`);
      }

      const json = await res.json();
      if (json.success && json.data) {
        setStats(json.data);
      } else {
        throw new Error(json.message || "Failed to load dashboard stats");
      }
    } catch (err) {
      setError(err.message || "Network error loading dashboard");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();

    const handleUpdate = () => fetchStats();
    window.addEventListener("storage_updated", handleUpdate);
    window.addEventListener("asset_uploaded", handleUpdate);
    window.addEventListener("storage", handleUpdate);

    return () => {
      window.removeEventListener("storage_updated", handleUpdate);
      window.removeEventListener("asset_uploaded", handleUpdate);
      window.removeEventListener("storage", handleUpdate);
    };
  }, [fetchStats]);

  return {
    stats,
    loading,
    error,
    refetch: fetchStats
  };
}

export default useDashboardData;
