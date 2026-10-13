"use client";

import { ArrowLeft, Bookmark, BookmarkCheck, Clock, ExternalLink, SearchX, ThumbsDown, ThumbsUp } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { ChatPanel } from "@/components/chat-panel";
import { DiscoveryImage, ImageCredit } from "@/components/discovery-image";
import { useCurio } from "@/components/providers/curio-provider";
import { Button, buttonClasses } from "@/components/ui/button";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui/states";
import { errorMessage } from "@/lib/client/api-error";
import { CATEGORY_LABELS, type DiscoveryState } from "@/lib/types";
import { cn } from "@/lib/utils";

export function DiscoveryView({ slug }: { slug: string }) {
  const { api } = useCurio();
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  // Read once: these drive initial behaviour only and are stripped from the URL afterwards.
  const [initial] = useState(() => ({
    ask: params.get("ask")?.slice(0, 500) ?? null,
    conversationId: params.get("c"),
    chat: params.get("chat") === "1",
  }));
  const [state, setState] = useState<DiscoveryState | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "missing" | "error">("loading");
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);
  const opened = useRef(false);

  const load = useCallback(async () => {
    if (!api) return;
    try {
      const result = await api.getDiscovery(slug);
      if (!result) {
        setStatus("missing");
        return;
      }
      setState(result);
      setStatus("ready");
      if (!opened.current) {
        opened.current = true;
        api.recordInteractions([{ discoveryId: result.discovery.id, type: "open" }]).catch(() => {});
      }
    } catch (err) {
      setError(errorMessage(err, "We couldn't load this discovery."));
      setStatus("error");
    }
  }, [api, slug]);

  const started = useRef(false);
  useEffect(() => {
    if (!api || started.current) return;
    started.current = true;
    void load();
  }, [api, load]);

  const onConversationChange = useCallback(
    (id: string | null) => {
      router.replace(id ? `${pathname}?c=${encodeURIComponent(id)}` : pathname, { scroll: false });
    },
    [router, pathname],
  );

  if (status === "loading") {
    return (
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]" aria-busy="true">
        <div className="space-y-4">
          <Skeleton className="aspect-[4/3] w-full rounded-3xl" />
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
        </div>
        <Skeleton className="h-[32rem] w-full rounded-3xl" />
      </div>
    );
  }
  if (status === "missing") {
    return (
      <EmptyState icon={<SearchX className="size-6" aria-hidden />} title="Discovery not found">
        <p>It may have been removed.</p>
        <Link href="/discover" className={cn(buttonClasses("outline", "sm"), "mt-4")}>
          Back to Discover
        </Link>
      </EmptyState>
    );
  }
  if (status === "error" || !state) return <ErrorState message={error} onRetry={() => { setStatus("loading"); void load(); }} />;

  const { discovery, saved, feedback } = state;

  const toggleSave = async () => {
    if (!api) return;
    setState({ ...state, saved: !saved });
    setActionError(null);
    try {
      await api.setSaved(discovery.id, !saved);
    } catch (err) {
      setState((s) => (s ? { ...s, saved } : s));
      setActionError(errorMessage(err, "Couldn't update saved items."));
    }
  };

  const giveFeedback = async (type: "positive" | "negative") => {
    if (!api || feedback === type) return;
    setState({ ...state, feedback: type });
    setActionError(null);
    try {
      await api.recordInteractions([{ discoveryId: discovery.id, type }]);
    } catch (err) {
      setState((s) => (s ? { ...s, feedback } : s));
      setActionError(errorMessage(err, "Couldn't record feedback."));
    }
  };

  return (
    <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
      <article className="min-w-0 animate-rise lg:sticky lg:top-8">
        <Link href="/discover" className="mb-5 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" aria-hidden /> Discover
        </Link>
        <div className="aspect-[4/3] overflow-hidden rounded-3xl bg-muted">
          <DiscoveryImage discovery={discovery} priority sizes="(min-width: 1024px) 40vw, 100vw" />
        </div>
        <ImageCredit discovery={discovery} className="mt-2" />
        <div className="mt-6 flex items-center gap-3 text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
          <span className="text-accent">{CATEGORY_LABELS[discovery.category]}</span>
          <span className="inline-flex items-center gap-1 normal-case tracking-normal">
            <Clock className="size-3.5" aria-hidden /> {discovery.readingMinutes} min read
          </span>
        </div>
        <h1 className="mt-3 font-serif text-3xl leading-tight tracking-tight sm:text-4xl">{discovery.title}</h1>
        <p className="mt-4 text-[17px] leading-relaxed text-foreground/85">{discovery.summary}</p>
        {discovery.tags.length > 0 && (
          <ul className="mt-5 flex flex-wrap gap-2" aria-label="Tags">
            {discovery.tags.map((t) => (
              <li key={t} className="rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground">
                {t.replace(/-/g, " ")}
              </li>
            ))}
          </ul>
        )}
        {discovery.source && (
          <a
            href={discovery.source.url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-5 inline-flex items-center gap-1.5 text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            Further reading: {discovery.source.title} <ExternalLink className="size-3.5" aria-hidden />
          </a>
        )}
        <div className="mt-6 flex flex-wrap items-center gap-2">
          <Button variant={saved ? "secondary" : "outline"} onClick={toggleSave} aria-pressed={saved} data-testid="save-button">
            {saved ? <BookmarkCheck className="size-4 animate-pop text-accent" aria-hidden /> : <Bookmark className="size-4" aria-hidden />}
            {saved ? "Saved" : "Save"}
          </Button>
          <Button variant="ghost" size="icon" aria-label="More like this" aria-pressed={feedback === "positive"} onClick={() => giveFeedback("positive")}>
            <ThumbsUp className={cn("size-5", feedback === "positive" && "text-accent")} aria-hidden />
          </Button>
          <Button variant="ghost" size="icon" aria-label="Less like this" aria-pressed={feedback === "negative"} onClick={() => giveFeedback("negative")}>
            <ThumbsDown className={cn("size-5", feedback === "negative" && "text-accent")} aria-hidden />
          </Button>
        </div>
        {actionError && (
          <p role="alert" className="mt-3 text-sm text-accent">
            {actionError}
          </p>
        )}
      </article>

      <ChatPanel
        discovery={discovery}
        initialConversationId={initial.conversationId}
        initialAsk={initial.ask}
        autoFocus={initial.chat}
        onConversationChange={onConversationChange}
      />
    </div>
  );
}
