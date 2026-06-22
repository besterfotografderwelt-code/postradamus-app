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
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET ?? ""
    );
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  // Try to extract userId from client_reference_id on the event object
  const obj = event.data.object as { client_reference_id?: string } | null;
  const userId = obj?.client_reference_id;

  // checkout.session.completed → user completed payment / started subscription
  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const planName = session.metadata?.plan ?? "starter";
    const uid = session.client_reference_id as string | undefined;

    if (uid) {
      await supabaseAdmin
        .from("profiles")
        .update({
          plan: planName,
          trial_start: new Date().toISOString(),
          trial_end: new Date(Date.now() + 14 * 86400000).toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", uid);
    }
  }

  // customer.subscription.updated → plan change or renewal
  if (event.type === "customer.subscription.updated" && userId) {
    const subscription = event.data.object as Stripe.Subscription;
    const planName =
      (subscription.metadata?.plan as string) ||
      subscription.items.data[0]?.price?.nickname ||
      "starter";

    if (subscription.status === "active") {
      await supabaseAdmin
        .from("profiles")
        .update({
          plan: planName,
          updated_at: new Date().toISOString(),
        })
        .eq("id", userId);
    }
  }

  // customer.subscription.deleted → subscription cancelled
  if (event.type === "customer.subscription.deleted" && userId) {
    await supabaseAdmin
      .from("profiles")
      .update({
        plan: "cancelled",
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId);
  }

  return NextResponse.json({ received: true });
}
