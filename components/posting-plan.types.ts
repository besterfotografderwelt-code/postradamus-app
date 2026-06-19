import type { ProjectImage } from "@/lib/types";

export type PlannedPost = {
  id: string;
  scheduledAt: string;
  type: "single" | "carousel" | "reel" | "story";
  images: ProjectImage[];
  caption: string;
  hashtags: string;
  mentions: string[];
  description: string;
};

export type PostSlot = {
  id: string;
  dayOffset: number;
  time: string;
  type: "single" | "carousel" | "reel" | "story";
  images: ProjectImage[];
  description: string;
  caption: string;
  hashtags: string;
};

export type AnalyzedSlotContent = {
  key: string;
  caption: string;
  hashtags: string;
  summary: string;
  generator: "openai-vision" | "deepseek-metadata" | "metadata";
};

export type PostingPlanProps = {
  images: ProjectImage[];
  tone?: string;
  businessType?: string;
  projectId?: string;
  onPlanChange?: (posts: PlannedPost[]) => void;
};

export const MAX_ANALYSIS_IMAGES = 1;
