"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { getOutputRepository } from "@/lib/repositories/get-output-repository";
import { PostingPlan, type PlannedPost } from "@/components/posting-plan";
import { type ProjectImage, type ProjectOutput, type WeddingProject } from "@/lib/types";

type ContentStudioProps = { project: WeddingProject; images: ProjectImage[]; onFirstOutput: () => void; onComplete: () => Promise<void> };

const tones = [
  { value: "", label: "Authentisch" },
  { value: "romantisch", label: "Romantisch" },
  { value: "lustig", label: "Lustig" },
  { value: "emotional", label: "Emotional" },
  { value: "modern", label: "Modern & edgy" },
  { value: "kurz", label: "Kurz & knackig" },
  { value: "motivierend", label: "Motivierend" },
  { value: "informativ", label: "Informativ" },
  { value: "lässig", label: "Lässig" },
];

export function ContentStudio({ project, images, onFirstOutput }: ContentStudioProps) {
  const [output, setOutput] = useState<ProjectOutput | null>(null);
  const [draft, setDraft] = useState("");
  const [tone, setTone] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPosting, setIsPosting] = useState(false);
  const [message, setMessage] = useState("");
  const [postResult, setPostResult] = useState("");
  const [plannedPosts, setPlannedPosts] = useState<PlannedPost[]>([]);
  const firstGen = useRef(false);
  const saveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const automationTimers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clearAutomationTimers = useCallback(() => {
    automationTimers.current.forEach((timer) => clearTimeout(timer));
    automationTimers.current = [];
  }, []);

  useEffect(() => {
    let c = false;
    void getOutputRepository().list(project.id).then((s) => { if (c) return; const f = s[0]; if (f) { setOutput(f); setDraft(f.content); firstGen.current = true; } }).catch(() => { if (!c) setMessage("Inhalte konnten nicht geladen werden."); });
    return () => { c = true; };
  }, [project.id]);

  useEffect(() => {
    if (!output || draft === output.content) return;
    if (saveTimeout.current) clearTimeout(saveTimeout.current);

    saveTimeout.current = setTimeout(() => {
      void getOutputRepository()
        .update(project.id, output.id, draft)
        .then((updated) => setOutput(updated))
        .catch(() => setMessage("Die Textänderung konnte nicht gespeichert werden."));
    }, 300);

    return () => {
      if (saveTimeout.current) clearTimeout(saveTimeout.current);
    };
  }, [draft, output, project.id]);

  useEffect(() => clearAutomationTimers, [clearAutomationTimers]);

  const generateContent = useCallback(async (selectedTone = tone) => {
    setIsGenerating(true); setMessage("");
    try {
      let bizTags = images.flatMap((img) => img.tags);
      if (bizTags.length === 0) {
        try { const raw = localStorage.getItem("flowstream.onboarding"); if (raw) bizTags = JSON.parse(raw).tags || []; } catch {}
      }
      const tags = Array.from(new Set(bizTags));
      const extra = selectedTone ? `Tonalität: ${selectedTone}` : "";
      let styleProfile = "";
      try { const raw = localStorage.getItem("flowstream.onboarding"); if (raw) styleProfile = JSON.parse(raw).styleProfile?.promptAddition || ""; } catch {}
      const res = await fetch("/api/generate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "instagram_caption", context: { project, favoriteCount: images.filter((img) => img.isFavorite).length, tags, extraInstructions: extra, businessType: project.businessType, businessLabel: project.businessType, styleProfile } }) });
      const data = await res.json();
      if (!res.ok || !data.content) throw new Error(data.error || "Fehler");
      const created = await getOutputRepository().create(project.id, "instagram_caption", data.content, data.generator);
      setOutput(created); setDraft(created.content);
      if (!firstGen.current) { firstGen.current = true; onFirstOutput(); }
    } catch (e) { setMessage(e instanceof Error ? e.message : "Fehler"); }
    finally { setIsGenerating(false); }
  }, [images, onFirstOutput, project, tone]);

  const toneRef = useRef(tone);
  useEffect(() => {
    if (!output || toneRef.current === tone) return;
    toneRef.current = tone;
    void generateContent(tone);
  }, [generateContent, tone, output]);

  function selectTone(nextTone: string) {
    setTone(nextTone);
    if (!output) {
      toneRef.current = nextTone;
      void generateContent(nextTone);
    }
  }


  async function publishPlannedPost(post: PlannedPost, config?: { accessToken: string; accountId: string }) {
    const captionParts = [
      post.caption.trim(),
      post.mentions.length > 0 ? post.mentions.join(" ") : "",
      post.hashtags.trim()
    ];
    const caption = captionParts.filter(Boolean).join("\n\n");
    if (!caption && post.type !== "story") throw new Error("Für einen geplanten Post fehlt die Caption.");

    const postableImages = post.images.filter((img) => img.thumbnailUrl);
    if (postableImages.length === 0) throw new Error("Für einen geplanten Post fehlt ein Bild.");

    const form = new FormData();
    await Promise.all(postableImages.map(async (img, index) => {
      const sourceUrl = img.originalUrl || img.thumbnailUrl;
      const blob = await fetch(sourceUrl).then((response) => {
        if (!response.ok) throw new Error(`Bild konnte nicht geladen werden: ${img.name}`);
        return response.blob();
      });
      const fieldName = postableImages.length > 1 ? "images" : "image";
      form.append(fieldName, blob, img.name || `photo-${index + 1}.jpg`);
    }));

    form.append("caption", caption);
    form.append("postType", post.type === "story" ? "story" : post.type === "reel" ? "reel" : post.type === "carousel" ? "carousel" : "feed");
    if (config?.accessToken) form.append("accessToken", config.accessToken);
    if (config?.accountId) form.append("instagramAccountId", config.accountId);

    const res = await fetch("/api/instagram/post", { method: "POST", body: form });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Instagram-Post fehlgeschlagen.");
    return data as { postedCount?: number; mediaIds?: string[] };
  }

  async function publishToInstagram() {
    setIsPosting(true);
    setPostResult("");
    try {
      let config = { accessToken: "", accountId: "" };
      try { const raw = localStorage.getItem("weddingflow.instagram.v1"); if (raw) config = JSON.parse(raw); } catch {}

      const publishablePosts = plannedPosts.filter((post) => post.type === "single" || post.type === "carousel" || post.type === "story");
      const unsupportedCount = plannedPosts.length - publishablePosts.length;
      if (publishablePosts.length === 0) {
        setPostResult("❌ Im Posting-Plan ist kein automatisch postbarer Feed-, Carousel- oder Story-Post.");
        return;
      }

      clearAutomationTimers();

      const now = Date.now();
      const duePosts = publishablePosts.filter((post) => new Date(post.scheduledAt).getTime() <= now);
      const futurePosts = publishablePosts.filter((post) => new Date(post.scheduledAt).getTime() > now);
      const postedIds = new Set<string>();
      const clientConfig = config.accessToken && config.accountId ? config : undefined;

      for (const post of duePosts) {
        await publishPlannedPost(post, clientConfig);
        postedIds.add(post.id);
      }

      futurePosts.forEach((post) => {
        const delay = Math.max(0, new Date(post.scheduledAt).getTime() - Date.now());
        const timer = setTimeout(() => {
          void publishPlannedPost(post, clientConfig).catch((error) => {
            setPostResult(`❌ Geplanter Post fehlgeschlagen: ${error instanceof Error ? error.message : "Unbekannter Fehler."}`);
          });
        }, delay);
        automationTimers.current.push(timer);
      });

      localStorage.setItem(`weddingflow.posting-plan.${project.id}`, JSON.stringify({
        startedAt: new Date().toISOString(),
        postIds: publishablePosts.map((post) => post.id),
        unsupportedCount
      }));

      const postedInfo = postedIds.size > 0 ? `${postedIds.size} fällige Posts veröffentlicht. ` : "";
      const scheduledInfo = futurePosts.length > 0 ? `${futurePosts.length} weitere Feed/Carousel/Story-Posts sind nach Plan getaktet.` : "Keine weiteren Feed/Carousel/Story-Posts offen.";
      const unsupportedInfo = unsupportedCount > 0 ? ` ${unsupportedCount} Reel-Slots bleiben vorbereitet, weil dafür noch eine echte MP4-Video-Erzeugung nötig ist.` : "";
      setPostResult(`🎉 Posting-Plan gestartet. ${postedInfo}${scheduledInfo}${unsupportedInfo}`);

      if (postedIds.size > 0) {
        import("canvas-confetti").then((m) => m.default({ particleCount: 150, spread: 80, origin: { y: 0.6 } }));
      }
    } catch (error) {
      setPostResult(`❌ ${error instanceof Error ? error.message : "Fehlgeschlagen."}`);
    }
    finally { setIsPosting(false); }
  }

  return (
    <>
      <section className={`workflow-step ${images.length === 0 ? "is-muted" : ""}`}>
        <div className="step-content">
          <div>
            <h2><span className="step-number">2</span>Text erstellen</h2>
            <p>Wähle deinen Lieblingsstil.</p>
          </div>
          <div className="content-empty content-style-step">
            <div className="tone-picker">
              {tones.map((t) => (
                <button
                  className={`tone-chip ${tone === t.value ? "is-active" : ""}`}
                  disabled={isGenerating}
                  key={t.value || "default"}
                  onClick={() => selectTone(t.value)}
                  type="button"
                >
                  {t.label}
                </button>
              ))}
            </div>
            {isGenerating ? <p className="helper">Texte und Postingplan werden vorbereitet ...</p> : null}
            {output ? (
              <button className="button-secondary" disabled={isGenerating} onClick={() => generateContent(tone)} type="button">
                {isGenerating ? "Generiert ..." : "Neu generieren"}
              </button>
            ) : null}
            {message ? <p className="form-message form-message-error" role="alert">{message}</p> : null}
          </div>
        </div>
      </section>

      <section className={`workflow-step ${!output ? "is-muted" : ""}`}>
        <div className="step-content">
          <div>
            <h2><span className="step-number">3</span>Postingplan</h2>
            <p>Lege fest, wie oft gepostet wird und prüfe die vorbereiteten Beiträge.</p>
          </div>
          {output ? (
            <>
              <PostingPlan images={images} onPlanChange={setPlannedPosts} tone={tone} businessType={project.businessType} />
              <div className="publish-actions publish-final" style={{ marginTop: 28 }}>
                <button className="button publish-button" disabled={isPosting} onClick={publishToInstagram} type="button">
                  {isPosting ? "Postet ..." : "Jetzt posten!"}
                </button>
                {postResult ? (
                  <div className={`post-result-card ${postResult.startsWith("🎉") ? "post-success" : postResult.startsWith("❌") ? "post-error" : "post-info"}`}>
                    <div className="post-result-icon">{postResult.startsWith("🎉") ? "🎉" : postResult.startsWith("❌") ? "😕" : "📋"}</div>
                    <p>{postResult}</p>
                    {postResult.startsWith("🎉") ? (
                      <>
                        <p className="post-result-sub">Deine Posts sind jetzt live auf Instagram!</p>
                        <div className="post-result-actions">
                          <Link className="button-secondary" href="/projects" style={{ fontSize: ".9rem" }}>
                            Zur Projektübersicht
                          </Link>
                          <Link className="button" href="/projects/new" style={{ fontSize: ".9rem" }}>
                            Nächstes Projekt
                          </Link>
                        </div>
                      </>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </>
          ) : (
            <div className="posting-plan-placeholder">
              <p>Wähle zuerst in Schritt 2 einen Stil aus.</p>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
