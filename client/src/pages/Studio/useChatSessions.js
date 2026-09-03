import { useState, useCallback, useEffect } from "react";
import { VITE_API_URL } from "@/config/env";

export function useChatSessions() {
  const [sessions, setSessions] = useState([]);
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const token = localStorage.getItem("token");

  const fetchSessions = useCallback(async () => {
    if (!token) return;
    setIsLoading(true);
    try {
      const res = await fetch(`${VITE_API_URL}/ai/sessions`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setSessions(data.data);
        setActiveSessionId((curr) => curr || (data.data.length > 0 ? data.data[0].id : null));
      }
    } catch {
      return null;
    } finally {
      setIsLoading(false);
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
        setMessages(data.data);
      }
    } catch {
      return null;
    }
  }, [token]);

  useEffect(() => {
    fetchSessions();
  }, []);

  useEffect(() => {
    if (activeSessionId) {
      fetchMessages(activeSessionId);
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
