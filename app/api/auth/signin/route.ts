import { NextResponse } from "next/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.redirect(
      new URL("/login?error=Supabase+ist+nicht+konfiguriert.", request.url)
    );
  }

  const fd = await request.formData();
  const email = String(fd.get("email") ?? "").trim();
  const password = String(fd.get("password") ?? "");

  if (!email || password.length < 8) {
    const diag = `E-Mail und ein Passwort mit mindestens 8 Zeichen sind erforderlich.`;
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(diag)}`, request.url)
    );
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    const msg = error.message.includes("Invalid login") || error.message.includes("invalid")
      ? "E-Mail oder Passwort stimmen nicht."
      : error.message;
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(msg)}`, request.url)
    );
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("plan, trial_end")
    .maybeSingle();

  const hasActivePlan =
    profile &&
    ((profile.plan === "trial" &&
      profile.trial_end &&
      new Date(profile.trial_end) > new Date()) ||
      ["starter", "growth", "studio"].includes(profile.plan ?? ""));

  const target = hasActivePlan ? "/projects" : "/preise";
  const redirectUrl = new URL(target, request.url);
  return NextResponse.redirect(redirectUrl, 303);
}
