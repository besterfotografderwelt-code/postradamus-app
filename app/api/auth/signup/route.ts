import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  if (!isSupabaseConfigured()) {
    const redirectUrl = new URL("/login", request.url);
    redirectUrl.searchParams.set("error", "Supabase ist nicht konfiguriert.");
    return NextResponse.redirect(redirectUrl);
  }

  const fd = await request.formData();
  const email = String(fd.get("email") ?? "").trim();
  const password = String(fd.get("password") ?? "");
  const fullName = String(fd.get("fullName") ?? "").trim();

  if (!email || !password || password.length < 8 || !fullName) {
    const redirectUrl = new URL("/login", request.url);
    redirectUrl.searchParams.set("error", "Name, E-Mail und Passwort mit mindestens 8 Zeichen sind erforderlich.");
    return NextResponse.redirect(redirectUrl);
  }

  const headerStore = await headers();
  const origin = headerStore.get("origin") ?? "https://postradamus.ai";
  const supabase = await createClient();

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName },
      emailRedirectTo: `${origin}/auth/callback`,
    },
  });

  if (error) {
    const msg = error.message.includes("User already") || error.message.includes("already registered")
      ? "Diese E-Mail-Adresse ist bereits registriert. Melde dich an oder setze dein Passwort zurück."
      : error.message;
    const redirectUrl = new URL("/login", request.url);
    redirectUrl.searchParams.set("error", msg);
    return NextResponse.redirect(redirectUrl);
  }

  const redirectUrl = new URL("/login", request.url);
  redirectUrl.searchParams.set("message", "Registrierung erfolgreich. Bitte bestätige deine E-Mail-Adresse.");
  return NextResponse.redirect(redirectUrl);
}
