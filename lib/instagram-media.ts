import { randomUUID } from "crypto";
import sharp from "sharp";
import { uploadToWebspace } from "@/lib/ftp-upload";

export type InstagramPostType = "feed" | "carousel" | "story" | "reel";
export type CropPosition = { x: number; y: number };

const imageFormats: Record<Exclude<InstagramPostType, "reel">, { width: number; height: number; label: string }> = {
  feed: { width: 1080, height: 1350, label: "feed-4x5" },
  carousel: { width: 1080, height: 1350, label: "carousel-4x5" },
  story: { width: 1080, height: 1920, label: "story-9x16" }
};

export function getExtension(file: File) {
  const original = file.name.split(".").pop()?.toLowerCase();
  if (original && /^[a-z0-9]{2,5}$/.test(original)) return original;
  if (file.type === "video/mp4") return "mp4";
  if (file.type === "video/quicktime") return "mov";
  if (file.type === "image/png") return "png";
  return "jpg";
}

export function isFile(value: FormDataEntryValue | undefined): value is File {
  return value instanceof File;
}

export function clampCropPercent(value: unknown) {
  const numeric = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numeric)) return 50;
  return Math.max(0, Math.min(100, numeric));
}

export function parseCropPosition(form: FormData): CropPosition {
  return {
    x: clampCropPercent(form.get("cropX")),
    y: clampCropPercent(form.get("cropY"))
  };
}

function getTargetImageFormat(postType: InstagramPostType | undefined) {
  if (postType === "story") return imageFormats.story;
  if (postType === "carousel") return imageFormats.carousel;
  return imageFormats.feed;
}

function calculateCoverCrop(source: { width: number; height: number }, target: { width: number; height: number }, cropPosition: CropPosition) {
  const sourceRatio = source.width / source.height;
  const targetRatio = target.width / target.height;

  if (sourceRatio > targetRatio) {
    const width = Math.max(1, Math.round(source.height * targetRatio));
    const left = Math.round((source.width - width) * (cropPosition.x / 100));
    return {
      left: Math.max(0, Math.min(source.width - width, left)),
      top: 0,
      width,
      height: source.height
    };
  }

  const height = Math.max(1, Math.round(source.width / targetRatio));
  const top = Math.round((source.height - height) * (cropPosition.y / 100));
  return {
    left: 0,
    top: Math.max(0, Math.min(source.height - height, top)),
    width: source.width,
    height
  };
}

export async function prepareInstagramImage(buffer: Buffer, postType: InstagramPostType | undefined, cropPosition: CropPosition = { x: 50, y: 50 }) {
  const format = getTargetImageFormat(postType);
  const normalized = await sharp(buffer, { failOn: "none" })
    .rotate()
    .flatten({ background: "#ffffff" })
    .toBuffer({ resolveWithObject: true });

  const crop = calculateCoverCrop(
    { width: normalized.info.width, height: normalized.info.height },
    { width: format.width, height: format.height },
    cropPosition
  );

  const output = await sharp(normalized.data)
    .extract(crop)
    .resize(format.width, format.height, { fit: "fill" })
    .jpeg({ quality: 92, mozjpeg: true })
    .toBuffer();

  return { buffer: output, format };
}

export async function fetchImageUrl(url: string) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Bild konnte nicht geladen werden: ${url}`);
  }
  return Buffer.from(await response.arrayBuffer());
}

export async function uploadPreparedImage(buffer: Buffer, postType: InstagramPostType | undefined, cropPosition: CropPosition, index: number, prefix = "") {
  const prepared = await prepareInstagramImage(buffer, postType, cropPosition);
  const filename = `wf_${randomUUID()}${prefix}_${index + 1}_${prepared.format.label}.jpg`;
  const publicUrl = await uploadToWebspace(prepared.buffer, filename);
  return { filename, publicUrl };
}
