import Image from "next/image";
import Link from "next/link";
import { WaitlistForm } from "./waitlist-form";

const benefits = [
  {
    title: "Weniger Social-Media-Arbeit",
    text: "Keine Zeit, dich täglich mit Postings herumzuschlagen? Postradamus bereitet Captions, Hashtags und Postingideen für dich vor."
  },
  {
    title: "Aus Bildern wird ein fertiger Plan",
    text: "Postradamus erkennt deine Auswahl, schreibt passende Captions und baut daraus einen klaren Postingplan."
  },
  {
    title: "Mehr Regelmäßigkeit",
    text: "Wenn du regelmäßig sichtbar bist, wachsen dein Account und dein Business deutlich stärker."
  }
];

const steps = [
  {
    title: "Bilder hochladen",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 7.5C4 6.1 5.1 5 6.5 5h11C18.9 5 20 6.1 20 7.5v9c0 1.4-1.1 2.5-2.5 2.5h-11C5.1 19 4 17.9 4 16.5v-9Z" />
        <path d="m7 15 3.2-3.2 2.3 2.3 1.7-1.7L17 15" />
        <path d="M15.5 8.5h.01" />
      </svg>
    )
  },
  {
    title: "Lieblingsstil wählen",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 4.5 14.1 9l4.9.7-3.5 3.4.8 4.9-4.3-2.3L7.7 18l.8-4.9L5 9.7 9.9 9 12 4.5Z" />
      </svg>
    )
  },
  {
    title: "Postingplan prüfen",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M7 4v3" />
        <path d="M17 4v3" />
        <path d="M5 8h14" />
        <path d="M6.5 6h11C18.9 6 20 7.1 20 8.5v9c0 1.4-1.1 2.5-2.5 2.5h-11C5.1 20 4 18.9 4 17.5v-9C4 7.1 5.1 6 6.5 6Z" />
        <path d="m8 14 2 2 5-5" />
      </svg>
    )
  },
  {
    title: "Jetzt posten",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4.5 12.5 19 5l-4.2 14-3.1-6.2-7.2-.3Z" />
        <path d="m11.7 12.8 3.7-3.7" />
      </svg>
    )
  }
];

const features = [
  "KI-Captions und Hashtags passend zu deinen Bildern",
  "Feed, Carousel und Story automatisch vorbereitet",
  "Postingrhythmus pro Tag, Woche oder Monat",
  "Caption, Hashtags, Mentions und Bildausschnitt editierbar",
  "Direkte Instagram-Veröffentlichung",
  "14 Tage kostenlos – keine Kreditkarte nötig"
];

const faqs = [
  {
    question: "Brauche ich technische Vorkenntnisse?",
    answer: "Nein. Der Ablauf ist bewusst einfach: Bilder wählen, Stil anklicken, Plan prüfen."
  },
  {
    question: "Kann ich einzelne Posts noch ändern?",
    answer: "Ja. Caption, Stil, markierte Accounts, Hashtags, Bildbeschnitt und Bildauswahl bleiben editierbar."
  },
  {
    question: "Wie kann ich bezahlen?",
    answer: "Nach deiner 14-tägigen Testphase wählst du dein Paket und bezahlst bequem per Kreditkarte oder PayPal."
  }
];

export function LandingPage() {
  return (
    <div className="landing-page">
      <section className="landing-hero">
        <div className="landing-hero-copy">
          <h1>Dein persönlicher Instagram‑Agent.</h1>
          <p>
            Postradamus schreibt deine Captions, plant den Kalender und bereitet
            die Veröffentlichung vor. Du prüfst den Plan und aktivierst das Posten
            bewusst. So sparst du Stunden und bleibst regelmäßig sichtbar.
          </p>
          <div className="landing-actions">
            <Link className="button landing-primary" href="/login?trial=14">
              14 Tage gratis testen
            </Link>
            <Link className="button-secondary landing-secondary" href="/kundenbereich">
              Kundenbereich
            </Link>
          </div>
        </div>
        <div className="landing-hero-visual">
          <Image
            alt="Postradamus Produktvorschau auf Laptop und Smartphone"
            fill
            priority
            src="/marketing/postradamus-hero.png"
            sizes="(max-width: 900px) 100vw, 52vw"
          />
        </div>
      </section>

      <section className="landing-strip" aria-label="Kurzvorteile">
        {benefits.map((item) => (
          <article key={item.title}>
            <h2>{item.title}</h2>
            <p>{item.text}</p>
          </article>
        ))}
      </section>

      <section className="landing-section landing-flow" id="ablauf">
        <div className="landing-section-head">
          <div className="eyebrow">Ablauf</div>
          <h2>Automatisiert in die Zukunft – in vier Schritten.</h2>
          <p>Postradamus macht aus deinen Bildern einen prüfbaren Social-Media-Plan.</p>
        </div>
        <div className="flow-steps">
          {steps.map((step) => (
            <article className="flow-step-card" key={step.title}>
              <div className="flow-step-icon">{step.icon}</div>
              <strong>{step.title}</strong>
            </article>
          ))}
        </div>
      </section>

      <section className="landing-section landing-product">
        <div className="product-showcase">
          <div className="product-window">
            <div className="product-window-bar">
              <span />
              <span />
              <span />
            </div>
            <div className="product-board">
              <div className="product-sidebar">
                <strong>Projekt</strong>
                <span>Bilder</span>
                <span>Stil</span>
                <span>Postingplan</span>
              </div>
              <div className="product-main">
                <div className="product-main-head">
                  <span>Wie oft soll gepostet werden?</span>
                  <strong>3 Posts pro Woche</strong>
                </div>
                <div className="product-card-grid">
                  {[1, 2, 3, 4, 5, 6].map((item) => (
                    <div className="product-post-card" key={item}>
                      <div />
                      <span>Caption bereit</span>
                      <strong>{item % 2 === 0 ? "Carousel" : "Post"}</strong>
                    </div>
                  ))}
                </div>
                <ul className="product-mobile-list">
                  <li><strong>Feed-Posts</strong> mit KI-Captions</li>
                  <li><strong>Carousels</strong> mit Bildauswahl</li>
                  <li><strong>Stories</strong> serverseitig planbar</li>
                  <li><strong>Hashtags</strong> passend generiert</li>
                  <li><strong>Postingplan</strong> tageweise</li>
                  <li><strong>Direkt veröffentlichen</strong> via Instagram</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
        <div className="landing-section-head">
          <div className="eyebrow">Features</div>
          <h2>Alles was du brauchst um auf Instagram erfolgreich zu sein.</h2>
          <ul className="feature-list">
            {features.map((feature) => (
              <li key={feature}>{feature}</li>
            ))}
          </ul>
        </div>
      </section>

      <section className="landing-section landing-pricing-cta" id="preise">
        <div className="landing-section-head">
          <div className="eyebrow">Preise</div>
          <h2>14 Tage kostenlos testen.</h2>
          <p className="pricing-subline">Danach ab 19,90 € pro Monat. Starter, Growth oder Studio – alle Pakete monatlich kündbar.</p>
          <Link className="button landing-primary" href="/preise" style={{ marginTop: 16, display: "inline-flex" }}>
            Alle Preise ansehen
          </Link>
        </div>
      </section>

      <section className="landing-section landing-faq">
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
        <p>Starte kostenlos und sieh selbst, wie Postradamus deine Posts vorbereitet und nach deiner Aktivierung plant.</p>
        <WaitlistForm />
        <p className="helper" style={{ marginTop: 12 }}>
          Oder <Link href="/login?trial=14">direkt ein Konto erstellen</Link>
        </p>
      </section>
    </div>
  );
}
