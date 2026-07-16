import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function checkToken(request: Request) {
  const adminToken = process.env.ADMIN_TOKEN;
  if (!adminToken) {
    return NextResponse.json({ error: "ADMIN_TOKEN ist nicht konfiguriert." }, { status: 500 });
  }

  const token = request.headers.get("x-admin-token") ?? "";
  if (token !== adminToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}

function supabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? ""
  );
}

async function findUserByEmail(email: string) {
  const supabase = supabaseAdmin();
  const { data: authUsers } = await supabase.auth.admin.listUsers();
  return authUsers?.users?.find((u) => u.email === email) ?? null;
}

export async function POST(request: Request) {
  const authErr = checkToken(request);
  if (authErr) return authErr;

  const { email, months } = await request.json();

  if (!email) {
    return NextResponse.json({ error: "E-Mail erforderlich" }, { status: 400 });
  }

  const user = await findUserByEmail(email);
  if (!user) {
    return NextResponse.json({ error: "Kein Konto mit dieser E-Mail" }, { status: 404 });
  }

  const trialEnd = new Date();
  trialEnd.setMonth(trialEnd.getMonth() + (months || 12));

  const { error } = await supabaseAdmin()
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

export async function DELETE(request: Request) {
  const authErr = checkToken(request);
  if (authErr) return authErr;

  const { email } = await request.json();

  if (!email) {
    return NextResponse.json({ error: "E-Mail erforderlich" }, { status: 400 });
  }

  const user = await findUserByEmail(email);
  if (!user) {
    return NextResponse.json({ error: "Kein Konto mit dieser E-Mail" }, { status: 404 });
  }

  const { error } = await supabaseAdmin()
    .from("profiles")
    .update({
      plan: "none",
      trial_start: null,
      trial_end: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
