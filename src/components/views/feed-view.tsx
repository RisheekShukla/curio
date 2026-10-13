"use client";

import { Compass, Loader2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { DiscoveryCard } from "@/components/discovery-card";
import { useImpressionTracker } from "@/components/hooks";
import { useCurio } from "@/components/providers/curio-provider";
import { Button } from "@/components/ui/button";
import { EmptyState, ErrorState, PageHeader, Skeleton } from "@/components/ui/states";
import { errorMessage } from "@/lib/client/api-error";
import type { FeedItem } from "@/lib/types";

const PAGE_SIZE = 6;

type HiddenReason = "dismissed" | "negative";

function CardSkeleton() {
  return (
    <div className="overflow-hidden rounded-3xl border border-border bg-card">
      <Skeleton className="aspect-[16/10] rounded-none" />
      <div className="space-y-3 p-7">
        <Skeleton className="h-3 w-32" />
        <Skeleton className="h-7 w-3/4" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
      </div>
    </div>
  );
}

export function FeedView() {
  const { api } = useCurio();
  const [items, setItems] = useState<FeedItem[]>([]);
  const [hidden, setHidden] = useState<Record<string, HiddenReason>>({});
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [loadingMore, setLoadingMore] = useState(false);
  const [moreError, setMoreError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  const sentinel = useRef<HTMLDivElement>(null);
  const loadingRef = useRef(false);
  const observeRef = useImpressionTracker(api);

  const load = useCallback(
    async (reset: boolean) => {
      if (!api || loadingRef.current) return;
      loadingRef.current = true;
      if (!reset) setLoadingMore(true);
      try {
        const excludeIds = reset ? [] : items.map((i) => i.discovery.id);
        const page = await api.getFeed({ excludeIds, limit: PAGE_SIZE });
        setItems((prev) => (reset ? page.items : [...prev, ...page.items]));
        setHasMore(page.hasMore && page.items.length > 0);
        setStatus("ready");
        setMoreError(null);
      } catch (err) {
        if (reset) {
          setError(errorMessage(err, "We couldn't load your feed."));
          setStatus("error");
        } else {
          setMoreError(errorMessage(err, "We couldn't load more discoveries."));
        }
      } finally {
        loadingRef.current = false;
        setLoadingMore(false);
      }
    },
    [api, items],
  );

  const initialLoad = useRef(false);
  useEffect(() => {
    if (!api || initialLoad.current) return;
    initialLoad.current = true;
    void load(true);
  }, [api, load]);

  useEffect(() => {
    const el = sentinel.current;
    if (!el || status !== "ready" || !hasMore || moreError) return;
    const io = new IntersectionObserver((entries) => entries[0]?.isIntersecting && void load(false), {
      rootMargin: "600px 0px",
    });
    io.observe(el);
    return () => io.disconnect();
  }, [status, hasMore, load, moreError]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  const update = (id: string, patch: Partial<FeedItem>) =>
    setItems((prev) => prev.map((i) => (i.discovery.id === id ? { ...i, ...patch } : i)));

  const unhide = (id: string) =>
    setHidden((h) => Object.fromEntries(Object.entries(h).filter(([key]) => key !== id)));

  const actionsFor = (item: FeedItem) => ({
    onSave: async (saved: boolean) => {
      update(item.discovery.id, { saved });
      try {
        await api?.setSaved(item.discovery.id, saved);
        setToast(saved ? "Saved for later" : "Removed from saved");
      } catch (err) {
        update(item.discovery.id, { saved: !saved });
        setToast(errorMessage(err, "Couldn't update saved items."));
      }
    },
    onFeedback: async (type: "positive" | "negative") => {
      if (item.feedback === type) return;
      update(item.discovery.id, { feedback: type });
      if (type === "negative") setHidden((h) => ({ ...h, [item.discovery.id]: "negative" }));
      try {
        await api?.recordInteractions([{ discoveryId: item.discovery.id, type }]);
        if (type === "positive") setToast("Got it — more like this");
      } catch (err) {
        update(item.discovery.id, { feedback: item.feedback });
        unhide(item.discovery.id);
        setToast(errorMessage(err, "Couldn't record feedback."));
      }
    },
    onDismiss: async () => {
      setHidden((h) => ({ ...h, [item.discovery.id]: "dismissed" }));
      try {
        await api?.recordInteractions([{ discoveryId: item.discovery.id, type: "dismiss" }]);
      } catch (err) {
        unhide(item.discovery.id);
        setToast(errorMessage(err, "Couldn't hide that discovery."));
      }
    },
  });

  return (
    <div className="mx-auto w-full max-w-2xl">
      <PageHeader title="Discover" subtitle="A few things worth wondering about today." />

      {status === "loading" && (
        <div className="space-y-8" aria-busy="true" aria-label="Loading discoveries">
          <CardSkeleton />
          <CardSkeleton />
        </div>
      )}

      {status === "error" && <ErrorState message={error} onRetry={() => { setStatus("loading"); void load(true); }} />}

      {status === "ready" && items.length === 0 && (
        <EmptyState icon={<Compass className="size-6" aria-hidden />} title="You've seen everything for now">
          You’ve explored the whole library. Adjust your interests or revisit your saved discoveries.
        </EmptyState>
      )}

      {status === "ready" && items.length > 0 && (
        <div className="space-y-8">
          {items.map((item, index) =>
            hidden[item.discovery.id] ? (
              <p
                key={item.discovery.id}
                className="animate-fade rounded-2xl border border-dashed border-border px-5 py-4 text-sm text-muted-foreground"
                role="status"
              >
                {hidden[item.discovery.id] === "negative"
                  ? `Thanks — you'll see less like “${item.discovery.title}”.`
                  : `Hidden “${item.discovery.title}”.`}
              </p>
            ) : (
              <DiscoveryCard
                key={item.discovery.id}
                item={item}
                actions={actionsFor(item)}
                observeRef={observeRef}
                priority={index === 0}
                enterDelayMs={(index % PAGE_SIZE) * 70}
              />
            ),
          )}

          <div ref={sentinel} className="flex justify-center py-4">
            {moreError ? (
              <ErrorState message={moreError} onRetry={() => { setMoreError(null); void load(false); }} className="w-full" />
            ) : loadingMore ? (
              <Loader2 className="size-6 animate-spin text-muted-foreground" aria-label="Loading more" />
            ) : hasMore ? (
              <Button variant="outline" onClick={() => void load(false)}>
                Load more discoveries
              </Button>
            ) : (
              <p className="text-sm text-muted-foreground">That’s everything for now. Come back later for more.</p>
            )}
          </div>
        </div>
      )}

      {toast && (
        <div
          role="status"
          className="animate-rise fixed inset-x-0 bottom-24 z-50 mx-auto w-fit rounded-full bg-foreground px-4 py-2 text-sm text-background shadow-lg md:bottom-8"
        >
          {toast}
        </div>
      )}
    </div>
  );
}
