import { useEffect, useState } from "react";
import { api, clearSession } from "./api";
import DispatchPanel from "./DispatchPanel";

const vehicleInitial = {
  licensePlate: "", model: "", capacityKg: "", status: "AVAILABLE",
  lastMaintenanceDate: "", nextMaintenanceDate: "", latitude: "", longitude: "",
};
const driverInitial = {
  name: "", email: "", licenseNumber: "", licenseExpiry: "",
  shiftStart: "08:00", shiftEnd: "17:00", status: "AVAILABLE",
};

export default function Dashboard({ session, onLogout }) {
  const [tab, setTab] = useState("overview");
  const [summary, setSummary] = useState({});
  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [vehicle, setVehicle] = useState(vehicleInitial);
  const [driver, setDriver] = useState(driverInitial);
  const [notice, setNotice] = useState("");

  async function refresh() {
    try {
      const [summaryData, vehicleData, driverData] = await Promise.all([
        api("/fleet/summary"), api("/fleet/vehicles"), api("/fleet/drivers"),
      ]);
      setSummary(summaryData);
      setVehicles(vehicleData);
      setDrivers(driverData);
    } catch (error) {
      setNotice(error.message);
    }
  }

  useEffect(() => { refresh(); }, []);

  const update = (setter) => (event) =>
    setter((current) => ({ ...current, [event.target.name]: event.target.value }));

  async function addVehicle(event) {
    event.preventDefault();
    try {
      await api("/fleet/vehicles", {
        method: "POST",
        body: JSON.stringify({
          ...vehicle,
          capacityKg: Number(vehicle.capacityKg),
          latitude: vehicle.latitude ? Number(vehicle.latitude) : null,
          longitude: vehicle.longitude ? Number(vehicle.longitude) : null,
          lastMaintenanceDate: vehicle.lastMaintenanceDate || null,
          nextMaintenanceDate: vehicle.nextMaintenanceDate || null,
        }),
      });
      setVehicle(vehicleInitial);
      setNotice("Vehicle added to the fleet.");
      refresh();
    } catch (error) { setNotice(error.message); }
  }

  async function addDriver(event) {
    event.preventDefault();
    try {
      await api("/fleet/drivers", { method: "POST", body: JSON.stringify(driver) });
      setDriver(driverInitial);
      setNotice("Driver profile created.");
      refresh();
    } catch (error) { setNotice(error.message); }
  }

  function logout() {
    clearSession();
    onLogout();
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand"><span>FF</span> FleetFlow</div>
        <nav>
          {[
            ["overview", "Overview"], ["vehicles", "Vehicles"], ["drivers", "Drivers"],
            ["dispatch", "Dispatch & routes"],
          ].map(([id, label]) => (
            <button className={tab === id ? "active" : ""} onClick={() => setTab(id)} key={id}>
              <i>{label.charAt(0)}</i>{label}
            </button>
          ))}
        </nav>
        <div className="user-card">
          <div className="avatar">{session.companyName?.charAt(0)}</div>
          <div><strong>{session.companyName}</strong><small>{session.email}</small></div>
          <button onClick={logout}>Sign out</button>
        </div>
      </aside>
      <main className="workspace">
        <header>
          <div><p className="eyebrow">Operations center</p><h1>{tab === "overview" ? "Fleet at a glance" : tab.replace("&", "and")}</h1></div>
          <div className="live-pill"><span /> Systems online</div>
        </header>
        {notice && <button className="notice" onClick={() => setNotice("")}>{notice}<b>×</b></button>}

        {tab === "overview" && (
          <>
            <section className="metrics">
              <Metric label="Total vehicles" value={summary.totalVehicles ?? 0} note={`${summary.availableVehicles ?? 0} available`} tone="navy" />
              <Metric label="Active drivers" value={summary.totalDrivers ?? 0} note={`${summary.availableDrivers ?? 0} ready`} tone="teal" />
              <Metric label="Maintenance" value={summary.maintenanceVehicles ?? 0} note="vehicles flagged" tone="orange" />
            </section>
            <section className="grid-two">
              <div className="card">
                <CardTitle title="Fleet readiness" action={() => setTab("vehicles")} />
                <div className="readiness">
                  <div className="donut" style={{ "--value": summary.totalVehicles ? summary.availableVehicles / summary.totalVehicles * 100 : 0 }}>
                    <strong>{summary.totalVehicles ? Math.round(summary.availableVehicles / summary.totalVehicles * 100) : 0}%</strong><small>ready</small>
                  </div>
                  <div className="legend">
                    <p><span className="dot available" />Available <b>{summary.availableVehicles ?? 0}</b></p>
                    <p><span className="dot maintenance" />Maintenance <b>{summary.maintenanceVehicles ?? 0}</b></p>
                    <p><span className="dot assigned" />Assigned / active <b>{Math.max(0, (summary.totalVehicles ?? 0) - (summary.availableVehicles ?? 0) - (summary.maintenanceVehicles ?? 0))}</b></p>
                  </div>
                </div>
              </div>
              <div className="card">
                <CardTitle title="Recent vehicles" action={() => setTab("vehicles")} />
                <Table rows={vehicles.slice(0, 5)} type="vehicle" />
              </div>
            </section>
          </>
        )}

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
              <label>Status<select name="status" value={vehicle.status} onChange={update(setVehicle)}><option>AVAILABLE</option><option>MAINTENANCE</option><option>OUT_OF_SERVICE</option></select></label>
              <label>Last maintenance<input type="date" name="lastMaintenanceDate" value={vehicle.lastMaintenanceDate} onChange={update(setVehicle)} /></label>
              <label>Next maintenance<input type="date" name="nextMaintenanceDate" value={vehicle.nextMaintenanceDate} onChange={update(setVehicle)} /></label>
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
              <div className="form-row"><label>Shift start<input type="time" name="shiftStart" value={driver.shiftStart} onChange={update(setDriver)} /></label><label>Shift end<input type="time" name="shiftEnd" value={driver.shiftEnd} onChange={update(setDriver)} /></label></div>
            </FormCard>
          </section>
        )}

        {tab === "dispatch" && <DispatchPanel vehicles={vehicles} drivers={drivers} />}
      </main>
    </div>
  );
}

