import { useEffect, useRef, useState } from "react";
import { api } from "./api";

/**
 * DriverPortal — accessed by drivers after logging in with ROLE_DRIVER.
 * Uses browser navigator.geolocation to send real GPS pings to the backend.
 */
export default function DriverPortal({ session, onLogout }) {
  const [driver, setDriver] = useState(null);
  const [deliveries, setDeliveries] = useState([]);
  const [gpsStatus, setGpsStatus] = useState("idle"); // idle | tracking | error
  const [lastPing, setLastPing] = useState(null);
  const [message, setMessage] = useState("");
  const watchId = useRef(null);

  useEffect(() => {
    loadData();
    return () => stopTracking();
  }, []);

  async function loadData() {
    try {
      const [driverData, deliveryData] = await Promise.all([
        api("/driver/me"),
        api("/driver/deliveries"),
      ]);
      setDriver(driverData);
      setDeliveries(deliveryData);
    } catch (e) {
      setMessage(e.message);
    }
  }

  function startTracking() {
    if (!navigator.geolocation) {
      setGpsStatus("error");
      setMessage("GPS not supported on this device/browser.");
      return;
    }
    setGpsStatus("tracking");
    watchId.current = navigator.geolocation.watchPosition(
      async (pos) => {
        try {
          const result = await api("/driver/location", {
            method: "POST",
            body: JSON.stringify({
              latitude: pos.coords.latitude,
              longitude: pos.coords.longitude,
              speedKmh: pos.coords.speed
                ? pos.coords.speed * 3.6  // m/s → km/h
                : null,
            }),
          });
          setLastPing(result);
        } catch (e) {
          setMessage("GPS ping failed: " + e.message);
        }
      },
      (err) => {
        setGpsStatus("error");
        setMessage("GPS error: " + err.message);
      },
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 15000 }
    );
  }

  function stopTracking() {
    if (watchId.current != null) {
      navigator.geolocation.clearWatch(watchId.current);
      watchId.current = null;
    }
    setGpsStatus("idle");
  }

  async function updateStatus(taskId, status) {
    try {
      await api(`/driver/deliveries/${taskId}/status?status=${status}`, {
        method: "PATCH",
      });
      setMessage(`Delivery marked ${status.replace("_", " ").toLowerCase()}.`);
      loadData();
    } catch (e) {
      setMessage(e.message);
    }
  }

  const STATUS_COLOR = {
    UNASSIGNED: "#94a3b8",
    DISPATCHED: "#3b82f6",
    IN_TRANSIT: "#f59e0b",
    DELIVERED: "#22c55e",
    FAILED: "#ef4444",
  };

  return (
    <div className="driver-portal">
      <header className="driver-header">
        <div>
          <h1>🚛 Driver Portal</h1>
          {driver && <p>Welcome, <strong>{driver.name}</strong></p>}
        </div>
        <button onClick={onLogout} className="secondary small">Sign out</button>
      </header>

      {message && (
        <div className="notice" onClick={() => setMessage("")}>
          {message} <b>×</b>
        </div>
      )}

      {/* GPS Tracking Panel */}
      <section className="card gps-panel">
        <div className="card-title">
          <h2>📍 GPS Tracking</h2>
          <span className={`gps-status ${gpsStatus}`}>
            {gpsStatus === "tracking" ? "🟢 Live" : gpsStatus === "error" ? "🔴 Error" : "⚫ Off"}
          </span>
        </div>

        {gpsStatus !== "tracking" ? (
          <button className="primary" onClick={startTracking}>
            Start GPS Tracking
          </button>
        ) : (
          <button className="secondary" onClick={stopTracking}>
            Stop Tracking
          </button>
        )}

        {lastPing && (
          <div className="gps-info">
            <p>📍 {lastPing.latitude?.toFixed(5)}, {lastPing.longitude?.toFixed(5)}</p>
            {lastPing.speedKmh && <p>⚡ {lastPing.speedKmh?.toFixed(1)} km/h</p>}
            <p>🕐 {new Date(lastPing.recordedAt).toLocaleTimeString("en-IN")}</p>
          </div>
        )}

        <p className="gps-note">
          Your phone GPS will send your location to the dispatcher's live map automatically.
        </p>
      </section>

      {/* Today's Deliveries */}
      <section className="card">
        <div className="card-title">
          <h2>📦 My Deliveries</h2>
          <span className="count">{deliveries.length} stops</span>
        </div>

        {deliveries.length === 0 ? (
          <div className="no-data">No deliveries assigned yet.</div>
        ) : (
          <div className="driver-delivery-list">
            {deliveries.map((task) => (
              <article key={task.id} className="driver-task">
                <div className="task-seq">{task.stopSequence ?? "—"}</div>
                <div className="task-info">
                  <strong>{task.customerName}</strong>
                  <p>{task.address}</p>
                  <small>{task.weightKg} kg</small>
                  {task.windowStart && (
                    <small className="window-hint">
                      🕐 {new Date(task.windowStart).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                      {" – "}
                      {new Date(task.windowEnd).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                    </small>
                  )}
                </div>
                <div className="task-actions">
                  <span
                    className="status"
                    style={{ background: STATUS_COLOR[task.status] + "22", color: STATUS_COLOR[task.status] }}
                  >
                    {task.status.replace("_", " ")}
                  </span>
                  {task.status === "DISPATCHED" && (
                    <button className="primary small" onClick={() => updateStatus(task.id, "IN_TRANSIT")}>
                      ▶ Start
                    </button>
                  )}
                  {task.status === "IN_TRANSIT" && (
                    <button className="primary small" onClick={() => updateStatus(task.id, "DELIVERED")}>
                      ✓ Done
                    </button>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
