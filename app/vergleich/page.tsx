import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Postradamus vs. Alternativen – Der Vergleich",
  description:
    "Postradamus vs. Later, Hootsuite & manuelles Posten: Warum KI-generierte Captions und ein automatischer Postingplan mehr Zeit sparen als klassische Social-Media-Tools.",
};

const alternatives = [
  {
    name: "Later",
    claim: "Planung per Drag & Drop",
    strengths: [
      "Visueller Kalender",
      "Beste Posting-Zeiten (kostenpflichtig)",
      "Hashtag-Vorschläge",
    ],
    weaknesses: [
      "Keine KI-Captions",
      "Keine Bildanalyse",
      "Teuer: ab 25 $/Monat für Basic",
      "Nur Terminierung, kein Content",
    ],
  },
  {
    name: "Hootsuite",
    claim: "All-in-One für Teams",
    strengths: [
      "Multi-Plattform (IG, FB, LI, X)",
      "Team-Workflows",
      "Analytics-Dashboard",
    ],
    weaknesses: [
      "Keine KI-Captions",
      "Komplex, überladen",
      "Ab 99 $/Monat",
      "Für Einsteiger zu viel",
    ],
  },
  {
    name: "Buffer",
    claim: "Einfach & günstig",
    strengths: [
      "Klarer Posting-Kalender",
      "Gratis-Tarif (3 Kanäle)",
      "Saubere Benutzerführung",
    ],
    weaknesses: [
      "Keine KI-Captions",
      "Keine Bildanalyse",
      "Nur Planung, kein Content",
      "Hashtags manuell",
    ],
  },
  {
    name: "Manuelles Posten",
    claim: "Ohne Tool, direkt in der Instagram-App",
    strengths: [
      "Kostenlos",
      "Keine Einarbeitung",
      "Volle Kontrolle",
    ],
    weaknesses: [
      "Kein Postingplan",
      "Alles per Hand tippen",
      "Keine Konsistenz",
      "Kein Hashtag-Management",
      "Zeitfresser Nummer 1",
    ],
  },
];

const compareRows = [
  { feature: "KI-generierte Captions", postradamus: true, later: false, hootsuite: false, buffer: false },
  { feature: "Bildanalyse mit KI", postradamus: true, later: false, hootsuite: false, buffer: false },
  { feature: "Hashtag-Generierung", postradamus: true, later: "eingeschränkt", hootsuite: false, buffer: false },
  { feature: "Automatischer Postingplan", postradamus: true, later: true, hootsuite: true, buffer: true },
  { feature: "9 Tonalitäten", postradamus: true, later: false, hootsuite: false, buffer: false },
  { feature: "Eigener Schreibstil", postradamus: true, later: false, hootsuite: false, buffer: false },
  { feature: "Direkte Instagram-Veröffentlichung", postradamus: true, later: true, hootsuite: true, buffer: true },
  { feature: "Feed, Carousel & Stories", postradamus: true, later: true, hootsuite: true, buffer: true },
  { feature: "14 Tage kostenlos testen", postradamus: true, later: false, hootsuite: "30 Tage", buffer: "Gratis-Tarif" },
  { feature: "Einstiegspreis", postradamus: "29,90 €", later: "25 $", hootsuite: "99 $", buffer: "kostenlos" },
];

export default function VergleichPage() {
  return (
    <div className="landing-page">
      <section className="landing-section">
        <div className="landing-section-head">
          <div className="eyebrow">Vergleich</div>
          <h1>Postradamus vs. Later, Hootsuite &amp; Co.</h1>
          <p style={{ maxWidth: 640, marginInline: "auto" }}>
            Warum ein Tool mit KI-generierten Captions mehr bringt als ein reiner Posting-Timer –
            und für wen sich Postradamus besonders lohnt.
          </p>
        </div>
      </section>

      <section className="landing-section">
        <h2 style={{ textAlign: "center", marginBottom: 32 }}>Funktionen im Direktvergleich</h2>
        <div className="compare-table-wrap">
          <table className="compare-table">
            <thead>
              <tr>
                <th>Funktion</th>
                <th className="compare-featured">Postradamus</th>
                <th>Later</th>
                <th>Hootsuite</th>
                <th>Buffer</th>
              </tr>
            </thead>
            <tbody>
              {compareRows.map((row) => (
                <tr key={row.feature}>
                  <td>{row.feature}</td>
                  <td className="compare-featured">
                    {typeof row.postradamus === "boolean"
                      ? row.postradamus
                        ? "✓"
                        : "–"
                      : row.postradamus}
                  </td>
                  <td>
                    {typeof row.later === "boolean"
                      ? row.later
                        ? "✓"
                        : "–"
                      : row.later}
                  </td>
                  <td>
                    {typeof row.hootsuite === "boolean"
                      ? row.hootsuite
                        ? "✓"
                        : "–"
                      : row.hootsuite}
                  </td>
                  <td>
                    {typeof row.buffer === "boolean"
                      ? row.buffer
                        ? "✓"
                        : "–"
                      : row.buffer}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="landing-section">
        <h2 style={{ textAlign: "center", marginBottom: 32 }}>
          Die Alternativen im Detail
        </h2>
        <div className="alternative-grid">
          {alternatives.map((alt) => (
            <article className="alternative-card" key={alt.name}>
              <h3>{alt.name}</h3>
              <p className="alternative-claim">{alt.claim}</p>
              <div className="alternative-columns">
                <div>
                  <strong className="alternative-label good">Stärken</strong>
                  <ul className="alternative-list">
                    {alt.strengths.map((s) => (
                      <li key={s}>{s}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <strong className="alternative-label bad">Schwächen</strong>
                  <ul className="alternative-list">
                    {alt.weaknesses.map((w) => (
                      <li key={w}>{w}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="landing-section" style={{ textAlign: "center" }}>
        <h2>Für wen lohnt sich Postradamus besonders?</h2>
        <div className="usecase-grid">
          {[
            {
              who: "Fotografen & Kreative",
              why: "Bilder sind dein Produkt. Postradamus erkennt sie und schreibt Captions, die zu deinem Stil passen.",
            },
            {
              who: "Selbstständige & kleine Teams",
              why: "Kein Social-Media-Manager nötig. Postradamus liefert dir jede Woche einen fertigen Plan.",
            },
            {
              who: "Restaurants, Cafés & Läden",
              why: "Regelmäßig posten ohne Aufwand. Fotos aus dem Alltag werden automatisch zu Instagram-Posts.",
            },
            {
              who: "Coaches & Personal Brands",
              why: "Deine Stimme, automatisch in Text gegossen. Mit Style-Analyse, die deinen Tonfall lernt.",
            },
          ].map((item) => (
            <article className="usecase-card" key={item.who}>
              <strong>{item.who}</strong>
              <p>{item.why}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="landing-final">
        <h2>Bereit, Zeit zu sparen?</h2>
        <p>
          Teste Postradamus 14 Tage kostenlos und sieh selbst, wie viel schneller
          deine Instagram-Planung wird.
        </p>
        <Link className="button landing-primary" href="/login?trial=14">
          14 Tage gratis testen
        </Link>
        <p className="helper" style={{ marginTop: 12 }}>
          Keine Kreditkarte nötig. Jederzeit kündbar.
        </p>
      </section>
    </div>
  );
}
