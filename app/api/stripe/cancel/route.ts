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
    // Create a Stripe Customer Portal session for self-service cancellation
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: auth.user.id,
      return_url: `${process.env.NEXT_PUBLIC_SITE_URL || "https://postradamus.ai"}/kundenbereich`,
      flow_data: {
        type: "subscription_cancel",
        subscription_cancel: {
          subscription: auth.user.id,
        },
      },
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
