"use client";

import { useRouter } from "next/navigation";
import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import { getProjectRepository } from "@/lib/repositories/get-project-repository";

type ProjectStartMode = "quick" | "details" | null;

export type OnboardingConfig = {
  businessType: string;
  businessName: string;
  tags: string[];
  completed: boolean;
};

const defaultConfig: OnboardingConfig = {
  businessType: "sonstiges",
  businessName: "",
  tags: ["Studio", "Outdoor", "Business", "Detail", "Team", "Projekt"],
  completed: false
};

function getOnboardingConfig(): OnboardingConfig {
  try {
    const raw = localStorage.getItem("flowstream.onboarding");
    return raw ? JSON.parse(raw) : defaultConfig;
  } catch { return defaultConfig; }
}

const initialForm = {
  businessType: "sonstiges",
  coupleName: "",
  weddingDate: "",
  location: "",
  style: "Zeitlos und emotional",
  specialNotes: "",
  tone: "Warm und persönlich",
  language: "DE" as "DE" | "EN",
  imageCount: 0,
  internalNotes: ""
};

export function ProjectCreateForm() {
  const router = useRouter();
  const [mode, setMode] = useState<ProjectStartMode>(null);
  const [form, setForm] = useState(initialForm);
  const [ready, setReady] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [onboarding] = useState<OnboardingConfig>(getOnboardingConfig);

  useEffect(() => setReady(true), []);

  useEffect(() => {
    if (!onboarding.completed) router.replace("/onboarding");
    // Pre-fill with business name
    if (onboarding.businessName) {
      setForm((f) => ({ ...f, coupleName: onboarding.businessName }));
    }
    if (onboarding.businessType) {
      setForm((f) => ({ ...f, businessType: onboarding.businessType }));
    }
  }, [onboarding, router]);

  function updateField<K extends keyof typeof initialForm>(key: K, value: (typeof initialForm)[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setErrorMessage("");
    try {
      const project = await getProjectRepository().create({
        ...form,
        specialNotes: form.internalNotes,
        imageCount: Number(form.imageCount)
      });
      // Store onboarding tags for this project
      localStorage.setItem(`flowstream.project-tags.${project.id}`, JSON.stringify(onboarding.tags));
      router.push(`/projects/${project.id}`);
      router.refresh();
    } catch {
      setErrorMessage("Das Projekt konnte nicht gespeichert werden.");
      setIsSaving(false);
    }
  }

  async function createQuickProject() {
    setIsSaving(true);
    setErrorMessage("");
    try {
      const project = await getProjectRepository().create(initialForm);
      localStorage.setItem(`flowstream.project-tags.${project.id}`, JSON.stringify(onboarding.tags));
      router.push(`/projects/${project.id}`);
      router.refresh();
    } catch {
      setErrorMessage("Das Projekt konnte nicht gespeichert werden.");
      setIsSaving(false);
    }
  }

  return (
    <div className="narrow-page">
      <section className="form-card">
        <div className="eyebrow">{onboarding.businessName || onboarding.businessType || "Neues Projekt"}</div>
        <h1>Wie möchtest du starten?</h1>

        <div className="start-options">
          <button
            className={`start-option ${mode === "quick" ? "is-active" : ""}`}
            disabled={!ready || isSaving}
            onClick={() => { setMode("quick"); void createQuickProject(); }}
            type="button"
          >
            <strong>{isSaving && mode === "quick" ? "Wird vorbereitet …" : "Nur Fotos hochladen"}</strong>
            <span>Direkt zur Bildauswahl. Alles Weitere kommt später.</span>
          </button>
          <button
            className={`start-option ${mode === "details" ? "is-active" : ""}`}
            disabled={!ready || isSaving}
            onClick={() => setMode("details")}
            type="button"
          >
            <strong>Mit Angaben starten</strong>
            <span>Name, Datum und Ort gleich eintragen.</span>
          </button>
        </div>

        {mode === null ? (
          <div className="quick-name-field" style={{ marginTop: 20 }}>
            <label className="field" style={{ gap: 6 }}>
              <span style={{ color: "var(--muted)", fontSize: ".88rem", fontWeight: 600 }}>Projektname (optional)</span>
              <input
                onChange={(e) => updateField("coupleName", e.target.value)}
                placeholder="z.B. Sommerkampagne 2026"
                value={form.coupleName}
              />
            </label>
          </div>
        ) : null}

        {mode === "details" ? <form className="form project-details-form" onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="coupleName">Projektname</label>
            <input
              autoFocus
              id="coupleName"
              onChange={(event) => updateField("coupleName", event.target.value)}
              placeholder="z.B. Sommerkampagne 2026"
              required
              value={form.coupleName}
            />
          </div>

          <div className="field-grid">
            <div className="field">
              <label htmlFor="weddingDate">Datum</label>
              <input
                id="weddingDate"
                onChange={(event) => updateField("weddingDate", event.target.value)}
                type="date"
                value={form.weddingDate}
              />
            </div>
            <div className="field">
              <label htmlFor="location">Ort</label>
              <input
                id="location"
                onChange={(event) => updateField("location", event.target.value)}
                placeholder="Bregenz"
                value={form.location}
              />
            </div>
          </div>

          <details className="optional-fields">
            <summary>Weitere Angaben</summary>
            <div className="optional-fields-body">
              <div className="field-grid">
                <div className="field">
                  <label htmlFor="language">Sprache</label>
                  <select id="language" onChange={(event) => updateField("language", event.target.value as "DE" | "EN")} value={form.language}>
                    <option value="DE">Deutsch</option>
                    <option value="EN">Englisch</option>
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="imageCount">Geplante Bilder</label>
                  <input id="imageCount" min="0" onChange={(event) => updateField("imageCount", Number(event.target.value))} type="number" value={form.imageCount} />
                </div>
              </div>
              <div className="field">
                <label htmlFor="internalNotes">Notizen</label>
                <textarea id="internalNotes" onChange={(event) => updateField("internalNotes", event.target.value)} placeholder="Was macht dieses Projekt besonders?" value={form.internalNotes} />
              </div>
            </div>
          </details>

          <div className="hero-actions">
            <button className="button" disabled={!ready || isSaving} type="submit">{isSaving ? "Wird angelegt …" : "Weiter"}</button>
            <button className="button-secondary" onClick={() => router.push("/")} type="button">Abbrechen</button>
          </div>
          {errorMessage ? <div className="form-message form-message-error" role="alert">{errorMessage}</div> : null}
        </form> : null}
        {mode !== "details" && errorMessage ? (
          <div className="form-message form-message-error" role="alert">{errorMessage}</div>
        ) : null}
        {mode === null ? <button className="button-secondary cancel-start" onClick={() => router.push("/")} type="button">Abbrechen</button> : null}
      </section>
    </div>
  );
}
