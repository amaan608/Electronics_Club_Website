import Image from "next/image";

const CLOUDINARY = "https://res.cloudinary.com/";
// Adds a Cloudinary transformation (format, quality and crop) right after /image/upload/.
export function cloudinary(url: string, transform: string) {
  return url.startsWith(CLOUDINARY) ? url.replace("/image/upload/", `/image/upload/${transform}/`) : url;
}

// Cloudinary images are served from Cloudinary's CDN at 1x and 2x; bundled /art/ images use next/image.
export function ClubImage({
  src,
  alt,
  width,
  height,
  crop = "c_fill,g_auto",
  className,
  priority = false,
}: {
  src: string;
  alt: string;
  width: number;
  height: number;
  crop?: string;
  className?: string;
  priority?: boolean;
}) {
  if (!src.startsWith(CLOUDINARY))
    return <Image src={src} alt={alt} width={width} height={height} className={className} priority={priority} />;
  const at = (scale: number) => cloudinary(src, `${crop},w_${width * scale},h_${height * scale},f_auto,q_auto`);
  return (
    // eslint-disable-next-line @next/next/no-img-element -- Cloudinary already resizes and optimizes.
    <img
      src={at(1)}
      srcSet={`${at(1)} 1x, ${at(2)} 2x`}
      alt={alt}
      width={width}
      height={height}
      className={className}
      loading={priority ? "eager" : "lazy"}
      decoding="async"
    />
  );
}

export function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts.length > 1 ? parts[parts.length - 1][0] : parts[0]?.[1] ?? "")).toUpperCase();
}
