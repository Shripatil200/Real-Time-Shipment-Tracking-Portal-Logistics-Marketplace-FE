import { useEffect, useState } from "react";
import { api } from "./api";

export default function ShipmentBidPanel({ session }) {
  const [shipments, setShipments] = useState([]);
  const [myBids, setMyBids] = useState({});
  const [bidAmount, setBidAmount] = useState({});
  const [message, setMessage] = useState("");

  const isCarrier = session?.role === "ROLE_CARRIER";
  const isShipper = session?.role === "ROLE_SHIPPER";

  const [newShipment, setNewShipment] = useState({ origin: "", destination: "", weight: "" });

  useEffect(() => { loadShipments(); }, []);

  async function loadShipments() {
    try {
      const data = isShipper
        ? await api("/shipments/mine")
        : await api("/shipments/open");
      setShipments(data);
    } catch (e) { setMessage(e.message); }
  }

  async function createShipment(e) {
    e.preventDefault();
    try {
      await api("/shipments", {
        method: "POST",
        body: JSON.stringify({ ...newShipment, weight: Number(newShipment.weight) }),
      });
      setNewShipment({ origin: "", destination: "", weight: "" });
      setMessage("Shipment posted for bidding.");
      loadShipments();
    } catch (e) { setMessage(e.message); }
  }

  async function placeBid(shipmentId) {
    const amount = bidAmount[shipmentId];
    if (!amount) return setMessage("Enter a bid amount first.");
    try {
      await api(`/shipments/${shipmentId}/bids`, {
        method: "POST",
        body: JSON.stringify({ bidAmount: Number(amount) }),
      });
      setMessage("Bid placed successfully.");
      setBidAmount((prev) => ({ ...prev, [shipmentId]: "" }));
      loadShipments();
    } catch (e) { setMessage(e.message); }
  }

  async function loadBids(shipmentId) {
    try {
      const bids = await api(`/shipments/${shipmentId}/bids`);
      setMyBids((prev) => ({ ...prev, [shipmentId]: bids }));
    } catch (e) { setMessage(e.message); }
  }

  async function acceptBid(shipmentId, bidId) {
    try {
      await api(`/shipments/${shipmentId}/bids/${bidId}/accept`, { method: "POST" });
      setMessage("Bid accepted. Shipment awarded!");
      loadShipments();
    } catch (e) { setMessage(e.message); }
  }

  return (
    <div className="dispatch-stack">
      {message && <div className="notice" onClick={() => setMessage("")}>{message} <b>×</b></div>}

      {isShipper && (
        <section className="card form-card">
          <h2>Post New Shipment</h2>
          <form onSubmit={createShipment}>
            <label>Origin<input value={newShipment.origin} onChange={e => setNewShipment({ ...newShipment, origin: e.target.value })} required /></label>
            <label>Destination<input value={newShipment.destination} onChange={e => setNewShipment({ ...newShipment, destination: e.target.value })} required /></label>
            <label>Weight (kg)<input type="number" value={newShipment.weight} onChange={e => setNewShipment({ ...newShipment, weight: e.target.value })} required /></label>
            <button className="primary">Post Shipment</button>
          </form>
        </section>
      )}

      <section className="card">
        <div className="card-title">
          <h2>{isShipper ? "My Shipments" : "Open Shipments — Place a Bid"}</h2>
          <button className="secondary small" onClick={loadShipments}>↻ Refresh</button>
        </div>

        {shipments.length === 0 ? (
          <div className="no-data">No shipments found.</div>
        ) : (
          <div className="delivery-list">
            {shipments.map((s) => (
              <article key={s.id}>
                <div>
                  <strong>{s.origin} → {s.destination}</strong>
                  <p>{s.weight} kg</p>
                  <small>Status: {s.status}</small>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem", alignItems: "flex-end" }}>
                  <span className={`status ${s.status?.toLowerCase()}`}>{s.status}</span>

                  {isCarrier && s.status === "OPEN" && (
                    <div style={{ display: "flex", gap: "0.4rem" }}>
                      <input
                        type="number"
                        placeholder="₹ Bid"
                        value={bidAmount[s.id] || ""}
                        onChange={(e) => setBidAmount((prev) => ({ ...prev, [s.id]: e.target.value }))}
                        style={{ width: "90px", padding: "0.3rem" }}
                      />
                      <button className="primary small" onClick={() => placeBid(s.id)}>Bid</button>
                    </div>
                  )}

                  {isShipper && (
                    <button className="secondary small" onClick={() => loadBids(s.id)}>
                      View bids
                    </button>
                  )}
                </div>

                {/* Bids for this shipment (shipper view) */}
                {myBids[s.id] && (
                  <div className="bid-list" style={{ width: "100%", marginTop: "0.5rem" }}>
                    {myBids[s.id].length === 0 ? (
                      <small>No bids yet.</small>
                    ) : (
                      myBids[s.id].map((bid) => (
                        <div key={bid.id} className="bid-row">
                          <span>Carrier: {bid.carrier?.companyName || bid.carrier?.email}</span>
                          <span>₹{bid.bidAmount}</span>
                          <span className={`status ${bid.status?.toLowerCase()}`}>{bid.status}</span>
                          {bid.status === "PENDING" && s.status === "OPEN" && (
                            <button className="primary small" onClick={() => acceptBid(s.id, bid.id)}>
                              Accept
                            </button>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
