"use client";

import { LocalProjectRepository } from "@/lib/repositories/local-project-repository";
import type { ProjectRepository } from "@/lib/repositories/project-repository";
import { SupabaseProjectRepository } from "@/lib/repositories/supabase-project-repository";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";

let repository: ProjectRepository | undefined;

export function getProjectRepository() {
  repository ??= isSupabaseConfigured()
    ? new SupabaseProjectRepository(createClient())
    : new LocalProjectRepository();

  return repository;
}

export function usesSupabaseRepository() {
  return isSupabaseConfigured();
}
