// EXIF-based image grouping for WeddingFlow
// Detects which photos belong to the same event based on capture date

export type ImageDateInfo = {
  name: string;
  dateTaken: string | null; // ISO date
  source: "exif" | "filename" | "none";
};

/**
 * Parse EXIF date from a JPEG file. Falls back to filename heuristics.
 */
export async function extractImageDate(file: File): Promise<ImageDateInfo> {
  // Try EXIF first
  try {
    const ExifReader = await import("exifreader");
    const tags = await ExifReader.load(file);

    // Try various EXIF date tags
    const dateStr =
      tags.DateTimeOriginal?.description ||
      tags.DateTimeDigitized?.description ||
      tags.DateTime?.description;

    if (dateStr) {
      // EXIF format: "2026:06:14 15:30:00"
      const normalized = dateStr.replace(/^(\d{4}):(\d{2}):(\d{2})/, "$1-$2-$3");
      return { name: file.name, dateTaken: normalized, source: "exif" };
    }
  } catch {
    // EXIF parsing failed, fall through to filename heuristics
  }

  // Try filename heuristics (e.g., "IMG_20260614_153000.jpg" or "2026-06-14-wedding.jpg")
  const dateMatch = file.name.match(/(\d{4})[-_]?(\d{2})[-_]?(\d{2})/);
  if (dateMatch) {
    return {
      name: file.name,
      dateTaken: `${dateMatch[1]}-${dateMatch[2]}-${dateMatch[3]}`,
      source: "filename"
    };
  }

  return { name: file.name, dateTaken: null, source: "none" };
}

/**
 * Analyze a batch of files and detect date clusters.
 * Returns the dominant date (most common) and any outliers.
 */
export function analyzeDateClusters(dates: ImageDateInfo[]): {
  dominantDate: string | null;
  dateGroups: Map<string, string[]>;
  hasMixedEvents: boolean;
} {
  const dateGroups = new Map<string, string[]>();

  for (const info of dates) {
    if (info.dateTaken) {
      const date = info.dateTaken.split("T")[0]; // Just the date part
      const existing = dateGroups.get(date) ?? [];
      existing.push(info.name);
      dateGroups.set(date, existing);
    }
  }

  // Find dominant date
  let dominantDate: string | null = null;
  let maxCount = 0;
  for (const [date, files] of dateGroups) {
    if (files.length > maxCount) {
      maxCount = files.length;
      dominantDate = date;
    }
  }

  const hasMixedEvents = dateGroups.size > 1;

  return { dominantDate, dateGroups, hasMixedEvents };
}

/**
 * Format a date string for display in German locale
 */
export function formatCaptureDate(isoDate: string | null): string {
  if (!isoDate) return "Unbekannt";
  try {
    return new Intl.DateTimeFormat("de-AT", {
      day: "2-digit",
      month: "long",
      year: "numeric"
    }).format(new Date(isoDate));
  } catch {
    return isoDate;
  }
}
