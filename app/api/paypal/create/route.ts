import { NextResponse } from "next/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createSubscription } from "@/lib/paypal";

export async function POST(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Nicht konfiguriert" }, { status: 500 });
  }

  const { plan, returnUrl, cancelUrl } = await request.json();

  try {
    const sub = await createSubscription(plan, returnUrl, cancelUrl);
    const approvalUrl = sub.links?.find((l: { rel: string }) => l.rel === "approve")?.href;
    return NextResponse.json({ id: sub.id, approvalUrl });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
