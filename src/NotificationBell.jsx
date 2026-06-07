import { useEffect, useRef, useState } from "react";
import { api } from "./api";

export default function NotificationBell() {
  const [notifications, setNotifications] = useState([]);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  async function load() {
    try {
      const [list, countData] = await Promise.all([
        api("/notifications"),
        api("/notifications/unread-count"),
      ]);
      setNotifications(list.slice(0, 10)); // show last 10
      setUnread(countData.count);
    } catch (_) {}
  }

  async function markRead(id) {
    try {
      await api(`/notifications/${id}/read`, { method: "PATCH" });
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
      setUnread((prev) => Math.max(0, prev - 1));
    } catch (_) {}
  }

  async function markAllRead() {
    try {
      await api("/notifications/read-all", { method: "POST" });
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnread(0);
    } catch (_) {}
  }

  // Close on outside click
  useEffect(() => {
    function handler(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 60_000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="notification-bell" ref={ref}>
      <button
        className={`bell-btn ${unread > 0 ? "has-unread" : ""}`}
        onClick={() => setOpen((v) => !v)}
        title="Notifications"
      >
        🔔
        {unread > 0 && <span className="badge">{unread > 99 ? "99+" : unread}</span>}
      </button>

      {open && (
        <div className="notification-dropdown">
          <div className="notif-header">
            <strong>Notifications</strong>
            {unread > 0 && (
              <button className="mark-all" onClick={markAllRead}>
                Mark all read
              </button>
            )}
          </div>
          {notifications.length === 0 ? (
            <div className="notif-empty">No notifications yet.</div>
          ) : (
            <ul className="notif-list">
              {notifications.map((n) => (
                <li
                  key={n.id}
                  className={`notif-item ${n.read ? "read" : "unread"}`}
                  onClick={() => !n.read && markRead(n.id)}
                >
                  {!n.read && <span className="unread-dot" />}
                  <div className="notif-body">
                    <strong>{n.title}</strong>
                    <p>{n.body}</p>
                    <time>{new Date(n.createdAt).toLocaleString("en-IN")}</time>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
