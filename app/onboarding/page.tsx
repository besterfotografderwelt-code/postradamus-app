"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const businessTypes = [
  { id: "restaurant", label: "Restaurant / Café", icon: "🍽️", tags: ["Gerichte", "Interior", "Team", "Gäste", "Zubereitung", "Angebote"] },
  { id: "fitness", label: "Fitness / Coaching", icon: "💪", tags: ["Workout", "Transformation", "Ernährung", "Motivation", "Kunde", "Studio"] },
  { id: "mode", label: "Mode / Beauty", icon: "✨", tags: ["Outfit", "Detail", "Behind the Scenes", "Trend", "Kunde", "Styling"] },
  { id: "hotel", label: "Hotel / Unterkunft", icon: "🏨", tags: ["Zimmer", "Ausblick", "Service", "Frühstück", "Wellness", "Umgebung"] },
  { id: "immobilien", label: "Immobilien", icon: "🏠", tags: ["Innen", "Außen", "Lage", "Details", "Verkauft", "Neuzugang"] },
  { id: "handwerk", label: "Handwerk", icon: "🔨", tags: ["Vorher/Nachher", "Arbeit", "Team", "Material", "Kunde", "Projekt"] },
  { id: "hochzeitsfotograf", label: "Hochzeitsfotograf", icon: "💍", tags: ["Getting Ready", "Trauung", "Paarshooting", "Gruppenbilder", "Dinner", "Party", "Details"] },
  { id: "portraitfotograf", label: "Portraitfotograf", icon: "📸", tags: ["Studio", "Outdoor", "Business", "Familie", "Kinder", "Bewerbung"] },
  { id: "produktfotograf", label: "Produktfotograf", icon: "📦", tags: ["Weißer Hintergrund", "Lifestyle", "Detail", "Verpackung", "Flatlay", "Werbung"] },
  { id: "reise", label: "Reise / Travel", icon: "✈️", tags: ["Landschaft", "Stadt", "Menschen", "Essen", "Hotel", "Abenteuer"] },
  { id: "kunst", label: "Kunst / Kreativ", icon: "🎨", tags: ["Werk", "Prozess", "Atelier", "Ausstellung", "Detail", "Inspiration"] },
  { id: "sonstiges", label: "Sonstiges", icon: "🎯", tags: ["Produkt", "Service", "Team", "Arbeit", "Inspiration", "Angebot"] },
];

type ExampleImage = { icon: string; label: string; description: string };

