"use client";

import { LocalImageRepository } from "@/lib/repositories/local-image-repository";
import type { ImageRepository } from "@/lib/repositories/image-repository";
import { SupabaseImageRepository } from "@/lib/repositories/supabase-image-repository";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";

let repository: ImageRepository | undefined;

export function getImageRepository(): ImageRepository {
  repository ??= isSupabaseConfigured()
    ? new SupabaseImageRepository(createClient())
    : new LocalImageRepository();

  return repository;
}
