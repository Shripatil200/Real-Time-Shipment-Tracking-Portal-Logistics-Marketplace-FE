import { useState } from "react";
import { api, saveSession } from "./api";

export default function Auth({ onAuthenticated }) {
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({
    email: "",
    password: "",
    companyName: "",
    role: "ROLE_SHIPPER",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const update = (event) =>
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));

  async function submit(event) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const payload =
        mode === "login"
          ? { email: form.email, password: form.password }
          : form;
      const session = await api(`/auth/${mode}`, {
        method: "POST",
        body: JSON.stringify(payload),
      });
      saveSession(session);
      onAuthenticated(session);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }

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
          <div><strong>Live</strong><small>fleet visibility</small></div>
          <div><strong>10 stops</strong><small>per optimized route</small></div>
          <div><strong>OSRM</strong><small>distance intelligence</small></div>
        </div>
      </section>
      <section className="auth-panel">
        <div className="auth-card">
          <p className="eyebrow">{mode === "login" ? "Welcome back" : "Create workspace"}</p>
          <h2>{mode === "login" ? "Sign in to dispatch" : "Start managing your fleet"}</h2>
          <form onSubmit={submit}>
            {mode === "register" && (
              <>
                <label>Company name<input name="companyName" value={form.companyName} onChange={update} required /></label>
                <label>Account type
                  <select name="role" value={form.role} onChange={update}>
                    <option value="ROLE_SHIPPER">Fleet dispatcher</option>
                    <option value="ROLE_CARRIER">Carrier</option>
                  </select>
                </label>
              </>
            )}
            <label>Email address<input type="email" name="email" value={form.email} onChange={update} required /></label>
            <label>Password<input type="password" name="password" minLength="8" value={form.password} onChange={update} required /></label>
            {error && <p className="error">{error}</p>}
            <button className="primary" disabled={loading}>
              {loading ? "Working..." : mode === "login" ? "Sign in" : "Create account"}
            </button>
          </form>
          <button className="text-button" onClick={() => setMode(mode === "login" ? "register" : "login")}>
            {mode === "login" ? "Need an account? Register" : "Already registered? Sign in"}
          </button>
        </div>
      </section>
    </main>
  );
}
