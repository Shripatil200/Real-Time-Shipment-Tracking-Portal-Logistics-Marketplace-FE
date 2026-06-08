import { useEffect, useState } from "react";
import { api, clearSession } from "./api";
import DispatchPanel from "./DispatchPanel";
import LiveMap from "./LiveMap";
import AnalyticsDashboard from "./AnalyticsDashboard";
import NotificationBell from "./NotificationBell";
import ShipmentBidPanel from "./ShipmentBidPanel";

const vehicleInitial = {
  licensePlate: "", model: "", capacityKg: "", status: "AVAILABLE",
  lastMaintenanceDate: "", nextMaintenanceDate: "", latitude: "", longitude: "",
  fuelType: "", yearManufactured: "",
};
const driverInitial = {
  name: "", email: "", licenseNumber: "", licenseExpiry: "",
  shiftStart: "08:00", shiftEnd: "17:00", status: "AVAILABLE",
};

function getTabs(role) {
  const base = [
    ["overview",  "📊 Overview"],
    ["map",       "🗺️ Live Map"],
    ["vehicles",  "🚛 Vehicles"],
    ["drivers",   "👤 Drivers"],
    ["dispatch",  "📦 Dispatch"],
    ["analytics", "📈 Analytics"],
  ];
  if (role === "ROLE_SHIPPER" || role === "ROLE_CARRIER") {
    base.push(["shipments", "🤝 Shipments"]);
  }
  return base;
}

