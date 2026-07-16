import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@/lib/supabase/server";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? "");

export async function POST() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user) {
    return NextResponse.json({ error: "Nicht eingeloggt" }, { status: 401 });
  }

  try {
    const email = auth.user.email;
    if (!email) {
      return NextResponse.json({ error: "Keine E-Mail-Adresse am Konto gefunden." }, { status: 400 });
    }

    const customers = await stripe.customers.list({ email, limit: 10 });
    const customer = customers.data.find((item) => !item.deleted);
    if (!customer) {
      return NextResponse.json({
        message:
          "Zu deinem Konto wurde noch kein Stripe-Abo gefunden. Bitte kontaktiere uns unter info@besterfotografderwelt.com.",
      });
    }

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: customer.id,
      return_url: `${process.env.NEXT_PUBLIC_SITE_URL || "https://postradamus.ai"}/kundenbereich`,
    });

    return NextResponse.json({ portalUrl: portalSession.url });
  } catch {
    // If customer portal fails (no Stripe customer yet), redirect to contact
    return NextResponse.json({
      message:
        "Bitte kontaktiere uns unter info@besterfotografderwelt.com, um dein Abo zu kündigen.",
    });
  }
}
