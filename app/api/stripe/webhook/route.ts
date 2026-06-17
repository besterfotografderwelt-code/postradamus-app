import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? "");
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? ""
);

export async function POST(request: Request) {
  const body = await request.text();
  const sig = request.headers.get("stripe-signature") ?? "";

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET ?? "");
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  // Handle checkout.session.completed → activate user's plan
  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const clientReferenceId = session.client_reference_id; // user ID
    const planName = session.metadata?.plan ?? "starter";

    if (clientReferenceId) {
      await supabaseAdmin
        .from("profiles")
        .update({
          plan: planName,
          trial_start: new Date().toISOString(),
          trial_end: new Date(Date.now() + 14 * 86400000).toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", clientReferenceId);
    }
  }

  return NextResponse.json({ received: true });
}
