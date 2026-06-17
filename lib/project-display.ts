import type { WeddingProject } from "@/lib/types";

function formatProjectDate(date: string, month: "short" | "long" = "short") {
  if (!date) return "";

  const parsed = new Date(`${date}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) return "";

  return new Intl.DateTimeFormat("de-AT", {
    day: "2-digit",
    month,
    year: "numeric"
  }).format(parsed);
}

export function getProjectTitle(project: WeddingProject) {
  if (project.coupleName.trim()) return project.coupleName.trim();

  const createdAt = new Date(project.createdAt);
  if (Number.isNaN(createdAt.getTime())) return "Fotoprojekt";

  return `Fotoprojekt vom ${new Intl.DateTimeFormat("de-AT", {
    day: "2-digit",
    month: "long",
    year: "numeric"
  }).format(createdAt)}`;
}

export function getProjectDate(project: WeddingProject, month: "short" | "long" = "short") {
  return formatProjectDate(project.weddingDate, month);
}

export function getProjectMeta(project: WeddingProject, month: "short" | "long" = "short") {
  const details = [getProjectDate(project, month), project.location.trim()].filter(Boolean);
  return details.length > 0 ? details.join(" · ") : "Noch keine Angaben";
}
