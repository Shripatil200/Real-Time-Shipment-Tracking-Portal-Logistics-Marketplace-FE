import { useState } from "react";
import { api, saveSession } from "./api";

export default function Auth({ onLogin }) {
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({
    email: "",
    password: "",
    companyName: "",
    role: "ROLE_SHIPPER",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const update = (e) =>
    setForm((curr) => ({ ...curr, [e.target.name]: e.target.value }));

  async function submit(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      let payload;
      if (mode === "login") {
        payload = { email: form.email, password: form.password };
      } else {
        // BUG FIX: send role explicitly so backend stores the correct role
        payload = {
          email: form.email,
          password: form.password,
          companyName: form.companyName,
          role: form.role,
        };
      }

      const session = await api(`/auth/${mode}`, {
        method: "POST",
        body: JSON.stringify(payload),
      });
      saveSession(session);
      onLogin(session);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  // Human-readable label for each role
  const ROLE_LABELS = {
    ROLE_SHIPPER: "Fleet Dispatcher — manage vehicles, drivers & routes",
    ROLE_CARRIER: "Carrier — browse shipments and place bids",
    ROLE_DRIVER:  "Driver — view assigned stops and update status",
  };

  return (
    <main className="auth-shell">
      <section className="auth-story">
        <div className="brand"><span>FF</span> FleetFlow</div>
        <p className="eyebrow">Logistics command center</p>
        <h1>Every vehicle. Every stop. One clear route forward.</h1>
        <p className="lead">
          Assign drivers, track delivery state, and turn a scattered manifest into an
          efficient route in seconds.
        </p>
        <div className="signal-row">
          <div><strong>Live GPS</strong><small>real-time tracking</small></div>
          <div><strong>2-opt TSP</strong><small>route optimization</small></div>
          <div><strong>WebSocket</strong><small>instant map updates</small></div>
        </div>
      </section>

      <section className="auth-panel">
        <div className="auth-card">
          <p className="eyebrow">{mode === "login" ? "Welcome back" : "Create workspace"}</p>
          <h2>{mode === "login" ? "Sign in" : "Create account"}</h2>

          <form onSubmit={submit}>
            {mode === "register" && (
              <>
                <label>Company / Full name
                  <input name="companyName" value={form.companyName} onChange={update} required />
                </label>

                {/* BUG FIX: show role selector with clear descriptions */}
                <label>Account type
                  <select name="role" value={form.role} onChange={update}>
                    <option value="ROLE_SHIPPER">Fleet Dispatcher</option>
                    <option value="ROLE_CARRIER">Carrier</option>
                    <option value="ROLE_DRIVER">Driver</option>
                  </select>
                </label>

                {/* Show what this role can do */}
                <p className="role-hint">{ROLE_LABELS[form.role]}</p>
              </>
            )}

            <label>Email address
              <input type="email" name="email" value={form.email} onChange={update} required />
            </label>
            <label>Password
              <input
                type="password"
                name="password"
                minLength="8"
                value={form.password}
                onChange={update}
                required
              />
            </label>

            {error && <p className="error">{error}</p>}

            <button className="primary" disabled={loading}>
              {loading ? "Working..." : mode === "login" ? "Sign in" : "Create account"}
            </button>
          </form>

          <button
            className="text-button"
            onClick={() => setMode(mode === "login" ? "register" : "login")}
          >
            {mode === "login" ? "Need an account? Register" : "Already registered? Sign in"}
          </button>
        </div>
      </section>
    </main>
  );
}