function Metric({ label, value, note, tone }) {
  return <article className={`metric ${tone}`}><small>{label}</small><strong>{value}</strong><p>{note}</p></article>;
}
function CardTitle({ title, action }) {
  return <div className="card-title"><h2>{title}</h2>{action && <button onClick={action}>View all</button>}</div>;
}
function FormCard({ title, onSubmit, children }) {
  return <div className="card form-card"><h2>{title}</h2><form onSubmit={onSubmit}>{children}<button className="primary">Save record</button></form></div>;
}
function Table({ rows, type }) {
  if (!rows.length) return <div className="no-data">No records yet. Add the first one from the form.</div>;
  return (
    <div className="table-wrap"><table><thead><tr>
      {type === "vehicle" ? <><th>Vehicle</th><th>Capacity</th><th>Status</th><th>Driver</th></> : <><th>Driver</th><th>License</th><th>Expiry</th><th>Status</th></>}
    </tr></thead><tbody>{rows.map((row) => <tr key={row.id}>
      {type === "vehicle" ? <><td><b>{row.licensePlate}</b><small>{row.model}</small></td><td>{row.capacityKg.toLocaleString()} kg</td><td><Status value={row.status} /></td><td>{row.driverName || "Unassigned"}</td></> : <><td><b>{row.name}</b><small>{row.email}</small></td><td>{row.licenseNumber}</td><td>{row.licenseExpiry}</td><td><Status value={row.status} /></td></>}
    </tr>)}</tbody></table></div>
  );
}
function Status({ value }) {
  return <span className={`status ${value.toLowerCase()}`}>{value.replaceAll("_", " ")}</span>;
}
