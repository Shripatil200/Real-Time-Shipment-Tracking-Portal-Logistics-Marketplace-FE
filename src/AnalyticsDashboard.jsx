import { useEffect, useState } from "react";
import { api } from "./api";

export default function AnalyticsDashboard() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api("/analytics/dashboard")
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading-state">Loading analytics...</div>;
  if (error) return <div className="error-state">{error}</div>;
  if (!data) return null;

  const maxCount = Math.max(...data.weeklyDeliveries.map((d) => d.count), 1);

  return (
    <div className="analytics-stack">
      {/* KPI row */}
      <section className="metrics">
        <article className="metric teal">
          <small>Success Rate</small>
          <strong>{data.successRatePercent}%</strong>
          <p>{data.totalDelivered} of {data.totalCompleted} completed</p>
        </article>
        <article className="metric navy">
          <small>Active Deliveries</small>
          <strong>{data.activeDeliveries}</strong>
          <p>In transit or dispatched</p>
        </article>
        <article className="metric orange">
          <small>Routes This Week</small>
          <strong>{data.routePlansThisWeek}</strong>
          <p>Optimized route plans</p>
        </article>
      </section>

      <section className="grid-two">
        {/* Weekly deliveries bar chart */}
        <div className="card">
          <div className="card-title"><h2>Deliveries — Last 7 Days</h2></div>
          <div className="bar-chart">
            {data.weeklyDeliveries.map((d) => {
              const heightPct = maxCount === 0 ? 0 : (d.count / maxCount) * 100;
              const label = new Date(d.date).toLocaleDateString("en-IN", {
                weekday: "short",
                month: "short",
                day: "numeric",
              });
              return (
                <div key={d.date} className="bar-col">
                  <span className="bar-value">{d.count}</span>
                  <div className="bar-track">
                    <div
                      className="bar-fill"
                      style={{ height: `${heightPct}%` }}
                    />
                  </div>
                  <span className="bar-label">{label.split(",")[0]}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Top vehicles */}
        <div className="card">
          <div className="card-title"><h2>Top Vehicles by Deliveries</h2></div>
          {data.topVehicles.length === 0 ? (
            <div className="no-data">No completed deliveries yet.</div>
          ) : (
            <div className="leaderboard">
              {data.topVehicles.map((v, i) => (
                <div key={v.vehicleId} className="leaderboard-row">
                  <span className={`rank rank-${i + 1}`}>#{i + 1}</span>
                  <div className="leaderboard-info">
                    <strong>{v.licensePlate}</strong>
                  </div>
                  <div className="leaderboard-bar-wrap">
                    <div
                      className="leaderboard-bar"
                      style={{
                        width: `${(v.deliveriesCompleted / data.topVehicles[0].deliveriesCompleted) * 100}%`,
                      }}
                    />
                  </div>
                  <span className="leaderboard-count">{v.deliveriesCompleted}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Success rate gauge */}
      <section className="card success-gauge-card">
        <div className="card-title"><h2>Delivery Success Rate</h2></div>
        <div className="gauge-row">
          <svg viewBox="0 0 200 110" className="gauge-svg">
            <path
              d="M20,100 A80,80 0 0,1 180,100"
              fill="none"
              stroke="#e2e8f0"
              strokeWidth="16"
              strokeLinecap="round"
            />
            <path
              d="M20,100 A80,80 0 0,1 180,100"
              fill="none"
              stroke={data.successRatePercent >= 80 ? "#22c55e" : data.successRatePercent >= 50 ? "#f59e0b" : "#ef4444"}
              strokeWidth="16"
              strokeLinecap="round"
              strokeDasharray={`${(data.successRatePercent / 100) * 251} 251`}
            />
            <text x="100" y="90" textAnchor="middle" fontSize="28" fontWeight="700" fill="currentColor">
              {data.successRatePercent}%
            </text>
            <text x="100" y="108" textAnchor="middle" fontSize="10" fill="#94a3b8">
              success rate
            </text>
          </svg>
          <div className="gauge-legend">
            <p><span className="dot available" /> Delivered: <b>{data.totalDelivered}</b></p>
            <p><span className="dot maintenance" /> Failed / Incomplete: <b>{data.totalCompleted - data.totalDelivered}</b></p>
            <p><span className="dot assigned" /> Active: <b>{data.activeDeliveries}</b></p>
          </div>
        </div>
      </section>
    </div>
  );
}