const examplesByBusiness: Record<string, ExampleImage[]> = {
  fitness: [
    { icon: "🏋️", label: "Krafttraining im Studio", description: "Person an der Beinpresse, konzentriert, Studio-Licht" },
    { icon: "💪", label: "Nach dem Workout", description: "Selfie nach dem Training, verschwitzt aber happy" },
    { icon: "🥗", label: "Meal Prep", description: "Vorbereitete Mahlzeiten in Boxen, clean angerichtet" },
  ],
  restaurant: [
    { icon: "🍝", label: "Signature Dish", description: "Der Teller mit eurem besten Gericht, perfekt angerichtet" },
    { icon: "🪑", label: "Gastraum", description: "Gedeckte Tische bei Kerzenlicht, warme Stimmung" },
    { icon: "👨‍🍳", label: "Küche in Action", description: "Koch bei der Arbeit, Fokus auf Handwerk" },
  ],
  hochzeitsfotograf: [
    { icon: "💍", label: "Ring-Detail", description: "Eheringe auf Blumen, Nahaufnahme" },
    { icon: "👰", label: "Braut beim Getting Ready", description: "Braut vor dem Spiegel, Umgebung mit Fenster" },
    { icon: "💒", label: "Trauung", description: "Paar am Altar, Gäste im Hintergrund" },
  ],
  produktfotograf: [
    { icon: "📦", label: "Produkt auf Weiß", description: "Produkt freigestellt auf weißem Hintergrund" },
    { icon: "☕", label: "Lifestyle-Shot", description: "Produkt im Einsatz, natürliches Licht" },
    { icon: "🔍", label: "Detailaufnahme", description: "Makro-Aufnahme von Material oder Textur" },
  ],
  portraitfotograf: [
    { icon: "🧑‍💼", label: "Business-Portrait", description: "Person im Anzug vor neutralem Hintergrund" },
    { icon: "👨‍👩‍👧", label: "Familien-Shooting", description: "Familie im Freien, natürliches Licht" },
    { icon: "🎭", label: "Kreativ-Portrait", description: "Person mit farbigem Licht, ausdrucksstark" },
  ],
  immobilien: [
    { icon: "🏠", label: "Außenansicht", description: "Hausfront mit Garten, Sonnenlicht" },
    { icon: "🛋️", label: "Wohnzimmer", description: "Helles Wohnzimmer mit Ausblick" },
    { icon: "🍳", label: "Küche", description: "Moderne Einbauküche, offener Grundriss" },
  ],
  handwerk: [
    { icon: "🔨", label: "Arbeit im Gange", description: "Handwerker bei der Arbeit an einem Projekt" },
    { icon: "✨", label: "Vorher/Nachher", description: "Side-by-Side vor und nach der Renovierung" },
    { icon: "🧰", label: "Werkzeug & Material", description: "Professionell arrangiertes Werkzeug" },
  ],
  mode: [
    { icon: "👗", label: "Outfit des Tages", description: "Komplettes Outfit, natürliche Pose" },
    { icon: "🪞", label: "Behind the Scenes", description: "Blick hinter die Kulissen eines Shootings" },
    { icon: "💄", label: "Detail am Kleid", description: "Stoff-Struktur oder besonderes Detail" },
  ],
  hotel: [
    { icon: "🛏️", label: "Zimmer", description: "Helles Hotelzimmer mit Aussicht" },
    { icon: "🍳", label: "Frühstück", description: "Buffet mit regionalen Produkten" },
    { icon: "🧖", label: "Wellness", description: "Sauna oder Pool, ruhige Atmosphäre" },
  ],
  reise: [
    { icon: "🏔️", label: "Landschaft", description: "Weite Aussicht mit Bergkulisse" },
    { icon: "🏙️", label: "Stadt", description: "Straßenszene mit lokalem Flair" },
    { icon: "🍜", label: "Streetfood", description: "Lokales Essen an einem Marktstand" },
  ],
  kunst: [
    { icon: "🎨", label: "Im Atelier", description: "Künstler bei der Arbeit an einem Werk" },
    { icon: "🖼️", label: "Ausstellung", description: "Galerie mit Werken an der Wand" },
    { icon: "✨", label: "Detail", description: "Nahaufnahme von Pinselstrich oder Textur" },
  ],
  sonstiges: [
    { icon: "🏢", label: "Unternehmen", description: "Team bei der Arbeit oder Produkt in Aktion" },
    { icon: "🤝", label: "Kundentermin", description: "Persönliches Gespräch oder Beratung" },
    { icon: "📊", label: "Ergebnis", description: "Visualisierung eines Ergebnisses oder Erfolgs" },
  ],
};

function getExamples(bt: string): ExampleImage[] {
  return examplesByBusiness[bt] || examplesByBusiness.sonstiges;
}

