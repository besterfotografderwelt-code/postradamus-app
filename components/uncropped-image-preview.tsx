import Image from "next/image";

type UncroppedImagePreviewProps = {
  alt: string;
  className?: string;
  objectPosition?: string;
  src: string;
};

export function UncroppedImagePreview({
  alt,
  className = "",
  objectPosition = "center",
  src
}: UncroppedImagePreviewProps) {
  return (
    <span className={`uncropped-image-preview ${className}`.trim()}>
      <span
        aria-hidden="true"
        className="uncropped-image-preview-backdrop"
        style={{ backgroundImage: `url("${src}")` }}
      />
      <Image
        alt={alt}
        className="uncropped-image-preview-image"
        fill
        src={src}
        style={{ objectPosition }}
        unoptimized
      />
    </span>
  );
}
