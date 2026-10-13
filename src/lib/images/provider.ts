import type { Category, Discovery } from "../types";

export interface ResolvedImage {
  src: string;
  srcSet?: string;
  alt: string;
  fallbackSrc: string;
  attribution?: { credit?: string; license?: string; licenseUrl?: string; sourcePageUrl?: string };
}

/** Swap this implementation to change where images come from without touching UI components. */
export interface ImageProvider {
  resolve(discovery: Pick<Discovery, "image" | "category" | "title">): ResolvedImage;
}

export const fallbackImageFor = (category: Category) => `/fallbacks/${category}.svg`;

// Wikimedia serves pre-rendered thumbnails at these standard widths.
const WIKIMEDIA_WIDTHS = [500, 960, 1280];
const WIKIMEDIA_THUMB = /^(https:\/\/upload\.wikimedia\.org\/wikipedia\/commons\/thumb\/.+\/)(\d+)px-([^/]+)$/;

function wikimediaSrcSet(url: string): string | undefined {
  const match = url.match(WIKIMEDIA_THUMB);
  if (!match) return undefined;
  const [, prefix, width, name] = match;
  const max = Number(width);
  return WIKIMEDIA_WIDTHS.filter((w) => w <= max)
    .map((w) => `${prefix}${w}px-${name} ${w}w`)
    .join(", ");
}

/** Uses curated, licence-checked image URLs stored with each discovery; no API key required. */
export const curatedImageProvider: ImageProvider = {
  resolve(discovery) {
    const fallbackSrc = fallbackImageFor(discovery.category);
    const image = discovery.image;
    if (!image?.url) return { src: fallbackSrc, alt: "", fallbackSrc };
    return {
      src: image.url,
      srcSet: wikimediaSrcSet(image.url),
      alt: image.alt || discovery.title,
      fallbackSrc,
      attribution: {
        credit: image.credit,
        license: image.license,
        licenseUrl: image.licenseUrl,
        sourcePageUrl: image.sourcePageUrl,
      },
    };
  },
};

export const imageProvider: ImageProvider = curatedImageProvider;
