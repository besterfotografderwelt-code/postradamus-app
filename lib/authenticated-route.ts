import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export async function requireAuthenticatedUser() {
  if (!isSupabaseConfigured()) {
    return { userId: null, authenticated: true };
  }

  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();

  return {
    userId: data.user?.id ?? null,
    authenticated: Boolean(data.user)
  };
}
