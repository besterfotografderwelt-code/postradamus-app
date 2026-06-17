import { ContactForm } from "@/components/contact-form";

export default function ContactPage() {
  return (
    <section className="content-page">
      <div className="eyebrow">Kontakt</div>
      <h1>Fragen zu Postradamus?</h1>
      <p className="lead">
        Schreib kurz, worum es geht. Für Support, Feedback oder Interesse an Postradamus reicht eine
        direkte Nachricht.
      </p>
      <ContactForm />
      <div className="contact-card" style={{ marginTop: 28 }}>
        <div>
          <span>Support</span>
          <a href="mailto:support@postradamus.ai">support@postradamus.ai</a>
        </div>
        <div>
          <span>Allgemein</span>
          <a href="mailto:contact@postradamus.ai">contact@postradamus.ai</a>
        </div>
      </div>
    </section>
  );
}
