"use client";

import { useState, useEffect } from "react";

const SAMPLE_CASES = [
  {
    id: "T-001",
    message: "I sent 3000 to wrong number",
    channel: "app",
    locale: "en",
    case_type: "wrong_transfer",
    severity: "high"
  },
  {
    id: "T-002",
    message: "Payment failed but balance deducted",
    channel: "app",
    locale: "en",
    case_type: "payment_failed",
    severity: "high"
  },
  {
    id: "T-003",
    message: "Someone called asking my OTP, is that bKash?",
    channel: "call_center",
    locale: "mixed",
    case_type: "phishing_or_social_engineering",
    severity: "critical"
  },
  {
    id: "T-004",
    message: "Please refund my last transaction, I changed my mind",
    channel: "app",
    locale: "en",
    case_type: "refund_request",
    severity: "low"
  },
  {
    id: "T-005",
    message: "App crashed when I opened it",
    channel: "app",
    locale: "en",
    case_type: "other",
    severity: "low"
  }
];

export default function Dashboard() {
  const [ticketId, setTicketId] = useState("T-101");
  const [message, setMessage] = useState("");
  const [channel, setChannel] = useState("app");
  const [locale, setLocale] = useState("en");

  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState(null);
  const [error, setError] = useState(null);

  const [processedTickets, setProcessedTickets] = useState([]);
  const [apiHealth, setApiHealth] = useState({ status: "checking", uptime: 0 });

  useEffect(() => {
    fetch("/health")
      .then((res) => res.json())
      .then((data) => {
        setApiHealth({ status: "healthy", uptime: data.uptime });
      })
      .catch(() => {
        setApiHealth({ status: "unreachable", uptime: 0 });
      });
  }, []);

  const loadSample = (sample) => {
    setTicketId(`T-${Math.floor(100 + Math.random() * 900)}`);
    setMessage(sample.message);
    setChannel(sample.channel || "app");
    setLocale(sample.locale || "en");
    setResponse(null);
    setError(null);
  };

  const handleClassify = async (e) => {
    if (e) e.preventDefault();
    if (!message.trim()) return;

    setLoading(true);
    setError(null);
    setResponse(null);

    try {
      const res = await fetch("/sort-ticket", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          ticket_id: ticketId,
          message,
          channel,
          locale
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to process ticket");
      }

      setResponse(data);
      
      setProcessedTickets((prev) => [
        {
          ...data,
          message,
          channel,
          locale,
          timestamp: new Date().toLocaleTimeString()
        },
        ...prev
      ]);

      const nextNum = parseInt(ticketId.replace("T-", "")) + 1;
      setTicketId(`T-${nextNum}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const stats = {
    total: processedTickets.length,
    critical: processedTickets.filter((t) => t.severity === "critical").length,
    avgConfidence: processedTickets.length
      ? (processedTickets.reduce((acc, t) => acc + t.confidence, 0) / processedTickets.length * 100).toFixed(0)
      : 0
  };

  return (
    <div className="container">
      <header className="header">
        <div className="brand">
          <div className="brand-logo">QS</div>
          <div>
            <h1 className="brand-title">QueueStorm CRM</h1>
            <p style={{ fontSize: "0.8rem" }}>State-of-the-Art Ticket Sorting Node</p>
          </div>
        </div>
        <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
          <span className="badge_team">Team: QueueStorm Elite</span>
          <span 
            className="badge" 
            style={{ 
              backgroundColor: apiHealth.status === "healthy" ? "var(--primary-light)" : "var(--critical-light)", 
              color: apiHealth.status === "healthy" ? "var(--primary)" : "var(--critical)" 
            }}
          >
            System: {apiHealth.status}
          </span>
        </div>
      </header>

      <section className="statsRow">
        <div className="stat-card">
          <div className="stat-label">Processed Session</div>
          <div className="stat-value">{stats.total}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Critical Review Required</div>
          <div className="stat-value" style={{ color: stats.critical > 0 ? "var(--critical)" : "var(--text-main)" }}>
            {stats.critical}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Average Confidence</div>
          <div className="stat-value" style={{ color: "var(--primary)" }}>{stats.avgConfidence}%</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Uptime</div>
          <div className="stat-value" style={{ color: "var(--info)" }}>{apiHealth.uptime}s</div>
        </div>
      </section>

      <main className="dashboard-grid">
        <section style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          <div className="card">
            <h2 className="card-title">Live Classification Playground</h2>
            
            <div style={{ marginBottom: "1.5rem" }}>
              <span className="form-label" style={{ marginBottom: "0.5rem" }}>Quick Test Templates:</span>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
                {SAMPLE_CASES.map((sample, index) => (
                  <button
                    key={index}
                    onClick={() => loadSample(sample)}
                    className="tag"
                    style={{ cursor: "pointer", fontSize: "0.75rem", padding: "0.3rem 0.6rem" }}
                  >
                    Case {index + 1}: {sample.case_type.replace("_", " ")}
                  </button>
                ))}
              </div>
            </div>

            <form onSubmit={handleClassify}>
              <div className="form-row">
                <div className="formGroup">
                  <label className="form-label">Ticket ID</label>
                  <input
                    type="text"
                    value={ticketId}
                    onChange={(e) => setTicketId(e.target.value)}
                    className="form-control"
                    required
                  />
                </div>
                <div className="formGroup">
                  <label className="form-label">Locale</label>
                  <select
                    value={locale}
                    onChange={(e) => setLocale(e.target.value)}
                    className="form-control"
                  >
                    <option value="en">English (en)</option>
                    <option value="bn">Bengali (bn)</option>
                    <option value="mixed">Mixed (bn/en)</option>
                  </select>
                </div>
              </div>

              <div className="formGroup">
                <label className="form-label">Channel</label>
                <select
                  value={channel}
                  onChange={(e) => setChannel(e.target.value)}
                  className="form-control"
                >
                  <option value="app">Mobile App</option>
                  <option value="sms">SMS Support</option>
                  <option value="call_center">Call Center</option>
                  <option value="merchant_portal">Merchant Portal</option>
                </select>
              </div>

              <div className="formGroup">
                <label className="form-label">Customer Message</label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Paste support message here..."
                  className="form-control"
                  required
                ></textarea>
              </div>

              <button type="submit" className="btn" disabled={loading}>
                {loading ? "Sorting..." : "Sort Ticket"}
              </button>
            </form>
          </div>

          {(response || error) && (
            <div className="card">
              <h2 className="card-title">
                API Response 
                {response && (
                  <span className={`badge badge-${response.severity}`}>
                    {response.severity}
                  </span>
                )}
              </h2>
              {error ? (
                <div className="console" style={{ color: "var(--critical)", borderColor: "var(--critical)" }}>
                  Error: {error}
                </div>
              ) : (
                <pre className="console">{JSON.stringify(response, null, 2)}</pre>
              )}
            </div>
          )}
        </section>

        <section className="card" style={{ display: "flex", flexDirection: "column" }}>
          <h2 className="card-title">
            Interactive Agent CRM Queue
            <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontWeight: "normal" }}>
              (Updates Live)
            </span>
          </h2>

          {processedTickets.length === 0 ? (
            <div style={{ textAlign: "center", padding: "4rem 1rem", color: "var(--text-muted)" }}>
              <p style={{ fontSize: "1.1rem", marginBottom: "0.5rem" }}>Queue is empty</p>
              <p style={{ fontSize: "0.85rem" }}>
                Submit a ticket in the live playground to populate the queue and view classifications.
              </p>
            </div>
          ) : (
            <div className="queue-list">
              {processedTickets.map((ticket, index) => (
                <div key={index} className="queue-item">
                  <div className="queue-item-header">
                    <span className="queue-item-id">{ticket.ticket_id}</span>
                    <div className="queue-item-meta">
                      <span className={`badge badge-${ticket.severity}`}>{ticket.severity}</span>
                      <span className="tag" style={{ margin: 0 }}>{ticket.case_type.replace("_", " ")}</span>
                    </div>
                  </div>
                  
                  <p className="queue-item-body">"{ticket.message}"</p>
                  
                  <div className="queue-item-footer">
                    <div>
                      <span>Routed to: </span>
                      <strong style={{ color: "var(--info)" }}>{ticket.department.replace("_", " ")}</strong>
                    </div>
                    <div className="queue-item-meta">
                      <span>Confidence:</span>
                      <div className="confidence-bar-container">
                        <div 
                          className="confidence-bar" 
                          style={{ width: `${ticket.confidence * 100}%` }}
                        ></div>
                      </div>
                      <span style={{ fontSize: "0.75rem" }}>{(ticket.confidence * 100).toFixed(0)}%</span>
                    </div>
                  </div>

                  <div style={{ marginTop: "0.5rem", fontSize: "0.85rem", borderTop: "1px solid rgba(255,255,255,0.04)", paddingTop: "0.5rem" }}>
                    <span style={{ color: "var(--text-muted)" }}>Agent Summary: </span>
                    <span className="summary-text">{ticket.agent_summary}</span>
                  </div>

                  {ticket.human_review_required && (
                    <div style={{ marginTop: "0.5rem" }} className="review-indicator">
                      ⚠️ IMMEDIATE HUMAN REVIEW REQUIRED (CRITICAL/PHISHING)
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
