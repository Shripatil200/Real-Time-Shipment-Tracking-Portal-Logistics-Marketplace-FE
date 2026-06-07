import { useEffect, useState } from "react";
import { api } from "./api";

const initialDelivery = {
  customerName: "", address: "", latitude: "", longitude: "", weightKg: "",
  windowStart: "", windowEnd: "",
};

export default function DispatchPanel({ vehicles, drivers }) {
  const [deliveries, setDeliveries] = useState([]);
  const [selected, setSelected] = useState([]);
  const [delivery, setDelivery] = useState(initialDelivery);
  const [vehicleId, setVehicleId] = useState("");
  const [driverId, setDriverId] = useState("");
  const [start, setStart] = useState({ latitude: "", longitude: "" });
  const [route, setRoute] = useState(null);
  const [message, setMessage] = useState("");

  async function load() {
    try { setDeliveries(await api("/dispatch/deliveries")); }
    catch (error) { setMessage(error.message); }
  }
  useEffect(() => { load(); }, []);

  const updateDelivery = (event) =>
    setDelivery((current) => ({ ...current, [event.target.name]: event.target.value }));

  async function createDelivery(event) {
    event.preventDefault();
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
    } catch (error) { setMessage(error.message); }
  }

  function toggle(id) {
    setSelected((current) => current.includes(id)
      ? current.filter((item) => item !== id)
      : [...current, id]);
  }

  async function dispatch() {
    if (!vehicleId || !driverId || !selected.length) return setMessage("Select a vehicle, driver, and at least one delivery.");
    try {
      await api("/dispatch/manifests", {
        method: "POST",
        body: JSON.stringify({ vehicleId, driverId, deliveryTaskIds: selected }),
      });
      setMessage("Manifest dispatched successfully.");
      load();
    } catch (error) { setMessage(error.message); }
  }

  async function optimize() {
    if (!vehicleId || !selected.length || !start.latitude || !start.longitude) {
      return setMessage("Choose deliveries, a vehicle, and the route start coordinates.");
    }
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
      setMessage("Route optimized with the OSRM distance matrix.");
      load();
    } catch (error) { setMessage(error.message); }
  }

  async function advance(task) {
    const next = task.status === "DISPATCHED" ? "IN_TRANSIT"
      : task.status === "IN_TRANSIT" ? "DELIVERED" : null;
    if (!next) return;
    try {
      await api(`/dispatch/deliveries/${task.id}/status?status=${next}`, { method: "PATCH" });
      setMessage(`Delivery marked ${next.replaceAll("_", " ").toLowerCase()}.`);
      load();
    } catch (error) { setMessage(error.message); }
  }

  return (
    <div className="dispatch-stack">
      {message && <button className="notice" onClick={() => setMessage("")}>{message}<b>×</b></button>}
      <section className="dispatch-grid">
        <div className="card">
          <div className="card-title"><h2>Delivery queue</h2><span className="count">{selected.length} selected</span></div>
          {!deliveries.length ? <div className="no-data">No delivery tasks yet.</div> : (
            <div className="delivery-list">
              {deliveries.map((task) => (
                <article className={selected.includes(task.id) ? "selected" : ""} key={task.id}>
                  <label className="check"><input type="checkbox" checked={selected.includes(task.id)} onChange={() => toggle(task.id)} /><span /></label>
                  <div><strong>{task.customerName}</strong><p>{task.address}</p><small>{task.weightKg} kg · {task.latitude.toFixed(4)}, {task.longitude.toFixed(4)}</small></div>
                  <span className={`status ${task.status.toLowerCase()}`}>{task.status.replaceAll("_", " ")}</span>
                  {(task.status === "DISPATCHED" || task.status === "IN_TRANSIT") && <button className="advance" onClick={() => advance(task)}>{task.status === "DISPATCHED" ? "Start" : "Deliver"}</button>}
                </article>
              ))}
            </div>
          )}
        </div>
        <div className="card form-card">
          <h2>Add delivery stop</h2>
          <form onSubmit={createDelivery}>
            <label>Customer<input name="customerName" value={delivery.customerName} onChange={updateDelivery} required /></label>
            <label>Address<input name="address" value={delivery.address} onChange={updateDelivery} required /></label>
            <div className="form-row"><label>Latitude<input type="number" step="any" name="latitude" value={delivery.latitude} onChange={updateDelivery} required /></label><label>Longitude<input type="number" step="any" name="longitude" value={delivery.longitude} onChange={updateDelivery} required /></label></div>
            <label>Package weight (kg)<input type="number" step="any" name="weightKg" value={delivery.weightKg} onChange={updateDelivery} required /></label>
            <button className="primary">Add to queue</button>
          </form>
        </div>
      </section>

      <section className="card route-builder">
        <div className="card-title"><div><p className="eyebrow">Manifest builder</p><h2>Assign and optimize</h2></div><span className="count">Up to 10 stops</span></div>
        <div className="route-controls">
          <label>Vehicle<select value={vehicleId} onChange={(e) => setVehicleId(e.target.value)}><option value="">Select vehicle</option>{vehicles.map((item) => <option value={item.id} key={item.id}>{item.licensePlate} · {item.capacityKg} kg</option>)}</select></label>
          <label>Driver<select value={driverId} onChange={(e) => setDriverId(e.target.value)}><option value="">Select driver</option>{drivers.map((item) => <option value={item.id} key={item.id}>{item.name} · {item.status}</option>)}</select></label>
          <label>Start latitude<input type="number" step="any" value={start.latitude} onChange={(e) => setStart({ ...start, latitude: e.target.value })} /></label>
          <label>Start longitude<input type="number" step="any" value={start.longitude} onChange={(e) => setStart({ ...start, longitude: e.target.value })} /></label>
        </div>
        <div className="route-actions"><button className="secondary" onClick={dispatch}>Dispatch manifest</button><button className="primary" onClick={optimize}>Optimize route</button></div>
      </section>

      {route && (
        <section className="route-result">
          <div className="route-summary">
            <p className="eyebrow">Optimized result</p><h2>{(route.totalDistanceMeters / 1000).toFixed(1)} km</h2>
            <p>Estimated driving time: {Math.round(route.totalDurationSeconds / 60)} minutes</p>
          </div>
          <div className="timeline">
            {route.stops.map((stop) => <article key={stop.deliveryTaskId}><b>{stop.sequence}</b><div><strong>{stop.address}</strong><small>{(stop.distanceFromPreviousMeters / 1000).toFixed(1)} km from previous stop · {Math.round(stop.durationFromPreviousSeconds / 60)} min</small></div></article>)}
          </div>
        </section>
      )}
    </div>
  );
}
