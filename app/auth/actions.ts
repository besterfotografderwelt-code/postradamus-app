"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

function readCredentials(formData: FormData) {
  return {
    email: String(formData.get("email") ?? "").trim(),
    password: String(formData.get("password") ?? "")
  };
}

function loginRedirect(message: string, type: "error" | "message" = "error") {
  redirect(`/login?${type}=${encodeURIComponent(message)}`);
}

export async function signIn(formData: FormData) {
  if (!isSupabaseConfigured()) {
    loginRedirect("Supabase ist noch nicht verbunden.");
  }

  const { email, password } = readCredentials(formData);
  if (!email || password.length < 8) {
    loginRedirect("Bitte E-Mail und Passwort mit mindestens 8 Zeichen eingeben.");
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    const msg = error.message.includes("Invalid login") || error.message.includes("invalid")
      ? "E-Mail oder Passwort stimmen nicht."
      : error.message;
    loginRedirect(msg);
  }

  // Check if user has any active plan; if not, send to pricing
  const { data: profile } = await supabase
    .from("profiles")
    .select("plan, trial_end")
    .single();

  const hasActivePlan = profile && (
    profile.plan === "trial" && profile.trial_end && new Date(profile.trial_end) > new Date()
    || ["starter", "growth", "studio"].includes(profile.plan ?? "")
  );

  if (!hasActivePlan) {
    redirect("/preise");
  }

  redirect("/projects");
}

export async function signUp(formData: FormData) {
  if (!isSupabaseConfigured()) {
    loginRedirect("Supabase ist noch nicht verbunden.");
  }

  const { email, password } = readCredentials(formData);
  const fullName = String(formData.get("fullName") ?? "").trim();

  if (!email || password.length < 8 || !fullName) {
    loginRedirect("Name, E-Mail und ein Passwort mit mindestens 8 Zeichen sind erforderlich.");
  }

  const headerStore = await headers();
  const origin = headerStore.get("origin") ?? "http://localhost:3000";
  const supabase = await createClient();

  let data, error;
  try {
    const result = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo: `${origin}/auth/callback`
      }
    });
    data = result.data;
    error = result.error;
  } catch (caught: unknown) {
    const msg = caught instanceof Error ? caught.message : String(caught);
    console.error("[signUp] CATCHED:", msg);
    loginRedirect("Verbindungsfehler zum Server. Bitte versuch es später noch einmal.");
  }

  console.log("[signUp] result:", { user: !!data?.user, session: !!data?.session, error: error?.message });

  if (error) {
    const msg = error.message.includes("User already") || error.message.includes("already registered")
      ? "Diese E-Mail-Adresse ist bereits registriert. Melde dich an."
      : error.message;
    loginRedirect(msg);
  }
  loginRedirect("Registrierung erfolgreich. Bitte bestätige deine E-Mail-Adresse.", "message");
}

export async function signOut() {
  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    await supabase.auth.signOut();
  }
  redirect("/login");
}