export default function Dashboard({ session, onLogout }) {
  const [tab, setTab]         = useState("overview");
  const [summary, setSummary] = useState({});
  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers]   = useState([]);
  const [alerts, setAlerts]     = useState([]);
  const [vehicle, setVehicle]   = useState(vehicleInitial);
  const [driver, setDriver]     = useState(driverInitial);
  const [notice, setNotice]     = useState("");

  const TABS = getTabs(session?.role);

  async function refresh() {
    try {
      const [summaryData, vehicleData, driverData, alertData] = await Promise.all([
        api("/fleet/summary"),
        api("/fleet/vehicles"),
        api("/fleet/drivers"),
        api("/fleet/alerts/unresolved"),
      ]);
      setSummary(summaryData);
      setVehicles(vehicleData);
      setDrivers(driverData);
      setAlerts(alertData);
    } catch (error) {
      setNotice(error.message);
    }
  }

  useEffect(() => { refresh(); }, []);

  const update = (setter) => (e) =>
    setter((curr) => ({ ...curr, [e.target.name]: e.target.value }));

  async function addVehicle(e) {
    e.preventDefault();
    try {
      await api("/fleet/vehicles", {
        method: "POST",
        body: JSON.stringify({
          ...vehicle,
          capacityKg: Number(vehicle.capacityKg),
          latitude: vehicle.latitude ? Number(vehicle.latitude) : null,
          longitude: vehicle.longitude ? Number(vehicle.longitude) : null,
          yearManufactured: vehicle.yearManufactured ? Number(vehicle.yearManufactured) : null,
          lastMaintenanceDate: vehicle.lastMaintenanceDate || null,
          nextMaintenanceDate: vehicle.nextMaintenanceDate || null,
          fuelType: vehicle.fuelType || null,
        }),
      });
      setVehicle(vehicleInitial);
      setNotice("Vehicle added.");
      refresh();
    } catch (err) { setNotice(err.message); }
  }

  async function addDriver(e) {
    e.preventDefault();
    try {
      await api("/fleet/drivers", { method: "POST", body: JSON.stringify(driver) });
      setDriver(driverInitial);
      setNotice("Driver added.");
      refresh();
    } catch (err) { setNotice(err.message); }
  }

  async function resolveAlert(vehicleId, alertId) {
    try {
      await api(`/fleet/vehicles/${vehicleId}/alerts/${alertId}/resolve`, { method: "PATCH" });
      setAlerts((prev) => prev.filter((a) => a.id !== alertId));
      setNotice("Alert resolved.");
    } catch (err) { setNotice(err.message); }
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand"><span>FF</span> FleetFlow</div>
        <nav>
          {TABS.map(([id, label]) => (
            <button className={tab === id ? "active" : ""} onClick={() => setTab(id)} key={id}>
              {label}
            </button>
          ))}
        </nav>
        <div className="user-card">
          <div className="avatar">{session.companyName?.charAt(0) || "U"}</div>
          <div>
            <strong>{session.companyName}</strong>
            <small>{session.role?.replace("ROLE_", "")}</small>
          </div>
          <button onClick={() => { clearSession(); onLogout(); }}>Sign out</button>
        </div>
      </aside>

      <main className="workspace">
        <header>
          <div>
            <p className="eyebrow">Operations center</p>
            <h1>{TABS.find(([id]) => id === tab)?.[1] ?? tab}</h1>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            {alerts.length > 0 && (
              <span className="alert-badge" title={`${alerts.length} maintenance alert(s)`}>
                ⚠️ {alerts.length}
              </span>
            )}
            <NotificationBell />
            <div className="live-pill"><span /> Systems online</div>
          </div>
        </header>

        {notice && (
          <button className="notice" onClick={() => setNotice("")}>{notice}<b> ×</b></button>
        )}

        {tab === "overview" && (
          <>
            <section className="metrics">
              <Metric label="Total vehicles"  value={summary.totalVehicles ?? 0}   note={`${summary.availableVehicles ?? 0} available`} tone="navy" />
              <Metric label="Active drivers"  value={summary.totalDrivers ?? 0}    note={`${summary.availableDrivers ?? 0} ready`}      tone="teal" />
              <Metric label="Maintenance"     value={summary.maintenanceVehicles ?? 0} note="vehicles flagged"                         tone="orange" />
              {alerts.length > 0 && <Metric label="Open alerts" value={alerts.length} note="need attention" tone="red" />}
            </section>

            <section className="grid-two">
              <div className="card">
                <CardTitle title="Fleet readiness" action={() => setTab("vehicles")} />
                <div className="readiness">
                  <div className="donut" style={{
                    "--value": summary.totalVehicles
                      ? (summary.availableVehicles / summary.totalVehicles) * 100 : 0,
                  }}>
                    <strong>{summary.totalVehicles ? Math.round((summary.availableVehicles / summary.totalVehicles) * 100) : 0}%</strong>
                    <small>ready</small>
                  </div>
                  <div className="legend">
                    <p><span className="dot available" />Available <b>{summary.availableVehicles ?? 0}</b></p>
                    <p><span className="dot maintenance" />Maintenance <b>{summary.maintenanceVehicles ?? 0}</b></p>
                    <p><span className="dot assigned" />Active <b>{Math.max(0, (summary.totalVehicles ?? 0) - (summary.availableVehicles ?? 0) - (summary.maintenanceVehicles ?? 0))}</b></p>
                  </div>
                </div>
              </div>
              <div className="card">
                <CardTitle title="Recent vehicles" action={() => setTab("vehicles")} />
                <Table rows={vehicles.slice(0, 5)} type="vehicle" />
              </div>
            </section>

            {alerts.length > 0 && (
              <section className="card">
                <div className="card-title"><h2>⚠️ Maintenance Alerts</h2></div>
                <div className="alert-list">
                  {alerts.map((a) => (
                    <div key={a.id} className={`alert-row ${a.alertType?.toLowerCase()}`}>
                      <div>
                        <strong>{a.alertType?.replace("_", " ")}</strong>
                        <p>{a.message}</p>
                        <small>{new Date(a.createdAt).toLocaleDateString("en-IN")}</small>
                      </div>
                      <button className="secondary small" onClick={() => resolveAlert(a.vehicle?.id, a.id)}>Resolve</button>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </>
        )}

        {tab === "map"       && <LiveMap />}
        {tab === "analytics" && <AnalyticsDashboard />}
        {tab === "dispatch"  && <DispatchPanel vehicles={vehicles} drivers={drivers} />}
        {tab === "shipments" && <ShipmentBidPanel session={session} />}

        {tab === "vehicles" && (
          <section className="data-layout">
            <div className="card">
              <CardTitle title="Vehicle registry" />
              <Table rows={vehicles} type="vehicle" />
            </div>
            <FormCard title="Register vehicle" onSubmit={addVehicle}>
              <label>License plate<input name="licensePlate" value={vehicle.licensePlate} onChange={update(setVehicle)} required /></label>
              <label>Model<input name="model" value={vehicle.model} onChange={update(setVehicle)} required /></label>
              <label>Capacity (kg)<input type="number" name="capacityKg" value={vehicle.capacityKg} onChange={update(setVehicle)} required /></label>
              <label>Status
                <select name="status" value={vehicle.status} onChange={update(setVehicle)}>
                  <option>AVAILABLE</option><option>MAINTENANCE</option><option>OUT_OF_SERVICE</option>
                </select>
              </label>
              <label>Fuel type
                <select name="fuelType" value={vehicle.fuelType} onChange={update(setVehicle)}>
                  <option value="">— select —</option>
                  <option>DIESEL</option><option>PETROL</option><option>CNG</option><option>ELECTRIC</option>
                </select>
              </label>
              <label>Year<input type="number" name="yearManufactured" value={vehicle.yearManufactured} onChange={update(setVehicle)} min="1990" max="2030" /></label>
              <div className="form-row">
                <label>Last maintenance<input type="date" name="lastMaintenanceDate" value={vehicle.lastMaintenanceDate} onChange={update(setVehicle)} /></label>
                <label>Next maintenance<input type="date" name="nextMaintenanceDate" value={vehicle.nextMaintenanceDate} onChange={update(setVehicle)} /></label>
              </div>
              <div className="form-row">
                <label>Latitude<input type="number" step="any" name="latitude" value={vehicle.latitude} onChange={update(setVehicle)} /></label>
                <label>Longitude<input type="number" step="any" name="longitude" value={vehicle.longitude} onChange={update(setVehicle)} /></label>
              </div>
            </FormCard>
          </section>
        )}

        {tab === "drivers" && (
          <section className="data-layout">
            <div className="card">
              <CardTitle title="Driver roster" />
              <Table rows={drivers} type="driver" />
            </div>
            <FormCard title="Add driver" onSubmit={addDriver}>
              <label>Full name<input name="name" value={driver.name} onChange={update(setDriver)} required /></label>
              <label>Email<input type="email" name="email" value={driver.email} onChange={update(setDriver)} required /></label>
              <label>License number<input name="licenseNumber" value={driver.licenseNumber} onChange={update(setDriver)} required /></label>
              <label>License expiry<input type="date" name="licenseExpiry" value={driver.licenseExpiry} onChange={update(setDriver)} required /></label>
              <div className="form-row">
                <label>Shift start<input type="time" name="shiftStart" value={driver.shiftStart} onChange={update(setDriver)} /></label>
                <label>Shift end<input type="time" name="shiftEnd" value={driver.shiftEnd} onChange={update(setDriver)} /></label>
              </div>
              <label>Status
                <select name="status" value={driver.status} onChange={update(setDriver)}>
                  <option>AVAILABLE</option><option>ASSIGNED</option><option>OFF_DUTY</option>
                </select>
              </label>
            </FormCard>
          </section>
        )}
      </main>
    </div>
  );
}

function Metric({ label, value, note, tone }) {
  return (
    <article className={`metric ${tone}`}>
      <small>{label}</small><strong>{value}</strong><p>{note}</p>
    </article>
  );
}
function CardTitle({ title, action }) {
  return (
    <div className="card-title">
      <h2>{title}</h2>
      {action && <button onClick={action}>View all</button>}
    </div>
  );
}
function FormCard({ title, onSubmit, children }) {
  return (
    <div className="card form-card">
      <h2>{title}</h2>
      <form onSubmit={onSubmit}>{children}<button className="primary">Save record</button></form>
    </div>
  );
}
function Table({ rows, type }) {
  if (!rows.length) return <div className="no-data">No records yet.</div>;
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            {type === "vehicle"
              ? <><th>Vehicle</th><th>Capacity</th><th>Status</th><th>Driver</th></>
              : <><th>Driver</th><th>License</th><th>Expiry</th><th>Status</th></>}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              {type === "vehicle"
                ? <><td><b>{row.licensePlate}</b><small>{row.model}</small></td><td>{row.capacityKg?.toLocaleString()} kg</td><td><Status value={row.status} /></td><td>{row.driverName || "Unassigned"}</td></>
                : <><td><b>{row.name}</b><small>{row.email}</small></td><td>{row.licenseNumber}</td><td>{row.licenseExpiry}</td><td><Status value={row.status} /></td></>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
function Status({ value }) {
  return <span className={`status ${value?.toLowerCase().replace("_", "-")}`}>{value?.replaceAll("_", " ")}</span>;
}
