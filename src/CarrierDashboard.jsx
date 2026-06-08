import { useEffect, useState } from "react";
import { api, clearSession } from "./api";
import NotificationBell from "./NotificationBell";
import ShipmentBidPanel from "./ShipmentBidPanel";

/**
 * CarrierDashboard
 * Shown to users with ROLE_CARRIER.
 * Carriers can browse open shipments, place bids, and track bid outcomes.
 * They cannot access fleet management, dispatch, or analytics — those are
 * SHIPPER-only features.
 */
export default function CarrierDashboard({ session, onLogout }) {
  const [tab, setTab]       = useState("shipments");
  const [notice, setNotice] = useState("");

  const TABS = [
    ["shipments", "🤝 Shipments"],
    ["profile",   "👤 Profile"],
  ];

  function handleLogout() {
    clearSession();
    onLogout();
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand"><span>FF</span> FleetFlow</div>
        <nav>
          {TABS.map(([id, label]) => (
            <button
              key={id}
              className={tab === id ? "active" : ""}
              onClick={() => setTab(id)}
            >
              {label}
            </button>
          ))}
        </nav>
        <div className="user-card">
          <div className="avatar">{session.companyName?.charAt(0) || "C"}</div>
          <div>
            <strong>{session.companyName}</strong>
            {/* BUG FIX: display actual role label, not hardcoded "SHIPPER" */}
            <small>Carrier</small>
          </div>
          <button onClick={handleLogout}>Sign out</button>
        </div>
      </aside>

      <main className="workspace">
        <header>
          <div>
            <p className="eyebrow">Carrier portal</p>
            <h1>{TABS.find(([id]) => id === tab)?.[1] ?? tab}</h1>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <NotificationBell />
            <div className="live-pill"><span /> Systems online</div>
          </div>
        </header>

        {notice && (
          <button className="notice" onClick={() => setNotice("")}>
            {notice}<b> ×</b>
          </button>
        )}

        {tab === "shipments" && <ShipmentBidPanel session={session} />}

        {tab === "profile" && (
          <section className="card" style={{ maxWidth: "480px" }}>
            <div className="card-title"><h2>Account profile</h2></div>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", padding: "1rem 0" }}>
              <ProfileRow label="Company"   value={session.companyName} />
              <ProfileRow label="Email"     value={session.email} />
              {/* BUG FIX: show actual role from JWT, strip ROLE_ prefix */}
              <ProfileRow label="Role"      value={session.role?.replace("ROLE_", "")} />
              <ProfileRow label="User ID"   value={session.userId} mono />
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

function ProfileRow({ label, value, mono }) {
  return (
    <div style={{ display: "flex", gap: "1rem", alignItems: "flex-start" }}>
      <span style={{ minWidth: "90px", color: "var(--text-muted)", fontSize: "0.85rem" }}>{label}</span>
      <span style={{ fontFamily: mono ? "monospace" : "inherit", wordBreak: "break-all" }}>{value || "—"}</span>
    </div>
  );
}
