"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getProjectRepository } from "@/lib/repositories/get-project-repository";
import { getImageRepository } from "@/lib/repositories/get-image-repository";
import { getOutputRepository } from "@/lib/repositories/get-output-repository";
import { getProjectMeta, getProjectTitle } from "@/lib/project-display";
import { projectStageLabel, type WeddingProject } from "@/lib/types";

export function ProjectOverview() {
  const [projects, setProjects] = useState<WeddingProject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let cancelled = false;

    getProjectRepository()
      .list()
      .then((nextProjects) => {
        if (!cancelled) setProjects(nextProjects);
      })
      .catch(() => {
        if (!cancelled) setErrorMessage("Die Projektübersicht konnte nicht geladen werden.");
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const activeProjects = projects.filter((p) => p.stage !== "export");
  const finishedProjects = projects.filter((p) => p.stage === "export");

  async function handleDelete(projectId: string) {
    try {
      await getImageRepository().deleteAll(projectId);
      await getOutputRepository().deleteAll(projectId);
      await getProjectRepository().delete(projectId);
      setProjects((prev) => prev.filter((p) => p.id !== projectId));
    } catch {
      setErrorMessage("Das Projekt konnte nicht gelöscht werden.");
    }
  }

  return (
    <>
      <section className="section">
        <div className="section-header project-overview-header">
          <div>
            <h1>Projekte</h1>
            <p>{projects.length} {projects.length === 1 ? "Projekt" : "Projekte"}</p>
          </div>
          <Link className="button" href="/projects/new">
            Neues Projekt
          </Link>
        </div>

        {isLoading ? (
          <div className="panel empty-state">Lade Projekte …</div>
        ) : errorMessage ? (
          <div className="form-message form-message-error" role="alert">{errorMessage}</div>
        ) : projects.length === 0 ? (
          <div className="empty-dashboard">
            <h2>Dein erstes Projekt</h2>
            <p>Lege ein neues Projekt an und erstelle deinen ersten Instagram-Post.</p>
            <Link className="button" href="/projects/new">Projekt starten</Link>
          </div>
        ) : (
          <>
            {activeProjects.length > 0 ? (
              <div className="project-group">
                <div className="meta">In Arbeit</div>
                <div className="project-list">
                  {activeProjects.map((project) => (
                    <ProjectRow key={project.id} project={project} onDelete={() => handleDelete(project.id)} />
                  ))}
                </div>
              </div>
            ) : null}

            {finishedProjects.length > 0 ? (
              <div className="project-group">
                <div className="meta">Abgeschlossen</div>
                <div className="project-list">
                  {finishedProjects.map((project) => (
                    <ProjectRow key={project.id} project={project} onDelete={() => handleDelete(project.id)} />
                  ))}
                </div>
              </div>
            ) : null}
          </>
        )}
      </section>
    </>
  );
}

function ProjectRow({ project, onDelete }: { project: WeddingProject; onDelete: () => void }) {
  const isFinished = project.stage === "export";
  const [confirming, setConfirming] = useState(false);

  return (
    <article className="project-row">
      <div className="project-row-info">
        <strong>
          <Link href={`/projects/${project.id}`}>{getProjectTitle(project)}</Link>
        </strong>
        <small>{getProjectMeta(project)}</small>
      </div>
      <div className="project-row-summary">
        {project.uploadedImageCount > 0 ? (
          <span>
            {project.uploadedImageCount} {project.uploadedImageCount === 1 ? "Bild" : "Bilder"}
          </span>
        ) : null}
        <span className={`stage-badge ${isFinished ? "stage-done" : ""}`}>
          {isFinished ? "✓ Fertig" : projectStageLabel[project.stage]}
        </span>
      </div>
      <div className="project-row-actions">
        <Link className="button" href={`/projects/${project.id}`}>
          {isFinished ? "Ansehen" : "Weiter"}
        </Link>
        {confirming ? (
          <>
            <button
              className="button-secondary"
              onClick={() => setConfirming(false)}
              style={{ color: "var(--muted)" }}
              type="button"
            >
              Nein
            </button>
            <button
              className="button"
              onClick={onDelete}
              style={{ background: "#b42318" }}
              type="button"
            >
              Löschen
            </button>
          </>
        ) : (
          <button
            className="button-secondary"
            onClick={() => setConfirming(true)}
            style={{ color: "#b42318" }}
            type="button"
          >
            ✕
          </button>
        )}
      </div>
    </article>
  );
}
