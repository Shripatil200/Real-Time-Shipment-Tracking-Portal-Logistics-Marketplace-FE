import { useEffect, useState } from "react";
import { api } from "./api";

const initialDelivery = {
  customerName: "", address: "", latitude: "", longitude: "",
  weightKg: "", windowStart: "", windowEnd: "",
};

export default function DispatchPanel({ vehicles, drivers }) {
  const [deliveries, setDeliveries] = useState([]);
  const [selected, setSelected]     = useState([]);
  const [delivery, setDelivery]     = useState(initialDelivery);
  const [vehicleId, setVehicleId]   = useState("");
  const [driverId, setDriverId]     = useState("");
  const [start, setStart]           = useState({ latitude: "", longitude: "" });
  const [route, setRoute]           = useState(null);
  const [message, setMessage]       = useState("");
  const [filterStatus, setFilterStatus] = useState("ALL");

  async function load() {
    try { setDeliveries(await api("/dispatch/deliveries")); }
    catch (e) { setMessage(e.message); }
  }
  useEffect(() => { load(); }, []);

  const updateDelivery = (e) =>
    setDelivery((curr) => ({ ...curr, [e.target.name]: e.target.value }));

  async function createDelivery(e) {
    e.preventDefault();
    try {
      await api("/dispatch/deliveries", {
        method: "POST",
        body: JSON.stringify({
          ...delivery,
          latitude: Number(delivery.latitude),
          longitude: Number(delivery.longitude),
          weightKg: Number(delivery.weightKg),
          windowStart: delivery.windowStart || null,
          windowEnd: delivery.windowEnd || null,
        }),
      });
      setDelivery(initialDelivery);
      setMessage("Delivery stop added.");
      load();
    } catch (e) { setMessage(e.message); }
  }

  function toggle(id) {
    setSelected((curr) =>
      curr.includes(id) ? curr.filter((i) => i !== id) : [...curr, id]
    );
  }

  async function dispatch() {
    if (!vehicleId || !driverId || !selected.length)
      return setMessage("Select a vehicle, driver, and at least one delivery.");
    try {
      await api("/dispatch/manifests", {
        method: "POST",
        body: JSON.stringify({ vehicleId, driverId, deliveryTaskIds: selected }),
      });
      setMessage("Manifest dispatched successfully.");
      setSelected([]);
      load();
    } catch (e) { setMessage(e.message); }
  }

  async function optimize() {
    if (!vehicleId || !selected.length || !start.latitude || !start.longitude)
      return setMessage("Choose deliveries, a vehicle, and the start coordinates.");
    try {
      const result = await api("/routes/optimize", {
        method: "POST",
        body: JSON.stringify({
          vehicleId,
          start: { latitude: Number(start.latitude), longitude: Number(start.longitude) },
          deliveryTaskIds: selected,
        }),
      });
      setRoute(result);
      setMessage("Route optimized with 2-opt algorithm.");
      load();
    } catch (e) { setMessage(e.message); }
  }

  async function advance(task) {
    const next =
      task.status === "DISPATCHED" ? "IN_TRANSIT"
      : task.status === "IN_TRANSIT" ? "DELIVERED"
      : null;
    if (!next) return;
    try {
      await api(`/dispatch/deliveries/${task.id}/status?status=${next}`, { method: "PATCH" });
      setMessage(`Delivery marked ${next.replaceAll("_", " ").toLowerCase()}.`);
      load();
    } catch (e) { setMessage(e.message); }
  }

  const STATUSES = ["ALL", "UNASSIGNED", "DISPATCHED", "IN_TRANSIT", "DELIVERED", "FAILED"];
  const visible = filterStatus === "ALL"
    ? deliveries
    : deliveries.filter((d) => d.status === filterStatus);

  // Weight total for selected
  const selectedWeight = deliveries
    .filter((d) => selected.includes(d.id))
    .reduce((sum, d) => sum + (d.weightKg ?? 0), 0);

  const selectedVehicle = vehicles.find((v) => v.id === vehicleId);

  return (
    <div className="dispatch-stack">
      {message && (
        <button className="notice" onClick={() => setMessage("")}>{message}<b> ×</b></button>
      )}

      <section className="dispatch-grid">
        {/* Delivery queue */}
        <div className="card">
          <div className="card-title">
            <h2>Delivery queue</h2>
            <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
              <span className="count">{selected.length} selected</span>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                style={{ fontSize: "0.75rem", padding: "0.2rem 0.4rem" }}
              >
                {STATUSES.map((s) => <option key={s}>{s}</option>)}
              </select>
            </div>
          </div>

          {selectedVehicle && selected.length > 0 && (
            <div className={`capacity-bar ${selectedWeight > selectedVehicle.capacityKg ? "over" : ""}`}>
              <div
                className="capacity-fill"
                style={{ width: `${Math.min(100, (selectedWeight / selectedVehicle.capacityKg) * 100)}%` }}
              />
              <span>{selectedWeight.toFixed(1)} / {selectedVehicle.capacityKg} kg</span>
            </div>
          )}

          {!visible.length ? (
            <div className="no-data">No delivery tasks {filterStatus !== "ALL" ? `with status ${filterStatus}` : "yet"}.</div>
          ) : (
            <div className="delivery-list">
              {visible.map((task) => (
                <article
                  key={task.id}
                  className={selected.includes(task.id) ? "selected" : ""}
                >
                  <label className="check">
                    <input
                      type="checkbox"
                      checked={selected.includes(task.id)}
                      onChange={() => toggle(task.id)}
                    />
                    <span />
                  </label>
                  <div>
                    <strong>{task.customerName}</strong>
                    <p>{task.address}</p>
                    <small>
                      {task.weightKg} kg · {task.latitude?.toFixed(4)}, {task.longitude?.toFixed(4)}
                    </small>
                    {task.windowStart && (
                      <small className="window-hint">
                        🕐 {new Date(task.windowStart).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                        {" – "}
                        {new Date(task.windowEnd).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                      </small>
                    )}
                  </div>
                  <span className={`status ${task.status.toLowerCase().replace("_", "-")}`}>
                    {task.status.replaceAll("_", " ")}
                  </span>
                  {(task.status === "DISPATCHED" || task.status === "IN_TRANSIT") && (
                    <button className="advance" onClick={() => advance(task)}>
                      {task.status === "DISPATCHED" ? "▶ Start" : "✓ Deliver"}
                    </button>
                  )}
                </article>
              ))}
            </div>
          )}
        </div>

        {/* Add delivery form */}
        <div className="card form-card">
          <h2>Add delivery stop</h2>
          <form onSubmit={createDelivery}>
            <label>Customer<input name="customerName" value={delivery.customerName} onChange={updateDelivery} required /></label>
            <label>Address<input name="address" value={delivery.address} onChange={updateDelivery} required /></label>
            <div className="form-row">
              <label>Latitude<input type="number" step="any" name="latitude" value={delivery.latitude} onChange={updateDelivery} required /></label>
              <label>Longitude<input type="number" step="any" name="longitude" value={delivery.longitude} onChange={updateDelivery} required /></label>
            </div>
            <label>Package weight (kg)<input type="number" step="any" name="weightKg" value={delivery.weightKg} onChange={updateDelivery} required /></label>
            <div className="form-row">
              <label>Window start<input type="datetime-local" name="windowStart" value={delivery.windowStart} onChange={updateDelivery} /></label>
              <label>Window end<input type="datetime-local" name="windowEnd" value={delivery.windowEnd} onChange={updateDelivery} /></label>
            </div>
            <button className="primary">Add to queue</button>
          </form>
        </div>
      </section>

      {/* Manifest builder */}
      <section className="card route-builder">
        <div className="card-title">
          <div>
            <p className="eyebrow">Manifest builder</p>
            <h2>Assign and optimize</h2>
          </div>
          <span className="count">Up to 10 stops</span>
        </div>
        <div className="route-controls">
          <label>Vehicle
            <select value={vehicleId} onChange={(e) => setVehicleId(e.target.value)}>
              <option value="">Select vehicle</option>
              {vehicles.map((v) => (
                <option value={v.id} key={v.id}>{v.licensePlate} · {v.capacityKg} kg · {v.status}</option>
              ))}
            </select>
          </label>
          <label>Driver
            <select value={driverId} onChange={(e) => setDriverId(e.target.value)}>
              <option value="">Select driver</option>
              {drivers.map((d) => (
                <option value={d.id} key={d.id}>{d.name} · {d.status}</option>
              ))}
            </select>
          </label>
          <label>Depot latitude<input type="number" step="any" value={start.latitude} onChange={(e) => setStart({ ...start, latitude: e.target.value })} /></label>
          <label>Depot longitude<input type="number" step="any" value={start.longitude} onChange={(e) => setStart({ ...start, longitude: e.target.value })} /></label>
        </div>
        <div className="route-actions">
          <button className="secondary" onClick={dispatch}>📤 Dispatch manifest</button>
          <button className="primary" onClick={optimize}>🔀 Optimize route (2-opt)</button>
        </div>
      </section>

      {/* Optimized route result */}
      {route && (
        <section className="route-result">
          <div className="route-summary">
            <p className="eyebrow">Optimized result</p>
            <h2>{(route.totalDistanceMeters / 1000).toFixed(1)} km</h2>
            <p>Estimated total driving time: {Math.round(route.totalDurationSeconds / 60)} min</p>
            {route.stops.some((s) => s.timeWindowViolation) && (
              <p className="window-warning">
                ⚠️ {route.stops.filter((s) => s.timeWindowViolation).length} stop(s) may violate delivery time windows
              </p>
            )}
          </div>
          <div className="timeline">
            {route.stops.map((stop) => (
              <article key={stop.deliveryTaskId} className={stop.timeWindowViolation ? "window-violation" : ""}>
                <b>{stop.sequence}</b>
                <div>
                  <strong>{stop.address}</strong>
                  <small>
                    {(stop.distanceFromPreviousMeters / 1000).toFixed(1)} km ·{" "}
                    {Math.round(stop.durationFromPreviousSeconds / 60)} min
                  </small>
                  {stop.estimatedArrival && (
                    <small>
                      ETA: {new Date(stop.estimatedArrival).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                    </small>
                  )}
                  {stop.timeWindowViolation && (
                    <span className="violation-tag">⚠️ Window violation</span>
                  )}
                </div>
              </article>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
