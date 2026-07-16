import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@/lib/supabase/server";
import { getBillingPlan } from "@/lib/app-config";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? "");

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user) {
    return NextResponse.json({ error: "Nicht eingeloggt" }, { status: 401 });
  }

  const { plan, returnUrl, cancelUrl } = await request.json();
  const planDef = getBillingPlan(plan);
  const isTrial = plan === "trial";

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      client_reference_id: auth.user.id,
      metadata: { plan: planDef.id === "trial" ? "starter" : planDef.id, userId: auth.user.id },
      line_items: [
        {
          price_data: {
            currency: "eur",
            product_data: { name: `Postradamus ${planDef.name}` },
            unit_amount: Math.round(planDef.price * 100),
            recurring: { interval: "month" },
          },
          quantity: 1,
        },
      ],
      subscription_data: {
        metadata: { plan: planDef.id === "trial" ? "starter" : planDef.id, userId: auth.user.id },
        ...(isTrial && { trial_period_days: planDef.trialDays })
      },
      success_url: returnUrl,
      cancel_url: cancelUrl,
      allow_promotion_codes: true,
    });

    return NextResponse.json({ url: session.url });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
