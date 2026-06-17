import { seedProjects } from "@/lib/mock-projects";
import {
  createProject,
  deleteProject,
  loadProjects,
  saveProjects,
  updateProject
} from "@/lib/project-store";
import type {
  CreateProjectInput,
  ProjectRepository,
  UpdateProjectInput
} from "@/lib/repositories/project-repository";

export class LocalProjectRepository implements ProjectRepository {
  async list() {
    return loadProjects(seedProjects);
  }

  async get(projectId: string) {
    return (await this.list()).find((project) => project.id === projectId) ?? null;
  }

  async create(input: CreateProjectInput) {
    const project = createProject(input);
    saveProjects([project, ...(await this.list())]);
    return project;
  }

  async update(projectId: string, input: UpdateProjectInput) {
    const project = updateProject(projectId, seedProjects, (current) => ({
      ...current,
      ...input
    }));

    if (!project) {
      throw new Error(`Projekt ${projectId} wurde nicht gefunden.`);
    }

    return project;
  }

  async delete(projectId: string) {
    deleteProject(projectId, seedProjects);
  }
}
