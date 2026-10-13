"use client";

/* eslint-disable @next/next/no-img-element -- remote images are served directly from their licensed source with a local fallback */
import { useState } from "react";
import { imageProvider } from "@/lib/images/provider";
import type { Discovery } from "@/lib/types";
import { cn } from "@/lib/utils";

export function DiscoveryImage({
  discovery,
  className,
  sizes = "(min-width: 768px) 640px, 100vw",
  priority = false,
}: {
  discovery: Pick<Discovery, "image" | "category" | "title">;
  className?: string;
  sizes?: string;
  priority?: boolean;
}) {
  const resolved = imageProvider.resolve(discovery);
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const failed = failedSrc === resolved.src;
  const src = failed ? resolved.fallbackSrc : resolved.src;

  return (
    <img
      // Images that finished loading before hydration never fire onLoad.
      ref={(el) => {
        if (el?.complete && el.naturalWidth > 0) el.dataset.loaded = "true";
      }}
      src={src}
      srcSet={failed ? undefined : resolved.srcSet}
      sizes={resolved.srcSet && !failed ? sizes : undefined}
      alt={failed ? "" : resolved.alt}
      loading={priority ? "eager" : "lazy"}
      decoding="async"
      referrerPolicy="no-referrer"
      onLoad={(e) => {
        e.currentTarget.dataset.loaded = "true";
      }}
      onError={() => setFailedSrc(resolved.src)}
      className={cn(
        "h-full w-full bg-muted object-cover opacity-0 transition-[opacity,transform] duration-500 ease-out data-[loaded=true]:opacity-100",
        className,
      )}
    />
  );
}

export function ImageCredit({ discovery, className }: { discovery: Pick<Discovery, "image" | "category" | "title">; className?: string }) {
  const attribution = imageProvider.resolve(discovery).attribution;
  if (!attribution) return null;
  const label = [attribution.credit, attribution.license].filter(Boolean).join(" · ");
  return (
    <p className={cn("truncate text-xs text-muted-foreground", className)}>
      Image:{" "}
      {attribution.sourcePageUrl ? (
        <a href={attribution.sourcePageUrl} target="_blank" rel="noopener noreferrer" className="underline-offset-2 hover:underline">
          {label || "source"}
        </a>
      ) : (
        label
      )}
    </p>
  );
}
