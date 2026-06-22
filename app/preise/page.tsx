import Link from "next/link";
import type { Metadata } from "next";
import { TrialButton } from "@/components/trial-button";

export const metadata: Metadata = {
  title: "Preise – Postradamus",
  description:
    "Postradamus Preise: 14 Tage kostenlos testen. Starter, Growth und Studio – monatlich kündbar. KI-Captions, Postingplan und Instagram-Veröffentlichung.",
};

const pricingPlans = [
  {
    name: "Starter",
    price: "29,90 €",
    description: "Für kleine Accounts, die endlich regelmäßig posten wollen.",
    quota: "50 Bilder pro Monat",
    highlights: ["KI-Captions und Hashtags", "Postingplan", "Instagram-Vorschau"],
    href: "/login?trial=14&plan=starter",
  },
  {
    name: "Growth",
    price: "49,90 €",
    description: "Für Creator und Selbstständige mit regelmäßigem Content.",
    quota: "150 Bilder pro Monat",
    highlights: [
      "Alles aus Starter",
      "Mehr Projekte",
      "Besser für 3 bis 5 Posts pro Woche",
    ],
    href: "/login?trial=14&plan=growth",
    featured: true,
  },
  {
    name: "Studio",
    price: "129,90 €",
    description: "Für Agenturen und Studios mit besonders viel Bildmaterial.",
    quota: "Unlimitiert mit Fair-Use",
    highlights: [
      "Alles aus Growth",
      "Hohe Bildmengen",
      "Priorität für neue Funktionen",
    ],
    href: "/login?trial=14&plan=studio",
  },
];

const faqs = [
  {
    question: "Brauche ich technische Vorkenntnisse?",
    answer:
      "Nein. Der Ablauf ist bewusst einfach: Bilder wählen, Stil anklicken, Plan prüfen.",
  },
  {
    question: "Kann ich einzelne Posts noch ändern?",
    answer:
      "Ja. Caption, Stil, markierte Accounts, Hashtags, Bildbeschnitt und Bildauswahl bleiben editierbar.",
  },
  {
    question: "Wie kann ich bezahlen?",
    answer:
      "Nach deiner 14-tägigen Testphase wählst du dein Paket und bezahlst bequem per Kreditkarte oder PayPal.",
  },
];

export default function PreisePage() {
  return (
    <div className="landing-page">
      <section className="landing-section">
        <div className="landing-section-head">
          <div className="eyebrow">Preise</div>
          <h1>14 Tage testen. Danach wählst du dein Paket.</h1>
          <p>
            Alle Pakete beinhalten KI-Captions, Postingplan und Instagram-Veröffentlichung.
            Monatlich kündbar, keine versteckten Kosten.
          </p>
        </div>

        <div className="pricing-grid">
          {pricingPlans.map((plan) => (
            <article
              className={`pricing-card ${plan.featured ? "is-featured" : ""}`}
              key={plan.name}
            >
              {plan.featured && (
                <span className="pricing-label">Empfohlen</span>
              )}
              <div className="pricing-card-head">
                <h2>{plan.name}</h2>
                <p>{plan.description}</p>
              </div>
              <div className="pricing-price">
                <strong>{plan.price}</strong>
                <span>pro Monat, monatlich kündbar</span>
              </div>
              <div className="pricing-quota">{plan.quota}</div>
              <ul className="pricing-list">
                {plan.highlights.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
              <TrialButton />
            </article>
          ))}
        </div>


      </section>

      <section className="landing-section">
        <div className="landing-section-head">
          <div className="eyebrow">Vergleich</div>
          <h2>Alle Funktionen im Überblick.</h2>
        </div>

        <div className="compare-table-wrap">
          <table className="compare-table">
            <thead>
              <tr>
                <th />
                <th>Starter</th>
                <th className="compare-featured">Growth</th>
                <th>Studio</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Bilder pro Monat</td>
                <td>50</td>
                <td className="compare-featured">150</td>
                <td>Unlimited*</td>
              </tr>
              <tr>
                <td>KI-Captions &amp; Hashtags</td>
                <td>✓</td>
                <td className="compare-featured">✓</td>
                <td>✓</td>
              </tr>
              <tr>
                <td>Postingplan</td>
                <td>✓</td>
                <td className="compare-featured">✓</td>
                <td>✓</td>
              </tr>
              <tr>
                <td>Instagram-Vorschau</td>
                <td>✓</td>
                <td className="compare-featured">✓</td>
                <td>✓</td>
              </tr>
              <tr>
                <td>Direkte Instagram-Veröffentlichung</td>
                <td>✓</td>
                <td className="compare-featured">✓</td>
                <td>✓</td>
              </tr>
              <tr>
                <td>Feed &amp; Carousel</td>
                <td>✓</td>
                <td className="compare-featured">✓</td>
                <td>✓</td>
              </tr>
              <tr>
                <td>Stories</td>
                <td>✓</td>
                <td className="compare-featured">✓</td>
                <td>✓</td>
              </tr>
              <tr>
                <td>9 Tonalitäten</td>
                <td>✓</td>
                <td className="compare-featured">✓</td>
                <td>✓</td>
              </tr>
              <tr>
                <td>Mehrere Projekte gleichzeitig</td>
                <td>1 Projekt</td>
                <td className="compare-featured">3 Projekte</td>
                <td>10 Projekte</td>
              </tr>
              <tr>
                <td>Eigener Schreibstil (Style-Analyse)</td>
                <td>–</td>
                <td className="compare-featured">✓</td>
                <td>✓</td>
              </tr>
              <tr>
                <td>Priorität für neue Funktionen</td>
                <td>–</td>
                <td className="compare-featured">–</td>
                <td>✓</td>
              </tr>
            </tbody>
          </table>
          <p className="helper" style={{ marginTop: 12 }}>
            * Fair-Use: großzügig ausgelegt, schützt vor automatisierter Massennutzung.
          </p>
        </div>

      </section>

      <section className="landing-section">
        <div className="landing-section-head">
          <div className="eyebrow">Fragen</div>
          <h2>Wichtiges vor dem Start.</h2>
        </div>
        <div className="faq-grid">
          {faqs.map((faq) => (
            <article key={faq.question}>
              <h3>{faq.question}</h3>
              <p>{faq.answer}</p>
            </article>
          ))}
        </div>
        <Link className="button-secondary faq-more-link" href="/faq">
          Ausführliche FAQ lesen
        </Link>
      </section>

      <section className="landing-final">
        <h2>Bereit für deinen nächsten Postingplan?</h2>
        <p>
          Starte kostenlos und prüfe in einem echten Projekt, wie schnell aus
          Bildern fertige Posts werden.
        </p>
        <TrialButton />
      </section>
    </div>
  );
}
