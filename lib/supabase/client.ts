"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseConfig } from "@/lib/supabase/config";
import type { Database } from "@/lib/supabase/database.types";

let browserClient: SupabaseClient<Database> | undefined;

export function createClient() {
  const { url, publicKey } = getSupabaseConfig();
  browserClient ??= createBrowserClient<Database>(url, publicKey);
  return browserClient;
}
