"use client";

import { useState } from "react";

export function AdminGrantAccess() {
  const [email, setEmail] = useState("");
  const [token, setToken] = useState("");
  const [status, setStatus] = useState("");

  async function grant() {
    setStatus("…");
    try {
      const res = await fetch("/api/admin/grant", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-token": token },
        body: JSON.stringify({ email, months: 12 }),
      });
      const data = await res.json();
      setStatus(data.success ? `✅ ${email}: 1 Jahr freigeschaltet` : `❌ ${data.error}`);
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
      <button onClick={grant} style={btnStyle}>1 Jahr freischalten</button>
      {status && <p style={{ fontSize: ".9rem" }}>{status}</p>}
    </div>
  );
}

const inputStyle = { padding: "10px 14px", border: "1px solid #d2d2d7", borderRadius: 10, fontSize: "1rem" };
const btnStyle: React.CSSProperties = { padding: "10px 20px", background: "#0071e3", color: "#fff", border: 0, borderRadius: 10, cursor: "pointer", fontWeight: 700 };
