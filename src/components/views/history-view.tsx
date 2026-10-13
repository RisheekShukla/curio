"use client";

import { History, MessageCircle } from "lucide-react";
import Link from "next/link";
import { discoveryHref } from "@/components/discovery-card";
import { DiscoveryImage } from "@/components/discovery-image";
import { useApiResource } from "@/components/hooks";
import { useCurio } from "@/components/providers/curio-provider";
import { EmptyState, ErrorState, PageHeader, Skeleton } from "@/components/ui/states";
import { CATEGORY_LABELS, type Discovery } from "@/lib/types";
import { timeAgo } from "@/lib/utils";

function Row({ discovery, href, meta, icon }: { discovery: Discovery; href: string; meta: string; icon?: React.ReactNode }) {
  return (
    <li>
      <Link href={href} className="flex items-center gap-4 rounded-2xl p-2 transition-colors hover:bg-muted">
        <div className="size-16 shrink-0 overflow-hidden rounded-xl">
          <DiscoveryImage discovery={discovery} sizes="64px" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs uppercase tracking-[0.14em] text-accent">{CATEGORY_LABELS[discovery.category]}</p>
          <p className="truncate font-serif text-lg">{discovery.title}</p>
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            {icon}
            {meta}
          </p>
        </div>
      </Link>
    </li>
  );
}

export function HistoryView() {
  const { api } = useCurio();
  const { data, error, reload } = useApiResource(api, (a) => a.getHistory(), "We couldn't load your history.");

  return (
    <div className="mx-auto w-full max-w-3xl">
      <PageHeader title="History" subtitle="Pick up where you left off." />
      {error && <ErrorState message={error} onRetry={reload} />}
      {!data && !error && (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
      )}
      {data && data.conversations.length === 0 && data.recentlyViewed.length === 0 && (
        <EmptyState icon={<History className="size-6" aria-hidden />} title="No history yet">
          Discoveries you open and conversations you start will appear here.
        </EmptyState>
      )}
      {data && (data.conversations.length > 0 || data.recentlyViewed.length > 0) && (
        <div className="space-y-10">
          {data.conversations.length > 0 && (
            <section aria-labelledby="history-conversations">
              <h2 id="history-conversations" className="mb-3 text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
                Conversations
              </h2>
              <ul className="space-y-1">
                {data.conversations.map(({ conversation, discovery }) => (
                  <Row
                    key={conversation.id}
                    discovery={discovery}
                    href={discoveryHref(discovery.slug, { c: conversation.id })}
                    meta={`Continued ${timeAgo(conversation.updatedAt)}`}
                    icon={<MessageCircle className="size-3.5" aria-hidden />}
                  />
                ))}
              </ul>
            </section>
          )}
          {data.recentlyViewed.length > 0 && (
            <section aria-labelledby="history-viewed">
              <h2 id="history-viewed" className="mb-3 text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
                Recently viewed
              </h2>
              <ul className="space-y-1">
                {data.recentlyViewed.map(({ discovery, at }) => (
                  <Row key={discovery.id} discovery={discovery} href={discoveryHref(discovery.slug)} meta={`Viewed ${timeAgo(at)}`} />
                ))}
              </ul>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
