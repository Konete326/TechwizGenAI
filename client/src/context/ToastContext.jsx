import { createContext, useContext, useState, useCallback, useEffect } from "react";
import { ToastContainer } from "@/components/ui/Toast";
import { VITE_API_URL } from "@/config/env";

const ToastContext = createContext(null);
const NotificationContext = createContext(null);

export const resolveNotificationLink = (t = "", m = "") => {
  const s = `${t} ${m}`.toLowerCase();
  if (/asset|upload|storage|media|delete/.test(s)) return "/assets";
  if (/studio|engine|gemini|prompt|generation/.test(s)) return "/studio";
  if (/profile|photo|session|sameer|account/.test(s)) return "/profile";
  if (/user|directory|role|status/.test(s)) return "/users";
  if (/setting|theme|config|key/.test(s)) return "/settings";
  return "/dashboard";
};

const formatRelativeTime = (d) => {
  if (!d) return "Just now";
  const diff = Math.floor((Date.now() - new Date(d)) / 1000);
  if (diff < 60) return "Just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return new Date(d).toLocaleDateString();
};

const apiCall = async (endpoint, method) => {
  const token = localStorage.getItem("token");
  if (!token) return null;
  try {
    return await fetch(`${VITE_API_URL}${endpoint}`, {
      method,
      headers: { Authorization: `Bearer ${token}` }
    });
  } catch {
    return null;
  }
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const [notifications, setNotifications] = useState([]);

  const fetchNotifications = useCallback(async () => {
    const res = await apiCall("/notifications", "GET");
    if (res && res.ok) {
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setNotifications(
          data.data.map((n) => ({
            ...n,
            readStatus: n.isRead,
            timestamp: formatRelativeTime(n.createdAt)
          }))
        );
      }
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
    window.addEventListener("storage", fetchNotifications);
    return () => window.removeEventListener("storage", fetchNotifications);
  }, [fetchNotifications]);

  const addToast = useCallback((message, type = "info", duration = 4000, title, href) => {
    const id = "tmp-" + Date.now();
    const resolvedTitle = title || (type === "success" ? "Success" : type === "error" ? "System Alert" : "Update");
    const resolvedHref = href || resolveNotificationLink(resolvedTitle, message);

    setToasts((prev) => [...prev, { id, message, type, title: resolvedTitle }]);

    const newLocalNotif = {
      id,
      title: resolvedTitle,
      message,
      type,
      readStatus: false,
      isRead: false,
      timestamp: "Just now",
      href: resolvedHref,
      link: resolvedHref,
    };
    setNotifications((prev) => [newLocalNotif, ...prev.slice(0, 19)]);

    const token = localStorage.getItem("token");
    if (token) {
      fetch(`${VITE_API_URL}/notifications`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ title: resolvedTitle, message, type, href: resolvedHref })
      })
        .then((r) => r.json())
        .then((data) => {
          if (data.success && data.data?.id) {
            setNotifications((prev) =>
              prev.map((n) => (n.id === id ? { ...n, id: data.data.id } : n))
            );
          }
        })
        .catch(() => {});
    }

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, duration);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const markAllAsRead = useCallback(async () => {
    await apiCall("/notifications/read-all", "PATCH");
    setNotifications((prev) => prev.map((n) => ({ ...n, readStatus: true, isRead: true })));
  }, []);

  const markAsRead = useCallback(async (id) => {
    if (typeof id === "string" && !id.startsWith("tmp-")) {
      await apiCall(`/notifications/${id}/read`, "PATCH");
    }
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, readStatus: true, isRead: true } : n)));
  }, []);

  const removeNotification = useCallback(async (id) => {
    if (typeof id === "string" && !id.startsWith("tmp-")) {
      await apiCall(`/notifications/${id}`, "DELETE");
    }
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const clearNotifications = useCallback(async () => {
    await apiCall("/notifications", "DELETE");
    setNotifications([]);
  }, []);

  const toast = {
    success: (msg, dur, title, href) => addToast(msg, "success", dur, title, href),
    error: (msg, dur, title, href) => addToast(msg, "error", dur, title, href),
    info: (msg, dur, title, href) => addToast(msg, "info", dur, title, href),
  };

  const notificationValue = {
    notifications,
    unreadCount: notifications.filter((n) => !n.readStatus).length,
    markAllAsRead,
    markAsRead,
    removeNotification,
    clearNotifications,
  };

  return (
    <ToastContext.Provider value={toast}>
      <NotificationContext.Provider value={notificationValue}>
        {children}
        <ToastContainer toasts={toasts} onRemove={removeToast} />
      </NotificationContext.Provider>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used within ToastProvider");
  return context;
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) throw new Error("useNotifications must be used within ToastProvider");
  return context;
}

export default ToastProvider;
