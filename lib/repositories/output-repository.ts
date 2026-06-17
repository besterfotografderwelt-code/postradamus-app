import type { ProjectOutput, ProjectOutputType } from "@/lib/types";

export interface OutputRepository {
  list(projectId: string): Promise<ProjectOutput[]>;
  create(projectId: string, type: ProjectOutputType, content: string, generator: ProjectOutput["generator"]): Promise<ProjectOutput>;
  update(projectId: string, outputId: string, content: string): Promise<ProjectOutput>;
  deleteAll(projectId: string): Promise<void>;
}
