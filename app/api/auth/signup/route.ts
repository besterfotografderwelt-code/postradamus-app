import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase ist nicht konfiguriert." }, { status: 500 });
  }

  const { email, password, fullName } = await request.json();

  if (!email || !password || password.length < 8 || !fullName) {
    return NextResponse.json(
      { error: "Name, E-Mail und Passwort mit mindestens 8 Zeichen sind erforderlich." },
      { status: 400 }
    );
  }

  const headerStore = await headers();
  const origin = headerStore.get("origin") ?? "https://postradamus.ai";
  const supabase = await createClient();

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName },
      emailRedirectTo: `${origin}/auth/callback`,
    },
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  // If user is already confirmed (auto-signup), we can log them in immediately
  if (data?.user?.identities?.length === 0) {
    return NextResponse.json({ error: "Ein Konto mit dieser E-Mail existiert bereits." }, { status: 409 });
  }

  return NextResponse.json({
    message: "Registrierung erfolgreich. Bitte bestätige deine E-Mail-Adresse.",
  });
}
