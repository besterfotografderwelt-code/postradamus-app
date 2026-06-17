import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  CreateProjectInput,
  ProjectRepository,
  UpdateProjectInput
} from "@/lib/repositories/project-repository";
import type { Database } from "@/lib/supabase/database.types";
import type { WeddingProject } from "@/lib/types";

type ProjectRow = Database["public"]["Tables"]["projects"]["Row"];
type ProjectUpdate = Database["public"]["Tables"]["projects"]["Update"];

function mapProject(row: ProjectRow): WeddingProject {
  return {
    id: row.id,
    businessType: row.business_type ?? "sonstiges",
    coupleName: row.couple_name ?? "",
    weddingDate: row.wedding_date ?? "",
    location: row.location ?? "",
    style: row.style,
    specialNotes: row.special_notes,
    tone: row.desired_tone,
    language: row.language,
    imageCount: row.image_count,
    uploadedImageCount: row.uploaded_image_count,
    internalNotes: row.internal_notes,
    stage: row.status,
    favoriteCount: row.favorite_count,
    tagCount: row.tag_count,
    createdAt: row.created_at
  };
}

function mapUpdate(input: UpdateProjectInput): ProjectUpdate {
  return {
    ...(input.businessType !== undefined && { business_type: input.businessType }),
    ...(input.coupleName !== undefined && { couple_name: input.coupleName }),
    ...(input.weddingDate !== undefined && { wedding_date: input.weddingDate }),
    ...(input.location !== undefined && { location: input.location }),
    ...(input.style !== undefined && { style: input.style }),
    ...(input.specialNotes !== undefined && { special_notes: input.specialNotes }),
    ...(input.tone !== undefined && { desired_tone: input.tone }),
    ...(input.language !== undefined && { language: input.language }),
    ...(input.imageCount !== undefined && { image_count: input.imageCount }),
    ...(input.uploadedImageCount !== undefined && {
      uploaded_image_count: input.uploadedImageCount
    }),
    ...(input.internalNotes !== undefined && { internal_notes: input.internalNotes }),
    ...(input.stage !== undefined && { status: input.stage })
  };
}

export class SupabaseProjectRepository implements ProjectRepository {
  constructor(private readonly client: SupabaseClient<Database>) {}

  async list() {
    const { data, error } = await this.client
      .from("projects")
      .select("*")
      .order("wedding_date", { ascending: false });

    if (error) throw error;
    return data.map(mapProject);
  }

  async get(projectId: string) {
    const { data, error } = await this.client
      .from("projects")
      .select("*")
      .eq("id", projectId)
      .maybeSingle();

    if (error) throw error;
    return data ? mapProject(data) : null;
  }

  async create(input: CreateProjectInput) {
    const {
      data: { user },
      error: authError
    } = await this.client.auth.getUser();

    if (authError) throw authError;
    if (!user) throw new Error("Zum Anlegen eines Projekts ist eine Anmeldung erforderlich.");

    const { data, error } = await this.client
      .from("projects")
        .insert({
          profile_id: user.id,
          business_type: input.businessType || "sonstiges",
          couple_name: input.coupleName || null,
        wedding_date: input.weddingDate || null,
        location: input.location || null,
        style: input.style,
        special_notes: input.specialNotes,
        desired_tone: input.tone,
        language: input.language,
        image_count: input.imageCount,
        internal_notes: input.internalNotes ?? ""
      })
      .select()
      .single();

    if (error) throw error;
    return mapProject(data);
  }

  async update(projectId: string, input: UpdateProjectInput) {
    const { data, error } = await this.client
      .from("projects")
      .update(mapUpdate(input))
      .eq("id", projectId)
      .select()
      .single();

    if (error) throw error;
    return mapProject(data);
  }

  async delete(projectId: string) {
    const { error } = await this.client
      .from("projects")
      .delete()
      .eq("id", projectId);

    if (error) throw error;
  }
}
