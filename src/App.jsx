import { useState } from "react";
import Auth from "./Auth";
import { clearSession, getSession } from "./api";

export default function App() {
  const [session, setSession] = useState(getSession());

  if (!session) {
    return <Auth onAuthenticated={setSession} />;
  }

  return (
    <main className="empty-state">
      <div className="brand"><span>FF</span> FleetFlow</div>
      <h1>Welcome, {session.companyName}</h1>
      <p>Your fleet command center is connected.</p>
      <button className="secondary" onClick={() => { clearSession(); setSession(null); }}>
        Sign out
      </button>
    </main>
  );
}
