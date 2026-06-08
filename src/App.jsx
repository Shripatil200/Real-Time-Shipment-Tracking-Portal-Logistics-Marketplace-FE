import { useState, useEffect } from "react";
import Auth from "./Auth";
import Dashboard from "./Dashboard";
import DriverPortal from "./DriverPortal";
import CarrierDashboard from "./CarrierDashboard";
import { getSession, clearSession } from "./api";

export default function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const saved = getSession();
    if (saved) setSession(saved);
    setLoading(false);
  }, []);

  function handleLogin(sessionData) {
    setSession(sessionData);
  }

  function handleLogout() {
    clearSession();
    setSession(null);
  }

  if (loading) return <div className="loading-state">Loading...</div>;
  if (!session) return <Auth onLogin={handleLogin} />;

  // BUG FIX: route each role to its own dedicated UI
  switch (session.role) {
    case "ROLE_DRIVER":
      return <DriverPortal session={session} onLogout={handleLogout} />;

    case "ROLE_CARRIER":
      // BUG FIX: carriers were being sent to the full dispatcher Dashboard —
      // they should only see the shipment marketplace
      return <CarrierDashboard session={session} onLogout={handleLogout} />;

    case "ROLE_SHIPPER":
    default:
      return <Dashboard session={session} onLogout={handleLogout} />;
  }
}
