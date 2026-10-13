import type { Metadata } from "next";
import { Suspense } from "react";
import { DiscoveryView } from "@/components/views/discovery-view";
import { SEED_DISCOVERIES } from "@/lib/content/seed-discoveries";

type Params = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const seed = SEED_DISCOVERIES.find((d) => d.slug === slug);
  return seed ? { title: seed.title, description: seed.summary.slice(0, 160) } : { title: "Discovery" };
}

export default async function DiscoveryPage({ params }: { params: Params }) {
  const { slug } = await params;
  return (
    <Suspense>
      <DiscoveryView key={slug} slug={slug} />
    </Suspense>
  );
}
