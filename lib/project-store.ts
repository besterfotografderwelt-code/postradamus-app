import type { WeddingProject } from "@/lib/types";

const STORAGE_KEY = "weddingflow.projects.v1";

function normalizeProject(project: WeddingProject): WeddingProject {
  return {
    ...project,
    uploadedImageCount: Number.isFinite(project.uploadedImageCount) ? project.uploadedImageCount : 0,
    favoriteCount: Number.isFinite(project.favoriteCount) ? project.favoriteCount : 0,
    tagCount: Number.isFinite(project.tagCount) ? project.tagCount : 0
  };
}

export function loadProjects(fallback: WeddingProject[]): WeddingProject[] {
  if (typeof window === "undefined") {
    return fallback;
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as WeddingProject[];
    return Array.isArray(parsed) ? parsed.map(normalizeProject) : fallback;
  } catch {
    return fallback;
  }
}

export function saveProjects(projects: WeddingProject[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
}

export function updateProject(
  projectId: string,
  fallback: WeddingProject[],
  updater: (project: WeddingProject) => WeddingProject
) {
  const projects = loadProjects(fallback);
  const nextProjects = projects.map((project) => (project.id === projectId ? updater(project) : project));
  saveProjects(nextProjects);
  return nextProjects.find((project) => project.id === projectId) ?? null;
}

export function deleteProject(projectId: string, fallback: WeddingProject[]) {
  const projects = loadProjects(fallback);
  saveProjects(projects.filter((project) => project.id !== projectId));
}

export function createProject(
  input: Omit<
    WeddingProject,
    "id" | "createdAt" | "uploadedImageCount" | "favoriteCount" | "tagCount" | "stage"
  >
): WeddingProject {
  return {
    ...input,
    id: `wf-${crypto.randomUUID()}`,
    createdAt: new Date().toISOString(),
    uploadedImageCount: 0,
    favoriteCount: 0,
    tagCount: 0,
    stage: "brief"
  };
}
