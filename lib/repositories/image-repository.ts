import type { ProjectImage, ProjectImageTag } from "@/lib/types";

export interface ImageRepository {
  loadImages(projectId: string): Promise<ProjectImage[]>;
  addImages(projectId: string, files: File[]): Promise<ProjectImage[]>;
  toggleFavorite(projectId: string, imageId: string): Promise<void>;
  setTags(projectId: string, imageId: string, tags: ProjectImageTag[]): Promise<void>;
  releaseUrls(images: ProjectImage[]): void;
  deleteAll(projectId: string): Promise<void>;
  deleteImage(projectId: string, imageId: string): Promise<void>;
}
