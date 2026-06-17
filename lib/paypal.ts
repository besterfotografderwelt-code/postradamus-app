const BASE = process.env.PAYPAL_BASE_URL ?? "https://api-m.paypal.com";
const CLIENT_ID = process.env.PAYPAL_CLIENT_ID ?? "";
const SECRET = process.env.PAYPAL_CLIENT_SECRET ?? "";

async function getAccessToken() {
  const res = await fetch(`${BASE}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${CLIENT_ID}:${SECRET}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  const data = await res.json();
  return data.access_token as string;
}

const PLAN_PRICES: Record<string, { name: string; price: number }> = {
  starter: { name: "Starter", price: 29.9 },
  growth: { name: "Growth", price: 49.9 },
  studio: { name: "Studio", price: 129.9 },
};

export async function createSubscription(planId: string, returnUrl: string, cancelUrl: string) {
  const plan = PLAN_PRICES[planId];
  if (!plan) throw new Error("Unbekanntes Paket");

  const token = await getAccessToken();

  // Create product
  const productRes = await fetch(`${BASE}/v1/catalogs/products`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      name: `Postradamus ${plan.name}`,
      type: "SERVICE",
      category: "SOFTWARE",
    }),
  });
  const product = await productRes.json();

  // Create billing plan
  const planRes = await fetch(`${BASE}/v1/billing/plans`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      product_id: product.id,
      name: `Postradamus ${plan.name} Monthly`,
      status: "ACTIVE",
      billing_cycles: [{
        frequency: { interval_unit: "MONTH", interval_count: 1 },
        tenure_type: "REGULAR",
        sequence: 1,
        total_cycles: 0,
        pricing_scheme: { fixed_price: { value: plan.price.toFixed(2), currency_code: "EUR" } },
      }],
      payment_preferences: {
        auto_bill_outstanding: true,
        payment_failure_threshold: 3,
      },
    }),
  });
  const billingPlan = await planRes.json();

  // Create subscription
  const subRes = await fetch(`${BASE}/v1/billing/subscriptions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      plan_id: billingPlan.id,
      application_context: {
        return_url: returnUrl,
        cancel_url: cancelUrl,
        user_action: "SUBSCRIBE_NOW",
      },
    }),
  });
  return subRes.json();
}

export async function getSubscription(subscriptionId: string) {
  const token = await getAccessToken();
  const res = await fetch(`${BASE}/v1/billing/subscriptions/${subscriptionId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.json();
}
