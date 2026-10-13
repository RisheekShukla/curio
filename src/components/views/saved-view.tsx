"use client";

import { Bookmark, BookmarkX, Lightbulb } from "lucide-react";
import Link from "next/link";
import { discoveryHref } from "@/components/discovery-card";
import { DiscoveryImage } from "@/components/discovery-image";
import { useApiResource } from "@/components/hooks";
import { useCurio } from "@/components/providers/curio-provider";
import { RichText } from "@/components/rich-text";
import { Button } from "@/components/ui/button";
import { EmptyState, ErrorState, PageHeader, Skeleton } from "@/components/ui/states";
import { CATEGORY_LABELS } from "@/lib/types";
import { timeAgo } from "@/lib/utils";

export function SavedView() {
  const { api, mode } = useCurio();
  const { data, error, setData, reload } = useApiResource(api, (a) => a.getSaved(), "We couldn't load your saved items.");

  const unsave = async (id: string) => {
    if (!api || !data) return;
    const removed = data.discoveries.find((d) => d.discovery.id === id);
    setData((d) => ({ ...d, discoveries: d.discoveries.filter((x) => x.discovery.id !== id) }));
    try {
      await api.setSaved(id, false);
    } catch {
      if (removed) setData((d) => ({ ...d, discoveries: [...d.discoveries, removed].sort((a, b) => b.savedAt - a.savedAt) }));
    }
  };

  const unpin = async (messageId: string) => {
    if (!api || !data) return;
    const removed = data.insights.find((i) => i.message.id === messageId);
    setData((d) => ({ ...d, insights: d.insights.filter((i) => i.message.id !== messageId) }));
    try {
      await api.setPinned(messageId, false);
    } catch {
      if (removed) setData((d) => ({ ...d, insights: [removed, ...d.insights] }));
    }
  };

  return (
    <div className="mx-auto w-full max-w-4xl">
      <PageHeader
        title="Saved"
        subtitle={mode === "demo" ? "Stored only in this browser while in demo mode." : "Discoveries and insights you've kept."}
      />
      {error && <ErrorState message={error} onRetry={reload} />}
      {!data && !error && (
        <div className="grid gap-5 sm:grid-cols-2">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-64" />
          ))}
        </div>
      )}
      {data && (
        <div className="space-y-12">
          <section aria-labelledby="saved-discoveries">
            <h2 id="saved-discoveries" className="mb-4 text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
              Discoveries
            </h2>
            {data.discoveries.length === 0 ? (
              <EmptyState icon={<Bookmark className="size-6" aria-hidden />} title="Nothing saved yet">
                Tap the bookmark on any discovery to keep it here.
              </EmptyState>
            ) : (
              <ul className="grid gap-5 sm:grid-cols-2">
                {data.discoveries.map(({ discovery, savedAt }) => (
                  <li key={discovery.id} className="group overflow-hidden rounded-3xl border border-border bg-card" data-testid="saved-item">
                    <Link href={discoveryHref(discovery.slug)} className="block">
                      <div className="aspect-[16/9] overflow-hidden">
                        <DiscoveryImage discovery={discovery} sizes="(min-width: 640px) 420px, 100vw" />
                      </div>
                      <div className="p-5 pb-2">
                        <p className="text-xs font-medium uppercase tracking-[0.14em] text-accent">{CATEGORY_LABELS[discovery.category]}</p>
                        <h3 className="mt-1 font-serif text-xl leading-snug group-hover:underline group-hover:underline-offset-4">
                          {discovery.title}
                        </h3>
                      </div>
                    </Link>
                    <div className="flex items-center justify-between px-5 pb-4">
                      <span className="text-xs text-muted-foreground">Saved {timeAgo(savedAt)}</span>
                      <Button variant="ghost" size="sm" onClick={() => unsave(discovery.id)}>
                        <BookmarkX className="size-4" aria-hidden /> Remove
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section aria-labelledby="saved-insights">
            <h2 id="saved-insights" className="mb-4 text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
              Insights from conversations
            </h2>
            {data.insights.length === 0 ? (
              <EmptyState icon={<Lightbulb className="size-6" aria-hidden />} title="No saved insights">
                In a conversation, choose &ldquo;Save insight&rdquo; on an answer you want to keep.
              </EmptyState>
            ) : (
              <ul className="space-y-4">
                {data.insights.map(({ message, conversation, discovery }) => (
                  <li key={message.id} className="rounded-3xl border border-border bg-card p-5">
                    <Link
                      href={discoveryHref(discovery.slug, { c: conversation.id })}
                      className="font-serif text-lg hover:underline hover:underline-offset-4"
                    >
                      {discovery.title}
                    </Link>
                    <div className="mt-2 line-clamp-6 text-sm leading-relaxed text-foreground/85">
                      <RichText text={message.content} />
                    </div>
                    <div className="mt-3 flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">
                        {timeAgo(message.createdAt)}
                        {message.isMock && " · demo response"}
                      </span>
                      <Button variant="ghost" size="sm" onClick={() => unpin(message.id)}>
                        Remove
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