type StyleProfile = {
  tone: string;
  sentenceStyle: string;
  address: string;
  emojiDensity: string;
  hashtagStyle: string;
  opener: string;
  closer: string;
  traits: string;
  promptAddition: string;
};

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState<"type" | "name" | "style" | "done">("type");
  const [businessType, setBusinessType] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [captions, setCaptions] = useState<string[]>(["", "", ""]);
  const [analyzing, setAnalyzing] = useState(false);
  const [profile, setProfile] = useState<StyleProfile | null>(null);
  const [error, setError] = useState("");

  const examples = getExamples(businessType);

  async function analyzeStyle() {
    const filled = captions.filter((c) => c.trim().length > 10);
    if (filled.length < 2) {
      setError("Bitte schreib zu mindestens 2 Bildern eine Caption (je mindestens 10 Zeichen).");
      return;
    }
    setAnalyzing(true); setError("");
    try {
      const res = await fetch("/api/analyze-style", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ captions: filled, businessType })
      });
      const data = await res.json();
      if (!res.ok || !data.profile) throw new Error(data.error || "Analyse fehlgeschlagen");
      setProfile(data.profile);
      setStep("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Fehler bei der Analyse");
    } finally {
      setAnalyzing(false);
    }
  }

  function finish() {
    const bt = businessTypes.find((b) => b.id === businessType);
    const config = {
      businessType,
      businessName: businessName || bt?.label || "",
      tags: bt?.tags || businessTypes[businessTypes.length - 1].tags,
      completed: true,
      createdAt: new Date().toISOString(),
      styleProfile: profile || undefined
    };
    localStorage.setItem("flowstream.onboarding", JSON.stringify(config));
    router.push("/projects/new");
  }

  function skipStyle() {
    const bt = businessTypes.find((b) => b.id === businessType);
    const config = {
      businessType,
      businessName: businessName || bt?.label || "",
      tags: bt?.tags || businessTypes[businessTypes.length - 1].tags,
      completed: true,
      createdAt: new Date().toISOString()
    };
    localStorage.setItem("flowstream.onboarding", JSON.stringify(config));
    router.push("/projects/new");
  }

  return (
    <div className="narrow-page">
      <section className="form-card">
        <div className="eyebrow">Willkommen</div>
        <h1>Erzähl uns von deinem Business</h1>
        <p className="lead" style={{ fontSize: "1.05rem", marginTop: 12 }}>
          Nur ein paar Fragen – dann ist alles für dich optimiert.
        </p>

        {step === "type" ? (
          <>
            <div className="business-grid">
              {businessTypes.map((bt) => (
                <button
                  className={`business-card ${businessType === bt.id ? "is-active" : ""}`}
                  key={bt.id}
                  onClick={() => { setBusinessType(bt.id); setStep("name"); }}
                  type="button"
                >
                  <span className="business-icon">{bt.icon}</span>
                  <strong>{bt.label}</strong>
                </button>
              ))}
            </div>
          </>
        ) : step === "name" ? (
          <div className="form" style={{ marginTop: 24 }}>
            <div className="field">
              <label htmlFor="bizName">Name deines Unternehmens</label>
              <input
                autoFocus
                id="bizName"
                onChange={(e) => setBusinessName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && setStep("style")}
                placeholder={businessTypes.find((b) => b.id === businessType)?.label || "Dein Business"}
                value={businessName}
              />
            </div>
            <div className="hero-actions">
              <button className="button" onClick={() => setStep("style")} type="button">
                Weiter →
              </button>
              <button className="button-secondary" onClick={() => setStep("type")} type="button">
                ← Zurück
              </button>
            </div>
          </div>
        ) : step === "style" ? (
          <div style={{ marginTop: 24 }}>
            <h2>Dein Schreibstil 🖋️</h2>
            <p style={{ marginBottom: 16 }}>
              Damit deine Captions nach <em>dir</em> klingen, schreib zu diesen Beispielbildern,
              wie du es auf Instagram tun würdest. Mindestens 2, gern alle 3.
            </p>

            <div className="style-examples">
              {examples.map((ex, i) => (
                <div className="style-card" key={i}>
                  <div className="style-image-placeholder">
                    <span className="style-image-icon">{ex.icon}</span>
                    <span className="style-image-label">{ex.label}</span>
                    <span className="style-image-desc">{ex.description}</span>
                  </div>
                  <textarea
                    className="style-caption-input"
                    onChange={(e) => {
                      const next = [...captions];
                      next[i] = e.target.value;
                      setCaptions(next);
                    }}
                    placeholder={`Deine Caption für »${ex.label}« …`}
                    rows={3}
                    value={captions[i]}
                  />
                </div>
              ))}
            </div>

            {error ? <p className="form-message form-message-error">{error}</p> : null}

            <div className="hero-actions" style={{ marginTop: 20 }}>
              <button className="button" disabled={analyzing} onClick={analyzeStyle} type="button">
                {analyzing ? "Analysiere deinen Stil …" : "Stil analysieren ✨"}
              </button>
              <button className="button-secondary" onClick={skipStyle} type="button">
                Überspringen
              </button>
            </div>
          </div>
        ) : (
          <div style={{ marginTop: 24 }}>
            <h2>Dein Stil-Profil 🎯</h2>
            <div className="style-profile-card">
              <div className="profile-traits">
                {profile?.traits.split(/[,;] ?/).map((t, i) => (
                  <span className="profile-trait-tag" key={i}>{t.trim()}</span>
                ))}
              </div>
              <table className="profile-table">
                <tbody>
                  <tr><td>Grundton</td><td><strong>{profile?.tone}</strong></td></tr>
                  <tr><td>Satzbau</td><td>{profile?.sentenceStyle}</td></tr>
                  <tr><td>Anrede</td><td>{profile?.address}</td></tr>
                  <tr><td>Emojis</td><td>{profile?.emojiDensity}</td></tr>
                  <tr><td>Hashtags</td><td>{profile?.hashtagStyle}</td></tr>
                  <tr><td>Einstieg</td><td>{profile?.opener}</td></tr>
                  <tr><td>Abschluss</td><td>{profile?.closer}</td></tr>
                </tbody>
              </table>
              <p className="helper" style={{ marginTop: 12 }}>
                Dein Stil wird jetzt bei jeder Caption automatisch angewendet.
              </p>
            </div>
            <div className="hero-actions" style={{ marginTop: 20 }}>
              <button className="button" onClick={finish} type="button">
                Los geht&apos;s 🚀
              </button>
              <button className="button-secondary" onClick={() => setStep("style")} type="button">
                ← Nochmal
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
