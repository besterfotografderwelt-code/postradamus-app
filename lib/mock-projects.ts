import type { WeddingProject } from "@/lib/types";

export const seedProjects: WeddingProject[] = [
  {
    id: "wf-001",
    businessType: "hochzeitsfotograf",
    coupleName: "Mara & David",
    weddingDate: "2026-05-18",
    location: "Bregenz, Vorarlberg",
    style: "Elegant, emotional, modern",
    specialNotes: "Golden hour portraits by the lake",
    tone: "Warm, premium, storytelling",
    language: "DE",
    imageCount: 1240,
    uploadedImageCount: 0,
    internalNotes: "Sneak Peek innerhalb von 48h nötig.",
    stage: "sneak-peek",
    favoriteCount: 38,
    tagCount: 6,
    createdAt: "2026-06-12T08:15:00.000Z"
  },
  {
    id: "wf-002",
    businessType: "hochzeitsfotograf",
    coupleName: "Lina & Tobias",
    weddingDate: "2026-06-01",
    location: "St. Gallen, Schweiz",
    style: "Editorial with a relaxed party finish",
    specialNotes: "Ceremony in the garden, party in the barn",
    tone: "Personal, elegant, clear",
    language: "EN",
    imageCount: 860,
    uploadedImageCount: 0,
    internalNotes: "Blogartikel und Dankesmail noch offen.",
    stage: "copy",
    favoriteCount: 24,
    tagCount: 5,
    createdAt: "2026-06-10T16:40:00.000Z"
  },
  {
    id: "wf-003",
    businessType: "hochzeitsfotograf",
    coupleName: "Sophie & Leon",
    weddingDate: "2026-06-20",
    location: "Lustenau, Austria",
    style: "Classic, bright, candid",
    specialNotes: "Family-heavy day, many group shots",
    tone: "Calm, optimistic, polished",
    language: "DE",
    imageCount: 530,
    uploadedImageCount: 0,
    internalNotes: "Warte auf Vorauswahl der Bilder.",
    stage: "selection",
    favoriteCount: 15,
    tagCount: 4,
    createdAt: "2026-06-13T10:00:00.000Z"
  }
];
