import { useState, useCallback, useEffect } from "react";
import { VITE_API_URL } from "@/config/env";

export function useChatSessions() {
  const [sessions, setSessions] = useState([]);
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const token = localStorage.getItem("token");

  const fetchSessions = useCallback(async (isSilent = false) => {
    if (!token) return;
    if (!isSilent) setIsLoading(true);
    try {
      const res = await fetch(`${VITE_API_URL}/ai/sessions`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) return null;
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        const incoming = data.data;
        setSessions((prev) => {
          const isSame =
            prev.length === incoming.length &&
            prev.every((p, i) => p.id === incoming[i].id && p.title === incoming[i].title && p.persona === incoming[i].persona);
          return isSame ? prev : incoming;
        });
        setActiveSessionId((curr) => {
          if (!curr) return incoming.length > 0 ? incoming[0].id : null;
          const exists = incoming.some((s) => s.id === curr);
          return exists ? curr : (incoming.length > 0 ? incoming[0].id : null);
        });
        if (incoming.length === 0) {
          setMessages([]);
        }
      }
    } catch {
      return null;
    } finally {
      if (!isSilent) setIsLoading(false);
    }
  }, [token]);

  const fetchMessages = useCallback(async (sessionId) => {
    if (!token || !sessionId) return;
    try {
      const res = await fetch(`${VITE_API_URL}/ai/sessions/${sessionId}/messages`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setMessages((prev) => {
          const incoming = data.data;
          if (prev.length === incoming.length && prev[prev.length - 1]?.text === incoming[incoming.length - 1]?.text) {
            return prev;
          }
          return incoming;
        });
      }
    } catch {
      return null;
    }
  }, [token]);

  useEffect(() => {
    fetchSessions();
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") {
        fetchSessions(true);
        if (activeSessionId) fetchMessages(activeSessionId);
      }
    }, 3000);

    const handleSync = () => {
      fetchSessions(true);
      if (activeSessionId) fetchMessages(activeSessionId);
    };
    window.addEventListener("focus", handleSync);
    window.addEventListener("storage", handleSync);
    document.addEventListener("visibilitychange", handleSync);

    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", handleSync);
      window.removeEventListener("storage", handleSync);
      document.removeEventListener("visibilitychange", handleSync);
    };
  }, [fetchSessions, fetchMessages, activeSessionId]);

  useEffect(() => {
    if (activeSessionId) {
      fetchMessages(activeSessionId);
    } else {
      setMessages([]);
    }
  }, [activeSessionId, fetchMessages]);

  const createSession = async (persona = "general") => {
    if (!token) return null;
    try {
      const res = await fetch(`${VITE_API_URL}/ai/sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ persona })
      });
      const data = await res.json();
      if (data.success && data.data?.id) {
        setSessions((prev) => [data.data, ...prev]);
        setActiveSessionId(data.data.id);
        setMessages([]);
        return data.data.id;
      }
    } catch {
      return null;
    }
    return null;
  };

  const deleteSession = async (sessionId) => {
    if (!token) return;
    try {
      await fetch(`${VITE_API_URL}/ai/sessions/${sessionId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
      if (activeSessionId === sessionId) {
        const remaining = sessions.filter((s) => s.id !== sessionId);
        if (remaining.length > 0) {
          setActiveSessionId(remaining[0].id);
        } else {
          setActiveSessionId(null);
          setMessages([]);
        }
      }
    } catch {
      return null;
    }
  };

  const renameSession = async (sessionId, newTitle) => {
    if (!token || !sessionId || !newTitle.trim()) return;
    try {
      const res = await fetch(`${VITE_API_URL}/ai/sessions/${sessionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ title: newTitle.trim() })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSessions((prev) => prev.map((s) => (s.id === sessionId ? { ...s, title: newTitle.trim() } : s)));
      }
    } catch {
      return null;
    }
  };

  const updateSessionPersona = async (sessionId, persona) => {
    if (!token || !sessionId || !persona) return;
    try {
      const res = await fetch(`${VITE_API_URL}/ai/sessions/${sessionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ persona })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSessions((prev) => prev.map((s) => (s.id === sessionId ? { ...s, persona } : s)));
      }
    } catch {
      return null;
    }
  };

  return {
    sessions,
    setSessions,
    activeSessionId,
    setActiveSessionId,
    messages,
    setMessages,
    isLoading,
    fetchSessions,
    createSession,
    deleteSession,
    renameSession,
    updateSessionPersona
  };
}

export default useChatSessions;
