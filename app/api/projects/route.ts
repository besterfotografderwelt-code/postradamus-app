import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { NextResponse } from "next/server";

export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ projects: [] });
  }

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user) {
    return NextResponse.json({ projects: [] }, { status: 401 });
  }

  const { data: projects, error } = await supabase
    .from("projects")
    .select("id, couple_name, business_type, location, uploaded_image_count, status, created_at")
    .eq("profile_id", auth.user.id)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ projects: [] });
  }

  return NextResponse.json({ projects });
}
