const faqGroups = [
  {
    title: "Nutzung",
    items: [
      {
        question: "Für wen ist Postradamus gedacht?",
        answer: "Für Selbstständige, Fotografen, Studios und lokale Marken, die regelmäßig auf Instagram sichtbar sein wollen, ohne jeden Post neu von null zu planen."
      },
      {
        question: "Muss ich Social Media gut können?",
        answer: "Nein. Postradamus führt dich durch Bilder, Stil, Text und Postingplan. Du prüfst am Ende nur noch, ob alles zu dir passt."
      },
      {
        question: "Kann ich Texte noch ändern?",
        answer: "Ja. Captions, Hashtags, Bildauswahl, Bildausschnitt, Tonalität und Postingrhythmus bleiben editierbar."
      }
    ]
  },
  {
    title: "Pakete",
    items: [
      {
        question: "Was zählt als Bild?",
        answer: "Ein hochgeladenes Bild, das für Analyse, Planung oder Texterstellung verwendet wird. Mehrere Bilder in einem Carousel zählen einzeln."
      },
      {
        question: "Was passiert, wenn ich mein Bildlimit erreiche?",
        answer: "Du kannst jederzeit in ein größeres Paket wechseln. Das neue Limit gilt dann sofort für den laufenden Monat."
      },
      {
        question: "Warum gibt es Fair-Use statt echtes unlimitiert?",
        answer: "Weil KI, Bildverarbeitung, Speicher und Support echte Kosten verursachen. Fair-Use hält das Studio-Paket großzügig, schützt aber vor extremer oder automatisierter Massennutzung."
      }
    ]
  },
  {
    title: "Technik und Sicherheit",
    items: [
      {
        question: "Werden meine Bilder privat gespeichert?",
        answer: "Ja. Deine Bilder werden in privatem Speicher abgelegt und sind nur für dich zugänglich. Projekte und Bilder bleiben strikt pro Konto getrennt."
      },
      {
        question: "Postet Postradamus automatisch ohne Kontrolle?",
        answer: "Nein. Der Plan wird vorbereitet, aber du prüfst Inhalte vor dem Veröffentlichen. Direktes Posten über Instagram wird als bewusster Schritt eingebunden."
      },
      {
        question: "Welche KI wird verwendet?",
        answer: "Postradamus nutzt moderne KI für Bildanalyse und Texterstellung. Im Vordergrund stehen gute Texte, kalkulierbare Kosten und stabile Qualität – unabhängig vom Anbieter."
      }
    ]
  },
  {
    title: "Zahlung",
    items: [
      {
        question: "Wie lange kann ich testen?",
        answer: "Du kannst Postradamus 14 Tage kostenlos und unverbindlich testen. Keine Zahlungsdaten nötig, jederzeit abbrechen."
      },
      {
        question: "Kann ich monatlich kündigen?",
        answer: "Ja. Alle Pakete sind monatlich kündbar – ohne lange Vertragsbindung."
      },
      {
        question: "Welche Zahlungsarten sind geplant?",
        answer: "Kreditkarte und PayPal stehen zur Auswahl."
      }
    ]
  }
];

export default function FaqPage() {
  return (
    <section className="content-page faq-page">
      <div className="eyebrow">FAQ</div>
      <h1>Antworten, bevor du startest.</h1>
      <p className="lead">
        Die wichtigsten Fragen zu Nutzung, Paketen, Sicherheit und Zahlung gesammelt an einem Ort.
      </p>
      <div className="faq-detail-grid">
        {faqGroups.map((group) => (
          <section className="faq-group" key={group.title}>
            <h2>{group.title}</h2>
            {group.items.map((item) => (
              <article key={item.question}>
                <h3>{item.question}</h3>
                <p>{item.answer}</p>
              </article>
            ))}
          </section>
        ))}
      </div>
    </section>
  );
}
