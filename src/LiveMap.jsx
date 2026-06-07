import { useEffect, useRef, useState } from "react";
import { api } from "./api";

// We load Leaflet from CDN via a script tag in index.html
// Add this to your index.html <head>:
//   <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
//   <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>

const STATUS_COLORS = {
  AVAILABLE: "#22c55e",
  IN_TRANSIT: "#3b82f6",
  ASSIGNED: "#f59e0b",
  MAINTENANCE: "#ef4444",
  OUT_OF_SERVICE: "#6b7280",
};

export default function LiveMap() {
  const mapRef = useRef(null);
  const leafletMap = useRef(null);
  const markersRef = useRef({});
  const [vehicles, setVehicles] = useState([]);
  const [selected, setSelected] = useState(null);
  const [lastRefresh, setLastRefresh] = useState(null);

  async function loadVehicles() {
    try {
      const data = await api("/fleet/vehicles");
      setVehicles(data);
      setLastRefresh(new Date().toLocaleTimeString());
      updateMarkers(data);
    } catch (err) {
      console.error("Failed to load vehicle locations:", err);
    }
  }

  function updateMarkers(vehicleList) {
    const L = window.L;
    if (!L || !leafletMap.current) return;

    const seen = new Set();
    for (const vehicle of vehicleList) {
      if (vehicle.latitude == null || vehicle.longitude == null) continue;
      seen.add(vehicle.id);

      const color = STATUS_COLORS[vehicle.status] || "#6b7280";
      const icon = L.divIcon({
        className: "",
        html: `<div style="
          width:32px;height:32px;border-radius:50%;
          background:${color};border:3px solid white;
          box-shadow:0 2px 8px rgba(0,0,0,0.35);
          display:flex;align-items:center;justify-content:center;
          font-weight:700;font-size:11px;color:white;
          cursor:pointer;
        ">${vehicle.licensePlate.slice(-3)}</div>`,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });

      if (markersRef.current[vehicle.id]) {
        markersRef.current[vehicle.id]
          .setLatLng([vehicle.latitude, vehicle.longitude])
          .setIcon(icon);
      } else {
        const marker = L.marker([vehicle.latitude, vehicle.longitude], { icon })
          .addTo(leafletMap.current)
          .on("click", () => setSelected(vehicle));
        markersRef.current[vehicle.id] = marker;
      }
    }

    // Remove markers for deleted vehicles
    for (const id of Object.keys(markersRef.current)) {
      if (!seen.has(id)) {
        markersRef.current[id].remove();
        delete markersRef.current[id];
      }
    }
  }

  useEffect(() => {
    const L = window.L;
    if (!L) {
      console.warn("Leaflet not loaded. Add CDN links to index.html.");
      return;
    }
    if (!mapRef.current || leafletMap.current) return;

    leafletMap.current = L.map(mapRef.current).setView([20.5937, 78.9629], 5);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap contributors",
    }).addTo(leafletMap.current);

    loadVehicles();
    const interval = setInterval(loadVehicles, 30_000);
    return () => {
      clearInterval(interval);
      if (leafletMap.current) {
        leafletMap.current.remove();
        leafletMap.current = null;
      }
    };
  }, []);

  const vehiclesWithLocation = vehicles.filter(
    (v) => v.latitude != null && v.longitude != null
  );

  return (
    <div className="live-map-wrapper">
      <div className="live-map-header">
        <div>
          <p className="eyebrow">GPS Tracking</p>
          <h2>Live Fleet Map</h2>
        </div>
        <div className="map-meta">
          <span className="count">{vehiclesWithLocation.length} vehicles tracked</span>
          {lastRefresh && (
            <span className="refresh-time">Last refresh: {lastRefresh}</span>
          )}
          <button className="secondary small" onClick={loadVehicles}>
            ↻ Refresh
          </button>
        </div>
      </div>

      <div className="map-body">
        <div ref={mapRef} className="leaflet-container-box" />

        <aside className="map-sidebar">
          <div className="map-legend">
            {Object.entries(STATUS_COLORS).map(([status, color]) => (
              <div key={status} className="legend-row">
                <span
                  className="legend-dot"
                  style={{ background: color }}
                />
                {status.replace("_", " ")}
              </div>
            ))}
          </div>

          {selected ? (
            <div className="vehicle-popup card">
              <div className="card-title">
                <h3>{selected.licensePlate}</h3>
                <button onClick={() => setSelected(null)}>×</button>
              </div>
              <p><strong>Model:</strong> {selected.model}</p>
              <p><strong>Status:</strong> {selected.status.replace("_", " ")}</p>
              <p><strong>Capacity:</strong> {selected.capacityKg} kg</p>
              {selected.driverName && (
                <p><strong>Driver:</strong> {selected.driverName}</p>
              )}
              <p>
                <strong>Location:</strong>{" "}
                {selected.latitude?.toFixed(4)}, {selected.longitude?.toFixed(4)}
              </p>
              {selected.nextMaintenanceDate && (
                <p>
                  <strong>Next maintenance:</strong> {selected.nextMaintenanceDate}
                </p>
              )}
            </div>
          ) : (
            <div className="vehicle-list-mini">
              <p className="eyebrow">Click a marker to inspect</p>
              {vehiclesWithLocation.length === 0 ? (
                <p className="no-data">No vehicles have GPS coordinates set.</p>
              ) : (
                vehiclesWithLocation.map((v) => (
                  <div
                    key={v.id}
                    className="vehicle-mini-row"
                    onClick={() => setSelected(v)}
                  >
                    <span
                      className="legend-dot"
                      style={{
                        background: STATUS_COLORS[v.status] || "#6b7280",
                      }}
                    />
                    <div>
                      <strong>{v.licensePlate}</strong>
                      <small>{v.status.replace("_", " ")}</small>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
