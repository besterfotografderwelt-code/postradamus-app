"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ProjectImage } from "@/lib/types";
import type { PostSlot, PostingPlanProps, PlannedPost } from "./posting-plan.types";
import {
  getFormat,
  formatDate,
  dateAtOffset,
  calendarDayLabel,
  calendarMonthLabel,
  slotAnalysisKey,
} from "./posting-plan.helpers";
import { analyzePostSlot, regenerateCaptionForTone } from "./posting-plan.api";
import { generatePostSlots } from "./posting-plan.slots";

export type { PlannedPost, PostSlot };

const CACHE_PREFIX = "postingplan.captions";

function loadCachedCaptions(projectId?: string): Record<string, { caption: string; hashtags: string }> {
  if (!projectId) return {};
  try {
    const raw = localStorage.getItem(`${CACHE_PREFIX}.${projectId}`);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return {};
}

function saveCachedCaptions(projectId: string, captions: Record<string, { caption: string; hashtags: string }>) {
  try {
    localStorage.setItem(`${CACHE_PREFIX}.${projectId}`, JSON.stringify(captions));
  } catch { /* ignore quota errors */ }
}

export function PostingPlan({
  images,
  tone = "authentisch",
  businessType = "sonstiges",
  projectId,
  onPlanChange,
}: PostingPlanProps) {
  const [showAllPosts, setShowAllPosts] = useState(false);
  const [cropPositions, setCropPositions] = useState<Record<string, { x: number; y: number }>>({});
  const [imageOverrides, setImageOverrides] = useState<Record<string, ProjectImage[]>>({});
  const [analyzedCaptions, setAnalyzedCaptions] = useState<Record<string, { caption: string; hashtags: string }>>(
    () => loadCachedCaptions(projectId)
  );
  const [analyzingSlot, setAnalyzingSlot] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const hasGenerated = useRef(false);

  const slots = useMemo(
    () => generatePostSlots(images, tone, businessType),
    [images, tone, businessType]
  );

  const totalDays = useMemo(() => {
    if (slots.length === 0) return 1;
    return Math.max(...slots.map((s) => s.dayOffset)) + 1;
  }, [slots]);

  const visibleSlots = showAllPosts ? slots : slots.slice(0, 6);
  const formatRatio = "4/5";

  const baseDate = new Date(
    Date.now() + (slots[0]?.dayOffset ?? 0) * 86400000
  );

  // Persist captions whenever they change
  useEffect(() => {
    if (projectId && Object.keys(analyzedCaptions).length > 0) {
      saveCachedCaptions(projectId, analyzedCaptions);
    }
  }, [analyzedCaptions, projectId]);

  // Generate captions for missing slots only (skip if already cached)
  useEffect(() => {
    if (analyzingSlot || slots.length === 0) return;

    // Skip if we already generated captions this session
    if (hasGenerated.current) return;

    // Check which slots still need captions
    const missing = slots.filter((slot) => !analyzedCaptions[slot.id]);
    if (missing.length === 0) {
      hasGenerated.current = true;
      return;
    }

    const controller = new AbortController();
    abortRef.current = controller;
    const previousCaptions: string[] = [];

    (async () => {
      for (const slot of slots) {
        if (controller.signal.aborted) break;

        // Skip if already cached
        if (analyzedCaptions[slot.id]) continue;

        setAnalyzingSlot(slot.id);

        try {
          const effectiveImages =
            imageOverrides[slot.id]?.length > 0
              ? imageOverrides[slot.id]
              : slot.images;

          const result = await analyzePostSlot(
            slot,
            effectiveImages,
            tone,
            businessType,
            undefined,
            previousCaptions,
            slots.indexOf(slot),
            controller.signal
          );
          const captionData = { caption: result.caption, hashtags: result.hashtags };

          const retoned = await regenerateCaptionForTone(
            result.summary,
            tone,
            businessType,
            undefined,
            previousCaptions,
            slots.indexOf(slot),
            controller.signal
          );
          const finalCaption = retoned?.caption || captionData.caption;

          previousCaptions.push(finalCaption);
          if (previousCaptions.length > 8) previousCaptions.shift();

          setAnalyzedCaptions((prev) => ({
            ...prev,
            [slot.id]: { caption: finalCaption, hashtags: captionData.hashtags },
          }));
        } catch (err: unknown) {
          if (err instanceof DOMException && err.name === "AbortError") break;
          // Keep trying other slots
        }
      }
      setAnalyzingSlot(null);
      hasGenerated.current = true;
    })();

    return () => controller.abort();
    // imageOverrides excluded intentionally to avoid re-trigger on image swap
    // analyzedCaptions excluded intentionally — we check it upfront
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slots, tone, businessType]);

  // Notify parent about plan changes
  useEffect(() => {
    if (!onPlanChange) return;
    const posts: PlannedPost[] = slots.map((slot) => {
      const cap = analyzedCaptions[slot.id];
      return {
        id: slot.id,
        scheduledAt: new Date(
          Date.now() + slot.dayOffset * 86400000
        ).toISOString(),
        type: slot.type,
        images: slot.images,
        caption: cap?.caption || slot.caption,
        hashtags: cap?.hashtags || slot.hashtags,
        mentions: [],
        description: slot.description,
      };
    });
    onPlanChange(posts);
  }, [slots, analyzedCaptions, onPlanChange]);

  return (
    <div className="posting-plan">
      <h2>Postingplan</h2>

      <div className="calendar-header-row">
        <div className="calendar-month">
          {calendarMonthLabel(baseDate, dateAtOffset(baseDate, totalDays - 1))}
        </div>
        <div className="calendar-day-labels">
          {Array.from({ length: Math.min(totalDays, 14) }, (_, d) => {
            const label = calendarDayLabel(dateAtOffset(baseDate, d));
            return (
              <div key={d} className="calendar-day-label">
                <span className="day-name">{label.weekday}</span>
                <span className="day-number">{label.day}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="plan-container">
        {visibleSlots.map((slot) => {
          const effectiveImages =
            imageOverrides[slot.id]?.length > 0
              ? imageOverrides[slot.id]
              : slot.images;
          const currentImg = effectiveImages[0];
          const dayLabel = formatDate(baseDate, slot.dayOffset);

          const cap = analyzedCaptions[slot.id];
          const displayCaption = cap?.caption || slot.caption;
          const displayHashtags = cap?.hashtags || slot.hashtags;

          const objectPos = cropPositions[slot.id]
            ? `${cropPositions[slot.id].x}% ${cropPositions[slot.id].y}%`
            : "50% 50%";

          return (
            <div
              key={slot.id}
              className={`plan-slot ${analyzingSlot === slot.id ? "is-analyzing" : ""}`}
            >
              <div className="slot-header-row">
                <div className="slot-label">
                  <span className="slot-type-badge">{slot.type.toUpperCase()}</span>
                  <span className="slot-day">{dayLabel}</span>
                  <span className="slot-time">{slot.time}</span>
                </div>
                <div className="slot-format">{getFormat(slot.type)}</div>
              </div>

              <div className="slot-description">{slot.description}</div>

              {currentImg && (
                <div className="slot-preview-column">
                  <div
                    className="slot-thumb"
                    onMouseDown={(e) => {
                      const rect = (e.target as HTMLElement).closest(".slot-thumb")?.getBoundingClientRect();
                      if (!rect) return;
                      const startX = e.clientX;
                      const startY = e.clientY;
                      const startPos = cropPositions[slot.id] ?? { x: 50, y: 50 };
                      const onMove = (ev: MouseEvent) => {
                        const dx = ((ev.clientX - startX) / rect.width) * 100;
                        const dy = ((ev.clientY - startY) / rect.height) * 100;
                        setCropPositions({
                          ...cropPositions,
                          [slot.id]: {
                            x: Math.max(0, Math.min(100, startPos.x + dx)),
                            y: Math.max(0, Math.min(100, startPos.y + dy)),
                          },
                        });
                      };
                      const onUp = () => {
                        window.removeEventListener("mousemove", onMove);
                        window.removeEventListener("mouseup", onUp);
                      };
                      window.addEventListener("mousemove", onMove);
                      window.addEventListener("mouseup", onUp);
                    }}
                    style={{
                      aspectRatio: formatRatio,
                      backgroundImage: `url(${currentImg?.thumbnailUrl || ""})`,
                      backgroundSize: "cover",
                      backgroundPosition: objectPos,
                      borderRadius: 10,
                      border: "2px solid var(--accent)",
                      cursor: "grab",
                      maxWidth: 260,
                    }}
                  />
                  <div className="meta" style={{ marginTop: 14 }}>
                    Bild tauschen
                  </div>
                  <div className="image-swap-strip">
                    {images.slice(0, 20).map((img) => {
                      const isActive = effectiveImages.some(
                        (ei) => ei.id === img.id
                      );
                      return (
                        <button
                          className={`image-swap-thumb ${isActive ? "is-selected" : ""}`}
                          key={img.id}
                          onClick={() => {
                            const next = effectiveImages.map((ei) =>
                              ei.id === effectiveImages[0]?.id ? img : ei
                            );
                            if (!isActive) {
                              setImageOverrides({
                                ...imageOverrides,
                                [slot.id]: next,
                              });
                            }
                          }}
                          style={{ backgroundImage: `url(${img.thumbnailUrl})` }}
                          title={img.name}
                          type="button"
                        />
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="slot-caption-area">
                <div className="slot-caption-text">{displayCaption}</div>
                <div className="slot-hashtags">{displayHashtags}</div>
              </div>
            </div>
          );
        })}
      </div>

      {!showAllPosts && visibleSlots.length > 6 ? (
        <button
          className="show-more-button show-more-posts"
          onClick={() => setShowAllPosts(true)}
          type="button"
        >
          + {slots.length - 6} weitere Posts anzeigen
        </button>
      ) : visibleSlots.length > 6 ? (
        <button
          className="show-more-button show-more-posts"
          onClick={() => setShowAllPosts(false)}
          type="button"
        >
          Weniger Posts anzeigen
        </button>
      ) : null}

      <div className="plan-notes">
        <p>
          📊 <strong>{visibleSlots.length} Posts</strong> über {totalDays}{" "}
          {totalDays === 1 ? "Tag" : "Tage"}
          {" · "}
          {visibleSlots.filter((s) => s.type === "reel").length} Reels{" · "}
          {visibleSlots.filter((s) => s.type === "carousel").length} Carousels{" · "}
          {visibleSlots.filter((s) => s.type === "single").length} Einzelbilder{" · "}
          {visibleSlots.filter((s) => s.type === "story").length} Stories
        </p>
        <p className="helper">
          Formate automatisch: Reels/Stories 9:16 · Carousel & Einzelbild 4:5.
          Carousel durch Pfeile durchklickbar.
        </p>
      </div>
    </div>
  );
}


