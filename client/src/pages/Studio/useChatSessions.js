import { useState, useCallback, useEffect, useRef } from "react";
import { VITE_API_URL } from "@/config/env";
import { useChatSessionsMutations } from "./useChatSessionsMutations";
export function useChatSessions({ isStreaming = false } = {}) {
  const [sessions, setSessions] = useState([]);
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const token = localStorage.getItem("token");
  const activeSessionIdRef = useRef(activeSessionId);
  const isStreamingRef = useRef(isStreaming);
  const [prevActiveSessionId, setPrevActiveSessionId] = useState(activeSessionId);
  if (activeSessionId !== prevActiveSessionId) {
    setPrevActiveSessionId(activeSessionId);
    setMessages([]);
  }
  
  useEffect(() => {
    activeSessionIdRef.current = activeSessionId;
  }, [activeSessionId]);
  useEffect(() => {
    isStreamingRef.current = isStreaming;
  }, [isStreaming]);

  const fetchSessions = useCallback(async (isSilent = false) => {
    if (!token) return;
    if (!isSilent) setIsLoading(true);
    try {
      const res = await fetch(`${VITE_API_URL}/ai/sessions`, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) return null;
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        const incoming = data.data;
        setSessions((prev) => {
          const isSame = prev.length === incoming.length && prev.every((p, i) => p.id === incoming[i].id && p.title === incoming[i].title && p.persona === incoming[i].persona);
          return isSame ? prev : incoming;
        });
        setActiveSessionId((curr) => {
          if (!curr) return incoming.length > 0 ? incoming[0].id : null;
          return incoming.some((s) => s.id === curr) ? curr : (incoming.length > 0 ? incoming[0].id : null);
        });
        if (incoming.length === 0) setMessages([]);
      }
    } catch (err) {
      console.error("Failed to fetch sessions:", err);
      return null;
    } finally {
      if (!isSilent) setIsLoading(false);
    }
  }, [token]);

  const fetchMessages = useCallback(async (sessionId, force = false) => {
    if (!token || !sessionId) return;
    if (isStreamingRef.current && !force) return;
    try {
      const res = await fetch(`${VITE_API_URL}/ai/sessions/${sessionId}/messages`, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) return;
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        if (activeSessionIdRef.current !== sessionId) return;
        const incoming = data.data;
        setMessages((prev) => {
          const pendingOptimistic = prev.filter((m) => {
            const isOpt = String(m.id || "").startsWith("usr-") || String(m.id || "").startsWith("ai-") || Boolean(m.isOptimistic);
            if (!isOpt) return false;
            return !incoming.some((inc) => {
              if (inc.role !== m.role) return false;
              if (inc.text?.trim() === m.text?.trim()) return true;
              if (m.role === "user" && m.attachment && inc.attachment) return true;
              if (m.role === "user" && m.images?.length && inc.attachment) return true;
              return false;
            });
          });
          const merged = pendingOptimistic.length > 0 ? [...incoming, ...pendingOptimistic] : incoming;
          if (prev.length === merged.length) {
            const isSame = prev.every((m, idx) => {
              const other = merged[idx];
              return (m.id || m._id) === (other.id || other._id) && m.text === other.text && m.attachmentDeleted === other.attachmentDeleted;
            });
            if (isSame) return prev;
          }
          return merged;
        });
      }
    } catch (err) {
      console.error("Failed to fetch messages:", err);
      return null;
    }
  }, [token]);

  useEffect(() => {
    fetchSessions();
    const interval = setInterval(() => {
      if (document.visibilityState === "visible" && !isStreamingRef.current) {
        fetchSessions(true);
        if (activeSessionIdRef.current) fetchMessages(activeSessionIdRef.current);
      }
    }, 4000);

    const handleSync = () => {
      if (!isStreamingRef.current) {
        fetchSessions(true);
        if (activeSessionIdRef.current) fetchMessages(activeSessionIdRef.current);
      }
    };
    window.addEventListener("focus", handleSync);
    window.addEventListener("storage", handleSync);
    window.addEventListener("asset_deleted", handleSync);
    document.addEventListener("visibilitychange", handleSync);

    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", handleSync);
      window.removeEventListener("storage", handleSync);
      window.removeEventListener("asset_deleted", handleSync);
      document.removeEventListener("visibilitychange", handleSync);
    };
  }, [fetchSessions, fetchMessages]);

  useEffect(() => {
    if (activeSessionId) {
      fetchMessages(activeSessionId, true);
    }
  }, [activeSessionId, fetchMessages]);

  const { createSession, deleteSession, renameSession, updateSessionPersona } = useChatSessionsMutations({ token, sessions, setSessions, activeSessionId, setActiveSessionId, setMessages });

  return {
    sessions, setSessions, activeSessionId, setActiveSessionId,
    messages, setMessages, isLoading, fetchSessions,
    createSession, deleteSession, renameSession, updateSessionPersona
  };
}

export default useChatSessions;
