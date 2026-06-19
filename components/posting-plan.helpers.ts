import type { ProjectImage } from "@/lib/types";
import type { PostSlot } from "./posting-plan.types";

export function getFormat(type: PostSlot["type"]): string {
  if (type === "reel" || type === "story") return "9/16";
  return "4/5";
}

export function formatDate(baseDate: Date, offset: number): string {
  const d = new Date(baseDate);
  d.setDate(d.getDate() + offset);
  return new Intl.DateTimeFormat("de-AT", {
    weekday: "short",
    day: "2-digit",
    month: "long",
  }).format(d);
}

export function dateAtOffset(baseDate: Date, offset: number): Date {
  const date = new Date(baseDate);
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() + offset);
  return date;
}

export function calendarDayLabel(date: Date): { weekday: string; day: string } {
  return {
    weekday: new Intl.DateTimeFormat("de-AT", { weekday: "short" })
      .format(date)
      .replace(".", ""),
    day: new Intl.DateTimeFormat("de-AT", { day: "2-digit" }).format(date),
  };
}

export function calendarMonthLabel(start: Date, end: Date): string {
  const startMonth = new Intl.DateTimeFormat("de-AT", { month: "long" }).format(start);
  const endMonth = new Intl.DateTimeFormat("de-AT", { month: "long" }).format(end);
  const year = end.getFullYear();
  return startMonth === endMonth
    ? `${startMonth} ${year}`
    : `${startMonth} – ${endMonth} ${year}`;
}

export function timeToCalendarPosition(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  const value = hours + minutes / 60;
  return Math.max(0, Math.min(100, ((value - 7) / 14) * 100));
}

export function getOptimalTime(dayOffset: number): string {
  const day = (new Date().getDay() + dayOffset) % 7;
  if (day === 0) return "10:00";
  if (day === 6) return "09:00";
  return ["08:00", "13:00", "19:30"][dayOffset % 3];
}

export function normalizeTone(tone: string): string {
  return tone.trim().toLowerCase();
}

export function imagePriorityScore(img: ProjectImage): number {
  const tags = img.tags ?? [];
  let score = img.isFavorite ? 1000 : 0;

  if (tags.includes("Trauung")) score += 120;
  if (tags.includes("Paarshooting")) score += 110;
  if (tags.includes("Getting Ready")) score += 100;
  if (tags.includes("Party")) score += 90;
  if (tags.includes("Details")) score += 80;
  if (tags.includes("Dinner")) score += 70;
  if (tags.includes("Gruppenbilder")) score += 60;
  if (tags.includes("Location")) score += 40;
  if (tags.includes("Portrait")) score += 30;
  if (tags.includes("Emotionen")) score += 50;

  return score;
}

export function slotAnalysisKey(
  slot: PostSlot,
  images: ProjectImage[],
  effectiveTone: string,
  businessType: string
) {
  return [
    slot.id,
    slot.type,
    effectiveTone || "authentisch",
    businessType || "sonstiges",
    ...images.map((image) => `${image.id}:${image.name}`),
  ].join("|");
}
