"use client";

import Image from "next/image";
import type { ProjectImage, WeddingProject } from "@/lib/types";

type InstagramPreviewProps = {
  project: WeddingProject;
  favoriteImage: ProjectImage | undefined;
  caption: string;
};

export function InstagramPreview({ project, favoriteImage, caption }: InstagramPreviewProps) {
  const displayName = project.coupleName || "Fotoprojekt";
  const location = project.location || "";

  return (
    <div className="ig-preview">
      <div className="ig-preview-header">
        <div className="ig-preview-avatar" />
        <div className="ig-preview-user">
          <strong>{displayName}</strong>
          {location ? <span>{location}</span> : null}
        </div>
      </div>

      <div className="ig-preview-image">
        {favoriteImage ? (
          <Image
            alt="Vorschaubild"
            fill
            src={favoriteImage.thumbnailUrl}
            style={{ objectFit: "cover" }}
            unoptimized
          />
        ) : (
          <div className="ig-preview-placeholder">
            <span>Dein bestes Bild</span>
          </div>
        )}
      </div>

      <div className="ig-preview-actions">
        <div className="ig-preview-icons">
          <span>♡</span>
          <span>💬</span>
          <span>✈</span>
        </div>
        <div className="ig-preview-likes">12 Gefällt-mal-Angaben</div>
      </div>

      <div className="ig-preview-caption">
        <strong>{displayName}</strong>{" "}
        {caption.length > 200 ? `${caption.slice(0, 200)}…` : caption}
      </div>

      <div className="ig-preview-date">
        {new Intl.DateTimeFormat("de-AT", {
          day: "2-digit",
          month: "long"
        }).format(new Date())}
      </div>
    </div>
  );
}
