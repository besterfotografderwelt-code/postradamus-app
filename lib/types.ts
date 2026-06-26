export type ProjectStage =
  | "brief"
  | "selection"
  | "sneak-peek"
  | "copy"
  | "export";

export const projectImageTags = [
  "Getting Ready",
  "Trauung",
  "Paarshooting",
  "Gruppenbilder",
  "Dinner",
  "Party",
  "Details"
] as const;

export type ProjectImageTag = string;

export type ProjectImage = {
  id: string;
  projectId: string;
  name: string;
  originalUrl?: string;
  thumbnailUrl: string;
  isFavorite: boolean;
  tags: ProjectImageTag[];
  sortOrder: number;
  createdAt: string;
};

export type ProjectVideo = {
  id: string;
  projectId: string;
  name: string;
  videoUrl: string;       // Blob-URL für Vorschau/Upload
  thumbnailUrl: string;    // Standbild-Vorschau
  duration: number;        // Sekunden
  size: number;            // Bytes
  createdAt: string;
};

export const projectOutputTypes = [
  "blog",
  "instagram_caption",
  "hashtags",
  "reel_ideas",
  "gallery_description",
  "thank_you_email",
  "album_story"
] as const;

export type ProjectOutputType = (typeof projectOutputTypes)[number];

export type ProjectOutput = {
  id: string;
  projectId: string;
  type: ProjectOutputType;
  content: string;
  generator: "demo" | "openai";
  createdAt: string;
  updatedAt: string;
};

export const projectOutputTypeLabel: Record<ProjectOutputType, string> = {
  blog: "Blogartikel",
  instagram_caption: "Instagram-Caption",
  hashtags: "Hashtag-Set",
  reel_ideas: "Reel-Ideen",
  gallery_description: "Galeriebeschreibung",
  thank_you_email: "Dankesmail",
  album_story: "Album-Story"
};

export type WeddingProject = {
  id: string;
  businessType: string;
  coupleName: string;
  weddingDate: string;
  location: string;
  style: string;
  specialNotes: string;
  tone: string;
  language: "DE" | "EN";
  imageCount: number;
  uploadedImageCount: number;
  internalNotes?: string;
  stage: ProjectStage;
  favoriteCount: number;
  tagCount: number;
  createdAt: string;
};

export const projectStageLabel: Record<ProjectStage, string> = {
  brief: "Briefing",
  selection: "Bildauswahl",
  "sneak-peek": "Sneak-Peek",
  copy: "Textphase",
  export: "Fertig"
};
