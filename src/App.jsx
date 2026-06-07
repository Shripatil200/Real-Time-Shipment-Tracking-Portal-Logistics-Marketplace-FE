import { useState } from "react";
import Auth from "./Auth";
import Dashboard from "./Dashboard";
import { clearSession, getSession } from "./api";

export default function App() {
  const [session, setSession] = useState(getSession());

  if (!session) {
    return <Auth onAuthenticated={setSession} />;
  }

  return <Dashboard session={session} onLogout={() => { clearSession(); setSession(null); }} />;
}
