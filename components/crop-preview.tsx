"use client";

import Image from "next/image";
import type { ProjectImage } from "@/lib/types";

type CropPreviewProps = {
  images: ProjectImage[];
};

type Format = {
  key: string;
  label: string;
  aspect: string;
  width: number;
  height: number;
};

const formats: Format[] = [
  { key: "square", label: "1:1", aspect: "1/1", width: 240, height: 240 },
  { key: "portrait", label: "4:5", aspect: "4/5", width: 240, height: 300 },
  { key: "story", label: "9:16", aspect: "9/16", width: 200, height: 356 },
];

export function CropPreview({ images }: CropPreviewProps) {
  if (images.length === 0) return null;

  const previewImages = images.slice(0, 3);

  return (
    <div className="crop-preview">
      <h3>Bildbeschnitt</h3>
      <p className="helper">
        Deine Bilder werden automatisch zentriert beschnitten. Eine KI-Gesichtserkennung
        folgt in Kürze – damit Köpfe und wichtige Motive nie abgeschnitten werden.
      </p>

      {previewImages.map((img) => (
        <div className="crop-row" key={img.id}>
          <span className="crop-filename">{img.name}</span>
          <div className="crop-formats">
            {formats.map((fmt) => (
              <div className="crop-format" key={fmt.key}>
                <div
                  className="crop-frame"
                  style={{ aspectRatio: fmt.aspect, width: fmt.width }}
                >
                  <Image
                    alt={`${img.name} in ${fmt.label}`}
                    className="crop-image"
                    fill
                    sizes={`${fmt.width}px`}
                    src={img.thumbnailUrl}
                    style={{ objectFit: "cover", objectPosition: "center" }}
                    unoptimized
                  />
                </div>
                <span>{fmt.label}</span>
              </div>
            ))}
          </div>
        </div>
      ))}

      <div className="crop-tip">
        💡 <strong>Tipp:</strong> Für Instagram optimale Formate: Einzelbild & Carousel in
        4:5, Reels & Stories in 9:16. Deine Originale bleiben unverändert.
      </div>
    </div>
  );
}
