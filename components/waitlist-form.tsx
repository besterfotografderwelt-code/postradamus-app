"use client";

import { useState } from "react";

export function WaitlistForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setStatus("loading");

    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (res.ok) {
        setStatus("success");
        setMessage(data.message || "🎉 Danke für deine Anmeldung!");
        setEmail("");
      } else {
        setStatus("error");
        setMessage(data.error || "Etwas ist schiefgelaufen.");
      }
    } catch {
      setStatus("error");
      setMessage("Netzwerkfehler. Bitte später nochmal versuchen.");
    }
  }

  return (
    <form className="waitlist-form" onSubmit={handleSubmit}>
      <div className="waitlist-input-row">
        <input
          className="waitlist-input"
          type="email"
          placeholder="Deine E-Mail-Adresse"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          disabled={status === "loading"}
          aria-label="E-Mail-Adresse für Early Access"
        />
        <button
          className="button waitlist-button"
          type="submit"
          disabled={status === "loading"}
        >
          {status === "loading" ? "Wird angemeldet …" : "Early Access sichern"}
        </button>
      </div>
      {message && (
        <p
          className={`waitlist-message ${status === "success" ? "is-success" : "is-error"}`}
          role="status"
        >
          {message}
        </p>
      )}
    </form>
  );
}
