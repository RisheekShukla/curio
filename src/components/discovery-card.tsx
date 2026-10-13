"use client";

import { ArrowUpRight, Bookmark, BookmarkCheck, ChevronDown, Clock, EyeOff, Sparkles, ThumbsDown, ThumbsUp } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { DiscoveryImage, ImageCredit } from "@/components/discovery-image";
import { Button, buttonClasses } from "@/components/ui/button";
import { CATEGORY_LABELS, type FeedItem } from "@/lib/types";
import { cn } from "@/lib/utils";

const REASON_LABELS: Record<FeedItem["reason"], string> = {
  interest: "Matches your interests",
  adjacent: "Related to what you explored",
  explore: "Something new",
};

export interface CardActions {
  onSave: (saved: boolean) => void;
  onFeedback: (type: "positive" | "negative") => void;
  onDismiss: () => void;
}

export function discoveryHref(slug: string, params?: Record<string, string>) {
  const qs = params ? `?${new URLSearchParams(params)}` : "";
  return `/d/${slug}${qs}`;
}

export function DiscoveryCard({
  item,
  actions,
  observeRef,
  priority,
  enterDelayMs = 0,
}: {
  item: FeedItem;
  actions: CardActions;
  observeRef?: (el: HTMLElement | null) => void;
  priority?: boolean;
  enterDelayMs?: number;
}) {
  const { discovery, saved, feedback } = item;
  const [showAll, setShowAll] = useState(false);
  const questions = discovery.starterQuestions;
  const visible = showAll ? questions : questions.slice(0, 3);
  const titleId = `card-${discovery.id}-title`;

  return (
    <article
      ref={observeRef}
      data-discovery-id={discovery.id}
      aria-labelledby={titleId}
      className="animate-rise overflow-hidden rounded-3xl border border-border bg-card shadow-[0_1px_0_rgba(0,0,0,0.02)]"
      style={{ animationDelay: `${enterDelayMs}ms` }}
      data-testid="discovery-card"
    >
      <Link href={discoveryHref(discovery.slug)} className="block aspect-[16/10] overflow-hidden bg-muted" tabIndex={-1} aria-hidden>
        <DiscoveryImage discovery={discovery} priority={priority} className="hover:scale-[1.02]" />
      </Link>

      <div className="p-5 sm:p-7">
        <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
          <span className="text-accent">{CATEGORY_LABELS[discovery.category]}</span>
          <span className="inline-flex items-center gap-1 normal-case tracking-normal">
            <Clock className="size-3.5" aria-hidden /> {discovery.readingMinutes} min
          </span>
          <span className="normal-case tracking-normal">· {REASON_LABELS[item.reason]}</span>
        </div>

        <h2 id={titleId} className="font-serif text-2xl leading-tight tracking-tight sm:text-[1.75rem]">
          <Link href={discoveryHref(discovery.slug)} className="hover:underline hover:decoration-1 hover:underline-offset-4">
            {discovery.title}
          </Link>
        </h2>
        <p className="mt-3 leading-relaxed text-foreground/80">{discovery.summary}</p>

        {questions.length > 0 && (
          <div className="mt-5">
            <p className="mb-2 text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">Ask about it</p>
            <ul className="space-y-1.5">
              {visible.map((q) => (
                <li key={q}>
                  <Link
                    href={discoveryHref(discovery.slug, { ask: q })}
                    prefetch={false}
                    className="group flex items-start gap-2 rounded-xl px-3 py-2 text-sm text-foreground/85 transition-colors hover:bg-muted"
                    data-testid="starter-question"
                  >
                    <ArrowUpRight className="mt-0.5 size-4 shrink-0 text-muted-foreground group-hover:text-accent" aria-hidden />
                    {q}
                  </Link>
                </li>
              ))}
            </ul>
            {questions.length > 3 && (
              <button
                type="button"
                onClick={() => setShowAll((v) => !v)}
                className="mt-1 inline-flex items-center gap-1 px-3 text-sm text-muted-foreground hover:text-foreground"
                aria-expanded={showAll}
              >
                <ChevronDown className={cn("size-4 transition-transform", showAll && "rotate-180")} aria-hidden />
                {showAll ? "Fewer questions" : `${questions.length - 3} more question${questions.length - 3 > 1 ? "s" : ""}`}
              </button>
            )}
          </div>
        )}

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <Link href={discoveryHref(discovery.slug, { chat: "1" })} className={buttonClasses("primary")}>
            <Sparkles className="size-4" aria-hidden /> Explore with AI
          </Link>
          <div className="flex items-center gap-1" role="group" aria-label="Feedback">
            <Button
              variant="ghost"
              size="icon"
              aria-label={saved ? "Remove from saved" : "Save discovery"}
              aria-pressed={saved}
              title={saved ? "Saved" : "Save"}
              onClick={() => actions.onSave(!saved)}
            >
              {saved ? <BookmarkCheck className="size-5 animate-pop text-accent" aria-hidden /> : <Bookmark className="size-5" aria-hidden />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              aria-label="More like this"
              aria-pressed={feedback === "positive"}
              title="More like this"
              onClick={() => actions.onFeedback("positive")}
            >
              <ThumbsUp className={cn("size-5", feedback === "positive" && "animate-pop fill-accent/20 text-accent")} aria-hidden />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Less like this"
              aria-pressed={feedback === "negative"}
              title="Less like this"
              onClick={() => actions.onFeedback("negative")}
            >
              <ThumbsDown className={cn("size-5", feedback === "negative" && "text-accent")} aria-hidden />
            </Button>
            <Button variant="ghost" size="icon" aria-label="Hide this discovery" title="Hide" onClick={actions.onDismiss}>
              <EyeOff className="size-5" aria-hidden />
            </Button>
          </div>
        </div>
        <ImageCredit discovery={discovery} className="mt-4" />
      </div>
    </article>
  );
}
