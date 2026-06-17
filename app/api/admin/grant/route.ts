import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const ADMIN_TOKEN = process.env.ADMIN_TOKEN ?? "postradamus2026";

export async function POST(request: Request) {
  const { email, months } = await request.json();

  // Simple token check
  const token = request.headers.get("x-admin-token") ?? "";
  if (token !== ADMIN_TOKEN) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!email) {
    return NextResponse.json({ error: "E-Mail erforderlich" }, { status: 400 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? ""
  );

  // Find user by email
  const { data: authUsers } = await supabase.auth.admin.listUsers();
  const user = authUsers?.users?.find((u) => u.email === email);

  if (!user) {
    return NextResponse.json({ error: "Kein Konto mit dieser E-Mail" }, { status: 404 });
  }

  const trialEnd = new Date();
  trialEnd.setMonth(trialEnd.getMonth() + (months || 12));

  const { error } = await supabase
    .from("profiles")
    .update({
      plan: "trial",
      trial_start: new Date().toISOString(),
      trial_end: trialEnd.toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
