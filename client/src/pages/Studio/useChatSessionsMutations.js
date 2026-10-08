import { VITE_API_URL } from "@/config/env";

export function useChatSessionsMutations({ token, sessions, setSessions, activeSessionId, setActiveSessionId, setMessages }) {
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
      await fetch(`${VITE_API_URL}/ai/sessions/${sessionId}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
      if (activeSessionId === sessionId) {
        const remaining = sessions.filter((s) => s.id !== sessionId);
        if (remaining.length > 0) setActiveSessionId(remaining[0].id);
        else { setActiveSessionId(null); setMessages([]); }
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

  return { createSession, deleteSession, renameSession, updateSessionPersona };
}
