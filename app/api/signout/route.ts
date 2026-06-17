import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { NextResponse } from "next/server";

export async function GET() {
  return handleSignOut();
}

export async function POST() {
  return handleSignOut();
}

async function handleSignOut() {
  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    await supabase.auth.signOut();
  }

  const response = NextResponse.redirect(new URL("/login", process.env.NEXT_PUBLIC_SITE_URL ?? "https://postradamus.ai"), 303);
  response.cookies.set("sb-access-token", "", { maxAge: 0, path: "/" });
  response.cookies.set("sb-refresh-token", "", { maxAge: 0, path: "/" });
  return response;
}
