import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { NextResponse } from "next/server";

export async function POST() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ success: false, error: "Nicht konfiguriert" }, { status: 500 });
  }

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const userId = auth?.user?.id;

  if (!userId) {
    return NextResponse.json({ success: false, error: "Nicht eingeloggt" }, { status: 401 });
  }

  const { data, error } = await supabase.rpc("start_trial", { pid: userId });

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ success: false, error: "Trial bereits gestartet oder Plan aktiv" }, { status: 409 });
  }

  return NextResponse.json({ success: true });
}
