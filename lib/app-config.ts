export const INSTAGRAM_GRAPH_API_VERSION =
  process.env.INSTAGRAM_GRAPH_API_VERSION ||
  process.env.NEXT_PUBLIC_INSTAGRAM_GRAPH_API_VERSION ||
  "v25.0";

export function graphApiUrl(path: string) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `https://graph.facebook.com/${INSTAGRAM_GRAPH_API_VERSION}${normalizedPath}`;
}

export type BillingPlanId = "starter" | "growth" | "studio" | "trial";

export type BillingPlan = {
  id: BillingPlanId;
  name: string;
  price: number;
  monthlyImageLimit: number | null;
  trialDays: number;
};

export const BILLING_PLANS: Record<BillingPlanId, BillingPlan> = {
  starter: { id: "starter", name: "Starter", price: 24.9, monthlyImageLimit: 75, trialDays: 14 },
  growth: { id: "growth", name: "Growth", price: 49.9, monthlyImageLimit: 150, trialDays: 14 },
  studio: { id: "studio", name: "Studio", price: 129.9, monthlyImageLimit: null, trialDays: 14 },
  trial: { id: "trial", name: "Starter", price: 24.9, monthlyImageLimit: 75, trialDays: 14 }
};

export function getBillingPlan(planId: string | undefined | null) {
  return BILLING_PLANS[(planId || "starter") as BillingPlanId] ?? BILLING_PLANS.starter;
}
