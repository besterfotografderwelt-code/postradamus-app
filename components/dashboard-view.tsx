"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { getProjectRepository } from "@/lib/repositories/get-project-repository";
import { getProjectDate, getProjectTitle } from "@/lib/project-display";
import type { WeddingProject } from "@/lib/types";

export function DashboardView() {
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
        if (!cancelled) setErrorMessage("Die Projekte konnten nicht geladen werden.");
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const stats = useMemo(() => {
    const active = projects.filter((p) => p.stage !== "export");
    const done = projects.filter((p) => p.stage === "export");
    return { active: active.length, done: done.length, total: projects.length };
  }, [projects]);

  return (
    <>
      <section className="hero-simple">
        <div className="eyebrow">Postradamus</div>
        <h1>Dein Content. Dein Plan. Dein Post.</h1>
        <p className="lead">Projekt anlegen, Bilder auswählen, Inhalt erstellen.</p>
        <div className="hero-actions" style={{ justifyContent: "center", flexWrap: "wrap" }}>
          <Link className="button" href="/projects/new">
            Neues Projekt
          </Link>
          {projects.length > 0 ? (
            <Link className="button-secondary" href="/projects">
              {stats.total} {stats.total === 1 ? "Projekt" : "Projekte"}
            </Link>
          ) : null}
        </div>
        {projects.length > 0 ? (
          <div className="hero-stats">
            <div className="hero-stat">
              <strong>{stats.active}</strong>
              <span>In Arbeit</span>
            </div>
            <div className="hero-stat">
              <strong>{stats.done}</strong>
              <span>Fertig</span>
            </div>
          </div>
        ) : null}
      </section>

      <section className="section">
        <div className="section-header">
          <h2>Letzte Projekte</h2>
          {projects.length > 3 ? (
            <Link className="button-secondary" href="/projects">
              Alle anzeigen
            </Link>
          ) : null}
        </div>

        <div className="project-cards">
          {isLoading && <div className="panel empty-state">Lade Projekte …</div>}
          {errorMessage && (
            <div className="form-message form-message-error" role="alert">
              {errorMessage}
            </div>
          )}
          {!isLoading && !errorMessage && projects.length === 0 && (
            <div className="panel empty-state">Noch keine Projekte angelegt.</div>
          )}
          {projects.slice(0, 3).map((project) => (
            <Link className="project-card" href={`/projects/${project.id}`} key={project.id}>
              <span className="project-card-date">
                {getProjectDate(project) || "Ohne Angaben"}
                {project.stage === "export" ? " · ✓ Fertig" : ""}
              </span>
              <strong>{getProjectTitle(project)}</strong>
              <span>{project.location || `${project.uploadedImageCount} Bilder`}</span>
              <span className="project-card-arrow">→</span>
            </Link>
          ))}
          {projects.length === 0 && !isLoading ? (
            <Link className="project-card project-card-new" href="/projects/new">
              <strong>+ Neues Projekt</strong>
              <span>Fotos hochladen, Text erstellen, fertig.</span>
            </Link>
          ) : null}
        </div>
      </section>
    </>
  );
}
