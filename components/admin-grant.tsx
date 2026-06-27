"use client";

import { useState } from "react";

export function AdminGrantAccess() {
  const [email, setEmail] = useState("");
  const [token, setToken] = useState("");
  const [months, setMonths] = useState(12);
  const [status, setStatus] = useState("");

  async function grant() {
    setStatus("…");
    try {
      const res = await fetch("/api/admin/grant", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-token": token },
        body: JSON.stringify({ email, months }),
      });
      const data = await res.json();
      if (data.success) {
        setStatus(`✅ ${email}: ${months} ${months === 1 ? "Monat" : "Monate"} freigeschaltet`);
      } else {
        setStatus(`❌ ${data.error}`);
      }
    } catch {
      setStatus("❌ Fehler");
    }
  }

  async function revoke() {
    if (!confirm(`${email} wirklich deaktivieren?`)) return;
    setStatus("…");
    try {
      const res = await fetch("/api/admin/grant", {
        method: "DELETE",
        headers: { "Content-Type": "application/json", "x-admin-token": token },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (data.success) {
        setStatus(`🔒 ${email}: Zugang deaktiviert`);
      } else {
        setStatus(`❌ ${data.error}`);
      }
    } catch {
      setStatus("❌ Fehler");
    }
  }

  return (
    <div style={{ display: "grid", gap: 12, maxWidth: 400, padding: "20px 0" }}>
      <input
        type="password"
        placeholder="Admin-Token"
        value={token}
        onChange={(e) => setToken(e.target.value)}
        style={inputStyle}
      />
      <input
        type="email"
        placeholder="kunde@email.de"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        style={inputStyle}
      />
      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
        <label style={{ fontSize: ".9rem", whiteSpace: "nowrap" }}>Laufzeit:</label>
        <select value={months} onChange={(e) => setMonths(Number(e.target.value))} style={inputStyle}>
          <option value={1}>1 Monat</option>
          <option value={3}>3 Monate</option>
          <option value={6}>6 Monate</option>
          <option value={12}>12 Monate</option>
        </select>
      </div>
      <div style={{ display: "flex", gap: 12 }}>
        <button onClick={grant} style={btnStyle}>Freischalten</button>
        <button onClick={revoke} style={revokeBtnStyle}>Deaktivieren</button>
      </div>
      {status && <p style={{ fontSize: ".9rem" }}>{status}</p>}
    </div>
  );
}

const inputStyle = { padding: "10px 14px", border: "1px solid #d2d2d7", borderRadius: 10, fontSize: "1rem" };
const btnStyle: React.CSSProperties = { padding: "10px 20px", background: "#0071e3", color: "#fff", border: 0, borderRadius: 10, cursor: "pointer", fontWeight: 700 };
const revokeBtnStyle: React.CSSProperties = { padding: "10px 20px", background: "#e30000", color: "#fff", border: 0, borderRadius: 10, cursor: "pointer", fontWeight: 700 };
