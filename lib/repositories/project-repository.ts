import type { ProjectStage, WeddingProject } from "@/lib/types";

export type CreateProjectInput = Omit<
  WeddingProject,
  "id" | "createdAt" | "uploadedImageCount" | "favoriteCount" | "tagCount" | "stage"
>;

export type UpdateProjectInput = Partial<CreateProjectInput> & {
  stage?: ProjectStage;
  uploadedImageCount?: number;
  favoriteCount?: number;
  tagCount?: number;
};

export interface ProjectRepository {
  list(): Promise<WeddingProject[]>;
  get(projectId: string): Promise<WeddingProject | null>;
  create(input: CreateProjectInput): Promise<WeddingProject>;
  update(projectId: string, input: UpdateProjectInput): Promise<WeddingProject>;
  delete(projectId: string): Promise<void>;
}
