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
    </section>
  );
}
