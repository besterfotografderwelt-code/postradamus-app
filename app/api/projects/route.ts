import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { NextResponse } from "next/server";

export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ projects: [], profile: null });
  }

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user) {
    return NextResponse.json({ projects: [], profile: null }, { status: 401 });
  }

  const userId = auth.user.id;

  const [{ data: projects }, { data: profile }] = await Promise.all([
    supabase
      .from("projects")
      .select("id, couple_name, business_type, location, uploaded_image_count, status, created_at")
      .eq("profile_id", userId)
      .order("created_at", { ascending: false }),
    supabase
      .from("profiles")
      .select("full_name, plan, trial_start, trial_end")
      .eq("id", userId)
      .single(),
  ]);

  return NextResponse.json({ projects, profile });
}
