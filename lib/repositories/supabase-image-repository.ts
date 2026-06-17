import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { ProjectImage, ProjectImageTag } from "@/lib/types";
import type { ImageRepository } from "@/lib/repositories/image-repository";

type ImageRow = Database["public"]["Tables"]["project_images"]["Row"];

const MAX_THUMBNAIL_EDGE = 1600;
const THUMBNAIL_QUALITY = 0.82;
const SIGNED_URL_EXPIRY = 3600;
const STORAGE_BUCKET = "wedding-previews";

async function createThumbnail(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_THUMBNAIL_EDGE / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d");
  if (!context) {
    bitmap.close();
    throw new Error("Vorschaubild konnte nicht erzeugt werden.");
  }

  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Vorschaubild konnte nicht gespeichert werden."))),
      "image/jpeg",
      THUMBNAIL_QUALITY
    );
  });
}

function buildStoragePath(userId: string, projectId: string, imageId: string): string {
  return `${userId}/${projectId}/${imageId}.jpg`;
}

function buildThumbnailPath(userId: string, projectId: string, imageId: string): string {
  return `${userId}/${projectId}/${imageId}_thumb.jpg`;
}

async function mapImageRow(
  row: ImageRow,
  client: SupabaseClient<Database>
): Promise<ProjectImage> {
  const [imageResult, thumbnailResult] = await Promise.all([
    client.storage
      .from(STORAGE_BUCKET)
      .createSignedUrl(row.storage_path, SIGNED_URL_EXPIRY),
    row.thumbnail_path
      ? client.storage
          .from(STORAGE_BUCKET)
          .createSignedUrl(row.thumbnail_path, SIGNED_URL_EXPIRY)
      : Promise.resolve(null)
  ]);

  if (imageResult.error) throw imageResult.error;
  if (thumbnailResult?.error) throw thumbnailResult.error;

  const imageUrl = imageResult.data.signedUrl;
  const thumbnailUrl = thumbnailResult?.data.signedUrl ?? imageUrl;
  const tags = row.tags.filter((tag): tag is ProjectImageTag => typeof tag === "string");

  return {
    id: row.id,
    projectId: row.project_id,
    name: row.filename,
    originalUrl: imageUrl,
    thumbnailUrl,
    isFavorite: row.is_favorite,
    tags,
    sortOrder: row.sort_order,
    createdAt: row.created_at
  };
}

export class SupabaseImageRepository implements ImageRepository {
  constructor(private readonly client: SupabaseClient<Database>) {}

  async loadImages(projectId: string): Promise<ProjectImage[]> {
    const { data, error } = await this.client
      .from("project_images")
      .select("*")
      .eq("project_id", projectId)
      .order("sort_order", { ascending: true });

    if (error) throw error;
    const images = await Promise.all(data.map((row) => mapImageRow(row, this.client)));
    return images;
  }

  async addImages(projectId: string, files: File[]): Promise<ProjectImage[]> {
    const {
      data: { user },
      error: authError
    } = await this.client.auth.getUser();

    if (authError) throw authError;
    if (!user) throw new Error("Zum Hochladen von Bildern ist eine Anmeldung erforderlich.");

    const { data: lastImage, error: sortError } = await this.client
      .from("project_images")
      .select("sort_order")
      .eq("project_id", projectId)
      .order("sort_order", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (sortError) throw sortError;

    let nextSortOrder = (lastImage?.sort_order ?? -1) + 1;

    const results: ProjectImage[] = [];
    const createdRows: string[] = [];
    const uploadedPaths: string[] = [];

    try {
      for (const file of files) {
        const imageId = crypto.randomUUID();
        const storagePath = buildStoragePath(user.id, projectId, imageId);
        const thumbnailPath = buildThumbnailPath(user.id, projectId, imageId);
        const thumbnail = await createThumbnail(file);

        const [uploadResult, thumbResult] = await Promise.all([
          this.client.storage.from(STORAGE_BUCKET).upload(storagePath, file, {
            cacheControl: "3600",
            contentType: "image/jpeg",
            upsert: false
          }),
          this.client.storage.from(STORAGE_BUCKET).upload(thumbnailPath, thumbnail, {
            cacheControl: "3600",
            contentType: "image/jpeg",
            upsert: false
          })
        ]);

        if (!uploadResult.error) uploadedPaths.push(storagePath);
        if (!thumbResult.error) uploadedPaths.push(thumbnailPath);
        if (uploadResult.error) throw uploadResult.error;
        if (thumbResult.error) throw thumbResult.error;

        const { data, error: insertError } = await this.client
          .from("project_images")
          .insert({
            id: imageId,
            project_id: projectId,
            storage_path: storagePath,
            thumbnail_path: thumbnailPath,
            filename: file.name,
            sort_order: nextSortOrder,
            is_favorite: false,
            tags: []
          })
          .select()
          .single();

        if (insertError) throw insertError;

        createdRows.push(imageId);
        results.push(await mapImageRow(data, this.client));
        nextSortOrder++;
      }
    } catch (error) {
      if (createdRows.length > 0) {
        await this.client.from("project_images").delete().in("id", createdRows);
      }
      if (uploadedPaths.length > 0) {
        await this.client.storage.from(STORAGE_BUCKET).remove(uploadedPaths);
      }
      throw error;
    }

    return results;
  }

  async toggleFavorite(projectId: string, imageId: string): Promise<void> {
    const { data: current, error: fetchError } = await this.client
      .from("project_images")
      .select("is_favorite")
      .eq("id", imageId)
      .eq("project_id", projectId)
      .single();

    if (fetchError) throw fetchError;

    const { error } = await this.client
      .from("project_images")
      .update({ is_favorite: !current.is_favorite })
      .eq("id", imageId)
      .eq("project_id", projectId);

    if (error) throw error;
  }

  async setTags(projectId: string, imageId: string, tags: ProjectImageTag[]): Promise<void> {
    const { error } = await this.client
      .from("project_images")
      .update({ tags })
      .eq("id", imageId)
      .eq("project_id", projectId);

    if (error) throw error;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  releaseUrls(_images: ProjectImage[]): void {
    // Signed URLs expire automatically; no explicit revocation needed.
  }

  async deleteAll(projectId: string) {
    const { error } = await this.client
      .from("project_images")
      .delete()
      .eq("project_id", projectId);

    if (error) throw error;
  }

  async deleteImage(_projectId: string, imageId: string) {
    const { error } = await this.client
      .from("project_images")
      .delete()
      .eq("id", imageId);

    if (error) throw error;
  }
}
