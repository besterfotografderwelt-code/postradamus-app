import type { ProjectImage } from "@/lib/types";
import type { PostSlot, AnalyzedSlotContent } from "./posting-plan.types";
import { MAX_ANALYSIS_IMAGES } from "./posting-plan.types";

export async function analyzePostSlot(
  slot: PostSlot,
  images: ProjectImage[],
  tone: string,
  businessType: string,
  styleProfile?: string,
  previousCaptions: string[] = [],
  variationIndex = 0,
  signal?: AbortSignal
) {
  const formData = new FormData();
  await Promise.all(
    images.slice(0, MAX_ANALYSIS_IMAGES).map(async (image, index) => {
      const response = await fetch(image.thumbnailUrl);
      const blob = await response.blob();
      formData.append("images", blob, image.name || `image-${index + 1}.jpg`);
    })
  );
  formData.append(
    "metadata",
    JSON.stringify({
      businessType,
      tone: tone || "authentisch",
      slotId: slot.id,
      slotType: slot.type,
      slotDescription: slot.description,
      styleProfile: styleProfile || "",
      previousCaptions,
      variationIndex,
      includeCta: variationIndex % 3 === 2,
      images: images.map((image) => ({
        id: image.id,
        name: image.name,
        tags: image.tags,
        isFavorite: image.isFavorite,
      })),
    })
  );

  const response = await fetch("/api/analyze-post", {
    method: "POST",
    body: formData,
    signal: signal
      ? AbortSignal.any([signal, AbortSignal.timeout(30_000)])
      : AbortSignal.timeout(30_000),
  });
  const data = (await response.json()) as Partial<AnalyzedSlotContent> & {
    error?: string;
  };
  if (!response.ok || !data.caption || !data.hashtags) {
    throw new Error(data.error || "Bildanalyse fehlgeschlagen.");
  }
  return data as Omit<AnalyzedSlotContent, "key">;
}

export async function regenerateCaptionForTone(
  summary: string,
  tone: string,
  businessType: string,
  styleProfile?: string,
  previousCaptions: string[] = [],
  variationIndex = 0,
  signal?: AbortSignal
): Promise<{ caption: string; hashtags: string } | null> {
  const response = await fetch("/api/retone", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      summary,
      tone: tone || "authentisch",
      businessType,
      styleProfile,
      previousCaptions,
      variationIndex,
      includeCta: variationIndex % 3 === 2,
    }),
    signal: signal
      ? AbortSignal.any([signal, AbortSignal.timeout(12_000)])
      : AbortSignal.timeout(12_000),
  });
  if (!response.ok) return null;
  const data = (await response.json()) as { caption?: string; hashtags?: string };
  if (!data.caption) return null;
  return { caption: data.caption, hashtags: data.hashtags || "" };
}
