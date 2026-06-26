"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { getImageRepository } from "@/lib/repositories/get-image-repository";
import { ContentStudio } from "@/components/content-studio";
import { extractImageDate, formatCaptureDate } from "@/lib/exif-utils";
import {
  getProjectRepository,
  usesSupabaseRepository
} from "@/lib/repositories/get-project-repository";
import { getProjectMeta, getProjectTitle } from "@/lib/project-display";
import { projectImageTags, type ProjectImage, type ProjectVideo, type WeddingProject } from "@/lib/types";
import {
  addProjectVideos,
  deleteProjectVideo,
  loadProjectVideos,
  releaseProjectVideoUrls,
  MAX_VIDEO_FILES,
  MAX_VIDEO_SIZE_BYTES
} from "@/lib/project-videos";
import { type OnboardingConfig } from "@/components/project-create-form";

type ProjectDetailProps = {
  projectId: string;
};

const MAX_FILES_PER_UPLOAD = 300;
const MAX_FILE_SIZE = 25 * 1024 * 1024;

function formatDuration(seconds: number): string {
  if (!seconds || seconds <= 0) return "";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function ProjectDetail({ projectId }: ProjectDetailProps) {
  const [project, setProject] = useState<WeddingProject | null>(null);
  const [images, setImages] = useState<ProjectImage[]>([]);
  const [videos, setVideos] = useState<ProjectVideo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [imagesLoaded, setImagesLoaded] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingVideo, setIsSavingVideo] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const [captureDates, setCaptureDates] = useState<Record<string, string | null>>({});
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState("");
  const [showAllImages, setShowAllImages] = useState(false);

  // Dynamic tags from onboarding
  const dynamicTags = useMemo(() => {
    try {
      const raw = localStorage.getItem("flowstream.project-tags." + projectId);
      if (raw) return JSON.parse(raw) as string[];
    } catch {}
    try {
      const raw = localStorage.getItem("flowstream.onboarding");
      if (raw) return (JSON.parse(raw) as OnboardingConfig).tags;
    } catch {}
    return projectImageTags;
  }, [projectId]);
  const imagesRef = useRef<ProjectImage[]>([]);
  const videosRef = useRef<ProjectVideo[]>([]);
  const usesSupabase = usesSupabaseRepository();

  function replaceImages(nextImages: ProjectImage[]) {
    getImageRepository().releaseUrls(imagesRef.current);
    imagesRef.current = nextImages;
    setImages(nextImages);
  }

  useEffect(() => {
    let cancelled = false;

    async function loadProject() {
      setIsLoading(true);
      setImagesLoaded(false);
      setErrorMessage("");

      try {
        const nextProject = await getProjectRepository().get(projectId);
        const imageRepo = getImageRepository();
        const nextImages = nextProject ? await imageRepo.loadImages(projectId) : [];
        const nextVideos = nextProject ? await loadProjectVideos(projectId) : [];
        if (cancelled) {
          imageRepo.releaseUrls(nextImages);
          releaseProjectVideoUrls(nextVideos);
          return;
        }
        setProject(nextProject);
        replaceImages(nextImages);
        videosRef.current = nextVideos;
        setVideos(nextVideos);
        setImagesLoaded(true);
      } catch {
        if (!cancelled) {
          setErrorMessage("Die gespeicherten Vorschaubilder konnten nicht geladen werden.");
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    void loadProject();

    return () => {
      cancelled = true;
    };
  }, [projectId]);

  useEffect(() => {
    if (!project || !imagesLoaded) return;

    const favoriteCount = images.filter((image) => image.isFavorite).length;
    const tagCount = images.reduce((count, image) => count + image.tags.length, 0);
    const stage = images.length > 0 && project.stage === "brief" ? "selection" : project.stage;
    if (usesSupabase) return;

    if (
      project.uploadedImageCount === images.length &&
      project.favoriteCount === favoriteCount &&
      project.tagCount === tagCount &&
      project.stage === stage
    ) {
      return;
    }

    void getProjectRepository()
      .update(project.id, {
        uploadedImageCount: images.length,
        favoriteCount,
        tagCount,
        stage
      })
      .then(setProject)
      .catch(() => setErrorMessage("Der Projektstatus konnte nicht gespeichert werden."));
  }, [images, imagesLoaded, project, usesSupabase]);

  useEffect(
    () => () => {
      getImageRepository().releaseUrls(imagesRef.current);
      releaseProjectVideoUrls(videosRef.current);
      imagesRef.current = [];
      videosRef.current = [];
    },
    []
  );

  const favoriteCount = useMemo(() => images.filter((image) => image.isFavorite).length, [images]);

  async function handleVideoUpload(files: FileList | null) {
    if (!files || files.length === 0 || !project) return;

    setErrorMessage("");
    const selectedFiles = Array.from(files);
    if (selectedFiles.length > MAX_VIDEO_FILES) {
      setErrorMessage(`Bitte höchstens ${MAX_VIDEO_FILES} Videos auf einmal auswählen.`);
      return;
    }

    const accepted = selectedFiles.filter(
      (file) =>
        (file.type === "video/mp4" || file.type === "video/quicktime" ||
         /\.(mp4|mov)$/i.test(file.name)) &&
        file.size <= MAX_VIDEO_SIZE_BYTES
    );
    if (accepted.length !== selectedFiles.length) {
      setErrorMessage(`Einige Dateien wurden ausgelassen. Erlaubt sind MP4 & MOV bis ${MAX_VIDEO_SIZE_BYTES / 1024 / 1024} MB.`);
    }
    if (accepted.length === 0) return;

    setIsSavingVideo(true);
    try {
      const added = await addProjectVideos(project.id, accepted);
      const nextVideos = [...videosRef.current, ...added];
      videosRef.current = nextVideos;
      setVideos(nextVideos);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Videos konnten nicht gespeichert werden.");
    } finally {
      setIsSavingVideo(false);
    }
  }

  async function handleUpload(files: FileList | null) {
    if (!files || files.length === 0 || !project) return;

    setErrorMessage("");
    const selectedFiles = Array.from(files);
    if (selectedFiles.length > MAX_FILES_PER_UPLOAD) {
      setErrorMessage(`Bitte höchstens ${MAX_FILES_PER_UPLOAD} JPGs auf einmal auswählen.`);
      return;
    }

    const accepted = selectedFiles.filter(
      (file) =>
        (file.type === "image/jpeg" || /\.jpe?g$/i.test(file.name)) &&
        file.size <= MAX_FILE_SIZE
    );
    if (accepted.length !== selectedFiles.length) {
      setErrorMessage("Einige Dateien wurden ausgelassen. Erlaubt sind JPGs bis 25 MB.");
    }
    if (accepted.length === 0) return;

    setIsSaving(true);
    try {
      const added = await getImageRepository().addImages(project.id, accepted);
      const nextImages = [...imagesRef.current, ...added].sort((a, b) => a.sortOrder - b.sortOrder);
      imagesRef.current = nextImages;
      setImages(nextImages);

      // Extract EXIF dates and check for mixed events
      const dateInfos = await Promise.all(accepted.map(extractImageDate));
      const newDates: Record<string, string | null> = {};
      for (const info of dateInfos) {
        // Match by filename (the image name maps to our stored images)
        const matched = added.find((img) => img.name === info.name);
        if (matched) newDates[matched.id] = info.dateTaken;
      }
      setCaptureDates((prev) => ({ ...prev, ...newDates }));

      // Date warning disabled per user request
    } catch {
      setErrorMessage("Die Vorschaubilder konnten nicht gespeichert werden. Bitte erneut versuchen.");
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return (
      <section className="section">
        <div className="panel" style={{ padding: 24 }}>
          Lade Projekt ...
        </div>
      </section>
    );
  }

  if (!project) {
    return (
      <section className="section">
        <div className="panel" style={{ padding: 24 }}>
          Projekt nicht gefunden.
        </div>
      </section>
    );
  }

  return (
    <>
      <section className="section">
        <div className="project-title">
          <Link className="button-secondary" href="/projects">
            ← Projekte
          </Link>
          <div>
            {editingTitle ? (
              <div className="title-edit">
                <input
                  autoFocus
                  className="title-edit-input"
                  onChange={(e) => setTitleDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      void getProjectRepository().update(project.id, { coupleName: titleDraft }).then((p) => { setProject(p); setEditingTitle(false); }).catch(() => setErrorMessage("Titel konnte nicht gespeichert werden."));
                    }
                    if (e.key === "Escape") setEditingTitle(false);
                  }}
                  placeholder="Projektname"
                  value={titleDraft}
                />
                <button className="button-secondary" onClick={() => setEditingTitle(false)} type="button">Abbrechen</button>
              </div>
            ) : (
              <h1
                onClick={() => { setTitleDraft(project.coupleName || ""); setEditingTitle(true); }}
                style={{ cursor: "pointer" }}
                title="Klicken zum Umbenennen"
              >
                {getProjectTitle(project)}
              </h1>
            )}
            <p>{getProjectMeta(project, "long")}</p>
          </div>
        </div>
      </section>

      <section className="workflow-step">
        <div className="step-content">
          <div>
            <h2><span className="step-number">1</span>Bilder hinzufügen</h2>
            <p>Wähle deine JPGs für dieses Projekt aus.</p>
          </div>

          <label className="upload-card">
            <input
              accept="image/jpeg"
              disabled={isSaving}
              multiple
              onChange={(event) => {
                const files = event.target.files;
                if (!files) return;
                void handleUpload(files).finally(() => {
                  const el = event.target as HTMLInputElement | null;
                  if (el) el.value = "";
                });
              }}
              type="file"
            />
            <strong>{isSaving ? "Bilder werden geladen ..." : "Bilder auswählen"}</strong>
            <span>JPG · maximal 300 Dateien</span>
          </label>
          {errorMessage ? <p className="form-message form-message-error" role="alert">{errorMessage}</p> : null}

        {/* Video Upload */}
          <div className="video-upload-area" style={{ marginTop: 24, paddingTop: 16, borderTop: "1px solid var(--border-light)" }}>
            <label className="upload-card" style={{ borderStyle: "dashed" }}>
              <input
                accept="video/mp4,video/quicktime"
                disabled={isSavingVideo}
                multiple
                onChange={(event) => {
                  const files = event.target.files;
                  if (!files) return;
                  void handleVideoUpload(files).finally(() => {
                    const el = event.target as HTMLInputElement | null;
                    if (el) el.value = "";
                  });
                }}
                type="file"
              />
              <strong>{isSavingVideo ? "Video wird geladen ..." : "🎬 Video hochladen (optional)"}</strong>
              <span>MP4 / MOV · maximal {MAX_VIDEO_FILES} Dateien · bis {MAX_VIDEO_SIZE_BYTES / 1024 / 1024} MB</span>
            </label>
          </div>

          {videos.length > 0 && (
            <div className="video-grid-section" style={{ marginTop: 8 }}>
              <div className="image-grid-header">
                <span>{videos.length} Video{videos.length !== 1 ? "s" : ""}</span>
              </div>
              <div className="image-grid">
                {videos.map((video) => (
                  <article className="image-card video-card" key={video.id}>
                    <Image
                      alt={video.name}
                      height={900}
                      src={video.thumbnailUrl}
                      unoptimized
                      width={1600}
                    />
                    <div className="video-duration-badge">
                      {formatDuration(video.duration)}
                    </div>
                    <div className="video-play-overlay">▶</div>
                    <button
                      className="image-delete"
                      onClick={async (e) => {
                        e.stopPropagation();
                        try {
                          await deleteProjectVideo(project.id, video.id);
                          setVideos((current) => {
                            const next = current.filter((v) => v.id !== video.id);
                            videosRef.current = next;
                            return next;
                          });
                          releaseProjectVideoUrls([video]);
                        } catch {
                          setErrorMessage("Das Video konnte nicht gelöscht werden.");
                        }
                      }}
                      title="Video löschen"
                      type="button"
                    >
                      ✕
                    </button>
                    <div className="image-card-body">
                      <span className="meta" style={{ fontSize: ".82rem", display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {video.name}
                      </span>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          )}

          {images.length > 0 && (
          <>
            <div className="image-grid-header">
              <span>{images.length} Bilder</span>
              <span className="meta">{favoriteCount} Favorit{favoriteCount !== 1 ? "en" : ""}</span>
            </div>
          <div className="image-grid">
            {(showAllImages ? images : images.slice(0, 8)).map((image) => {
              const activeTags = image.tags;
              return (
                <article className="image-card" key={image.id}>
                  <Image
                    alt={image.name}
                    height={1600}
                    src={image.thumbnailUrl}
                    unoptimized
                    width={1280}
                  />
                  <button
                    className="image-delete"
                    onClick={async (e) => {
                      e.stopPropagation();
                      try {
                        await getImageRepository().deleteImage(project.id, image.id);
                        setImages((current) => {
                          const next = current.filter((entry) => entry.id !== image.id);
                          imagesRef.current = next;
                          return next;
                        });
                      } catch {
                        setErrorMessage("Das Bild konnte nicht gelöscht werden.");
                      }
                    }}
                    title="Bild löschen"
                    type="button"
                  >
                    ✕
                  </button>
                  <div className="image-card-body">
                    {captureDates[image.id] ? (
                      <div className="image-date-badge">{formatCaptureDate(captureDates[image.id])}</div>
                    ) : null}
                    <div className="image-card-head">
                      <button
                        className={`mini-button ${image.isFavorite ? "is-active" : ""}`}
                        onClick={async () => {
                          setErrorMessage("");
                          try {
                            await getImageRepository().toggleFavorite(project.id, image.id);
                            setImages((current) => {
                              const nextImages = current.map((entry) =>
                                entry.id === image.id ? { ...entry, isFavorite: !entry.isFavorite } : entry
                              );
                              imagesRef.current = nextImages;
                              return nextImages;
                            });
                          } catch {
                            setErrorMessage("Der Favoritenstatus konnte nicht gespeichert werden.");
                          }
                        }}
                        type="button"
                      >
                        {image.isFavorite ? "✓ Favorit" : "Favorit"}
                      </button>
                    </div>

                    <div className="chips">
                      {dynamicTags.map((tag) => {
                        const isActive = activeTags.includes(tag);
                        return (
                          <button
                            className={`tag-chip ${isActive ? "is-active" : ""}`}
                            key={tag}
                            onClick={async () => {
                              const nextTags = isActive
                                ? activeTags.filter((entry) => entry !== tag)
                                : [...activeTags, tag];
                              setErrorMessage("");
                              try {
                                await getImageRepository().setTags(project.id, image.id, nextTags);
                                setImages((current) => {
                                  const nextImages = current.map((entry) =>
                                    entry.id === image.id ? { ...entry, tags: nextTags } : entry
                                  );
                                  imagesRef.current = nextImages;
                                  return nextImages;
                                });
                              } catch {
                                setErrorMessage("Die Tags konnten nicht gespeichert werden.");
                              }
                            }}
                            type="button"
                          >
                            {tag}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
          {!showAllImages && images.length > 8 ? (
            <button
              className="show-more-button"
              onClick={() => setShowAllImages(true)}
              type="button"
            >
              + {images.length - 8} weitere Bilder anzeigen
            </button>
          ) : images.length > 8 ? (
            <button
              className="show-more-button"
              onClick={() => setShowAllImages(false)}
              type="button"
            >
              Weniger anzeigen
            </button>
          ) : null}
          </>
        )}
        </div>
      </section>

      <ContentStudio
        images={images}
        videos={videos}
        onComplete={async () => {
          const updated = await getProjectRepository().update(project.id, { stage: "export" });
          setProject(updated);
        }}
        onFirstOutput={() => {
          if (project.stage === "brief" || project.stage === "selection") {
            void getProjectRepository()
              .update(project.id, { stage: "copy" })
              .then(setProject)
              .catch(() => setErrorMessage("Der Projektstatus konnte nicht gespeichert werden."));
          }
        }}
        project={project}
      />
    </>
  );
}
