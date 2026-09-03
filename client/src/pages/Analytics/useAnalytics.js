import { useState, useEffect, useCallback } from "react";
import { VITE_API_URL } from "@/config/env";

export function useAnalytics() {
  const user = (() => {
    try {
      return JSON.parse(localStorage.getItem("user") || "{}");
    } catch {
      return {};
    }
  })();
  const isAdmin = user?.role === "admin";

  const [metrics, setMetrics] = useState(null);
  const [userList, setUserList] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchUserList = useCallback(async () => {
    if (!isAdmin) return;
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${VITE_API_URL}/analytics/admin/users`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const json = await res.json();
      if (json.success) setUserList(json.data || []);
    } catch {}
  }, [isAdmin]);

  const fetchMetrics = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem("token");
      let url = `${VITE_API_URL}/analytics/me`;
      if (isAdmin) {
        url = `${VITE_API_URL}/analytics/admin${selectedUserId !== "all" ? `?userId=${selectedUserId}` : ""}`;
      }
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message || "Failed to load metrics");
      setMetrics(json.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [isAdmin, selectedUserId]);

  useEffect(() => {
    if (isAdmin) fetchUserList();
  }, [isAdmin, fetchUserList]);

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  return {
    metrics,
    userList,
    selectedUserId,
    setSelectedUserId,
    loading,
    error,
    refresh: fetchMetrics,
    isAdmin
  };
}

export default useAnalytics;
