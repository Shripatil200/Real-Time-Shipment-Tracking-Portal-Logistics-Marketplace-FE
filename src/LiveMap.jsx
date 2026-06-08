import { useEffect, useRef, useState } from "react";
import { api } from "./api";

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
  const stompClient = useRef(null);
  const [vehicles, setVehicles] = useState([]);
  const [selected, setSelected] = useState(null);
  const [wsConnected, setWsConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [mapReady, setMapReady] = useState(false);

  async function loadVehicles() {
    try {
      const data = await api("/fleet/vehicles");
      setVehicles(data);
      return data;
    } catch (err) {
      console.error("Failed to load vehicles:", err);
      return [];
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
          width:34px;height:34px;border-radius:50%;
          background:${color};border:3px solid white;
          box-shadow:0 2px 8px rgba(0,0,0,.3);
          display:flex;align-items:center;justify-content:center;
          font-weight:700;font-size:10px;color:white;cursor:pointer;
        ">${(vehicle.licensePlate || "??").slice(-3)}</div>`,
        iconSize: [34, 34],
        iconAnchor: [17, 17],
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
    for (const id of Object.keys(markersRef.current)) {
      if (!seen.has(id)) {
        markersRef.current[id].remove();
        delete markersRef.current[id];
      }
    }
  }

  function connectWebSocket() {
    const SockJS = window.SockJS;
    const Stomp = window.Stomp;
    if (!SockJS || !Stomp) {
      console.warn("SockJS/STOMP not loaded, using polling");
      return null;
    }

    try {
      const socket = new SockJS("http://localhost:8080/ws");
      const client = Stomp.over(socket);
      client.debug = null;

      client.connect({}, () => {
        setWsConnected(true);
        client.subscribe("/topic/gps", (message) => {
          const ping = JSON.parse(message.body);
          setLastUpdate(new Date().toLocaleTimeString("en-IN"));
          setVehicles((prev) => {
            const updated = prev.map((v) =>
              v.id === ping.vehicleId
                ? { ...v, latitude: ping.latitude, longitude: ping.longitude }
                : v
            );
            updateMarkers(updated);
            return updated;
          });
        });
      }, () => {
        setWsConnected(false);
      });

      stompClient.current = client;
    } catch (e) {
      console.warn("WebSocket connect failed:", e);
    }
  }

  // Init map
  useEffect(() => {
    const L = window.L;
    if (!L || !mapRef.current || leafletMap.current) return;

    leafletMap.current = L.map(mapRef.current).setView([19.076, 72.877], 10);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap contributors",
    }).addTo(leafletMap.current);
    setMapReady(true);

    return () => {
      // Safe disconnect — only if connected
      if (stompClient.current) {
        try {
          if (stompClient.current.connected) {
            stompClient.current.disconnect();
          }
        } catch (_) {}
        stompClient.current = null;
      }
      if (leafletMap.current) {
        leafletMap.current.remove();
        leafletMap.current = null;
      }
    };
  }, []);

  // Load data and connect WS after map is ready
  useEffect(() => {
    if (!mapReady) return;
    loadVehicles().then(updateMarkers);
    connectWebSocket();
    // Fallback polling every 20s
    const interval = setInterval(() => {
      loadVehicles().then(updateMarkers);
    }, 20000);
    return () => clearInterval(interval);
  }, [mapReady]);

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
          <span className={`ws-badge ${wsConnected ? "connected" : "polling"}`}>
            {wsConnected ? "🟢 WebSocket live" : "🟡 Polling mode"}
          </span>
          {lastUpdate && <span className="refresh-time">Last update: {lastUpdate}</span>}
          <span className="count">{vehiclesWithLocation.length} vehicles tracked</span>
          <button className="secondary small" onClick={() => loadVehicles().then(updateMarkers)}>↻ Refresh</button>
        </div>
      </div>

      <div className="map-body">
        <div ref={mapRef} className="leaflet-container-box" />
        <aside className="map-sidebar">
          <div className="map-legend">
            {Object.entries(STATUS_COLORS).map(([status, color]) => (
              <div key={status} className="legend-row">
                <span className="legend-dot" style={{ background: color }} />
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
              <p><strong>Status:</strong> {selected.status?.replace("_", " ")}</p>
              <p><strong>Capacity:</strong> {selected.capacityKg} kg</p>
              {selected.driverName && <p><strong>Driver:</strong> {selected.driverName}</p>}
              <p><strong>Location:</strong> {selected.latitude?.toFixed(4)}, {selected.longitude?.toFixed(4)}</p>
            </div>
          ) : (
            <div className="vehicle-list-mini">
              <p className="eyebrow">Click a marker to inspect</p>
              {vehiclesWithLocation.length === 0 ? (
                <p className="no-data">No vehicles have GPS coordinates yet. Set lat/lng when registering a vehicle.</p>
              ) : (
                vehiclesWithLocation.map((v) => (
                  <div key={v.id} className="vehicle-mini-row" onClick={() => setSelected(v)}>
                    <span className="legend-dot" style={{ background: STATUS_COLORS[v.status] || "#6b7280" }} />
                    <div>
                      <strong>{v.licensePlate}</strong>
                      <small>{v.status?.replace("_", " ")}</small>
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
