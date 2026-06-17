"use client";

import { type FormEvent, useState } from "react";

const FORMSPREE_URL = "https://formspree.io/f/xrelwzop";

type Status = "idle" | "sending" | "success" | "error";

export function ContactForm() {
  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("sending");
    setErrorMessage("");

    const form = e.currentTarget;
    const data = new FormData(form);

    try {
      const res = await fetch(FORMSPREE_URL, {
        method: "POST",
        body: data,
        headers: { Accept: "application/json" },
      });

      if (res.ok) {
        setStatus("success");
        form.reset();
      } else {
        const body = await res.json().catch(() => ({}));
        setErrorMessage(
          body.error || "Leider ist etwas schiefgegangen. Bitte versuch es später noch einmal."
        );
        setStatus("error");
      }
    } catch {
      setErrorMessage(
        "Leider ist etwas schiefgegangen. Bitte versuch es später noch einmal."
      );
      setStatus("error");
    }
  }

  if (status === "success") {
    return (
      <div className="contact-success">
        <div className="contact-success-icon" aria-hidden="true">✓</div>
        <h2>Nachricht gesendet</h2>
        <p>Danke! Ich melde mich so bald wie möglich bei dir.</p>
        <button
          type="button"
          className="button-secondary"
          onClick={() => setStatus("idle")}
        >
          Weitere Nachricht senden
        </button>
      </div>
    );
  }

  return (
    <form className="contact-form" onSubmit={handleSubmit} noValidate>
      <div className="contact-form-grid">
        <label className="contact-field">
          <span>Name</span>
          <input
            name="name"
            type="text"
            required
            autoComplete="name"
            placeholder="Dein Name"
          />
        </label>
        <label className="contact-field">
          <span>E-Mail</span>
          <input
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="deine@email.de"
          />
        </label>
      </div>
      <label className="contact-field">
        <span>Nachricht</span>
        <textarea
          name="message"
          required
          rows={5}
          placeholder="Worum geht's? ..."
        />
      </label>
      {status === "error" && (
        <p className="contact-error" role="alert">{errorMessage}</p>
      )}
      <button
        type="submit"
        className="button"
        disabled={status === "sending"}
      >
        {status === "sending" ? "Wird gesendet …" : "Nachricht senden"}
      </button>
    </form>
  );
}
