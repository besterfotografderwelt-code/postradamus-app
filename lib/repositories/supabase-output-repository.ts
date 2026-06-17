import type { SupabaseClient } from "@supabase/supabase-js";
import type { OutputRepository } from "@/lib/repositories/output-repository";
import type { Database } from "@/lib/supabase/database.types";
import type { ProjectOutput, ProjectOutputType } from "@/lib/types";

type OutputRow = Database["public"]["Tables"]["project_outputs"]["Row"];

function mapOutput(row: OutputRow): ProjectOutput {
  const generator = row.payload_json &&
    typeof row.payload_json === "object" &&
    !Array.isArray(row.payload_json) &&
    row.payload_json.generator === "openai"
      ? "openai"
      : "demo";

  return {
    id: row.id,
    projectId: row.project_id,
    type: row.output_type,
    content: row.content_markdown || row.content_text,
    generator,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export class SupabaseOutputRepository implements OutputRepository {
  constructor(private readonly client: SupabaseClient<Database>) {}

  async list(projectId: string) {
    const { data, error } = await this.client
      .from("project_outputs")
      .select("*")
      .eq("project_id", projectId)
      .order("updated_at", { ascending: false });

    if (error) throw error;
    return data.map(mapOutput);
  }

  async create(
    projectId: string,
    type: ProjectOutputType,
    content: string,
    generator: ProjectOutput["generator"]
  ) {
    const { data, error } = await this.client
      .from("project_outputs")
      .insert({
        project_id: projectId,
        output_type: type,
        content_markdown: content,
        content_text: content,
        payload_json: { generator }
      })
      .select()
      .single();

    if (error) throw error;
    return mapOutput(data);
  }

  async update(projectId: string, outputId: string, content: string) {
    const { data, error } = await this.client
      .from("project_outputs")
      .update({
        content_markdown: content,
        content_text: content
      })
      .eq("id", outputId)
      .eq("project_id", projectId)
      .select()
      .single();

    if (error) throw error;
    return mapOutput(data);
  }

  async deleteAll(projectId: string) {
    const { error } = await this.client
      .from("project_outputs")
      .delete()
      .eq("project_id", projectId);

    if (error) throw error;
  }
}
