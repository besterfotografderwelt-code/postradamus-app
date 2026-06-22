import { NextResponse } from "next/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase ist nicht konfiguriert." }, { status: 500 });
  }

  const { email, password } = await request.json();

  if (!email || !password || password.length < 8) {
    return NextResponse.json(
      { error: "Bitte E-Mail und Passwort mit mindestens 8 Zeichen eingeben." },
      { status: 400 }
    );
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 401 });
  }

  // Determine redirect target
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

  return NextResponse.json({
    redirect: hasActivePlan ? "/projects" : "/preise",
  });
}
