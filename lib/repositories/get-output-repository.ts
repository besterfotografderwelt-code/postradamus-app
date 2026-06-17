"use client";

import { LocalOutputRepository } from "@/lib/repositories/local-output-repository";
import type { OutputRepository } from "@/lib/repositories/output-repository";
import { SupabaseOutputRepository } from "@/lib/repositories/supabase-output-repository";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";

let repository: OutputRepository | undefined;

export function getOutputRepository(): OutputRepository {
  repository ??= isSupabaseConfigured()
    ? new SupabaseOutputRepository(createClient())
    : new LocalOutputRepository();

  return repository;
}
