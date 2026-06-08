import { useState, useEffect } from "react";
import Auth from "./Auth";
import Dashboard from "./Dashboard";
import DriverPortal from "./DriverPortal";
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

  // Route by role
  if (session.role === "ROLE_DRIVER") {
    return <DriverPortal session={session} onLogout={handleLogout} />;
  }

  return <Dashboard session={session} onLogout={handleLogout} />;
}
