"use client";

import { BellOff, Plus, RotateCcw, Search, ShieldCheck, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { useApiResource } from "@/components/hooks";
import { useCurio } from "@/components/providers/curio-provider";
import { Button } from "@/components/ui/button";
import { ErrorState, PageHeader, Skeleton } from "@/components/ui/states";
import { errorMessage } from "@/lib/client/api-error";
import { clearDemoData } from "@/lib/storage/demo-storage";
import type { ExplanationStyle, InterestAction, TopicKey } from "@/lib/types";
import { cn } from "@/lib/utils";

const STYLES: { value: ExplanationStyle; label: string; hint: string }[] = [
  { value: "simple", label: "Simple", hint: "Plain language, no jargon" },
  { value: "balanced", label: "Balanced", hint: "Clear and moderately detailed" },
  { value: "detailed", label: "Detailed", hint: "In depth, precise terminology" },
];

function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-3xl border border-border bg-card p-5 sm:p-6">
      <h2 className="font-serif text-xl">{title}</h2>
      {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

export function InterestsView() {
  const { api, mode } = useCurio();
  const { data, error, setData, reload } = useApiResource(api, (a) => a.getInterests(), "We couldn't load your interests.");
  const [actionError, setActionError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [busyTopic, setBusyTopic] = useState<string | null>(null);

  const act = async (topic: TopicKey, action: InterestAction) => {
    if (!api) return;
    setBusyTopic(topic);
    setActionError(null);
    try {
      await api.updateInterest(topic, action);
      const fresh = await api.getInterests();
      setData(() => fresh);
    } catch (err) {
      setActionError(errorMessage(err, "Couldn't update that interest."));
    } finally {
      setBusyTopic(null);
    }
  };

  const setStyle = async (explanationStyle: ExplanationStyle) => {
    if (!api || !data) return;
    const previous = data.preferences;
    setData((d) => ({ ...d, preferences: { explanationStyle } }));
    try {
      await api.setPreferences({ explanationStyle });
    } catch (err) {
      setData((d) => ({ ...d, preferences: previous }));
      setActionError(errorMessage(err, "Couldn't save your preference."));
    }
  };

  const groups = useMemo(() => {
    const interests = data?.interests ?? [];
    return {
      following: interests.filter((i) => i.source === "explicit" && i.weight > 0),
      muted: interests.filter((i) => i.source === "explicit" && i.weight < 0),
      learned: interests.filter((i) => i.source === "inferred"),
    };
  }, [data]);

  const matches = useMemo(() => {
    if (!data) return [];
    const q = query.trim().toLowerCase();
    const explicit = new Set(data.interests.filter((i) => i.source === "explicit").map((i) => i.topic));
    return data.catalog
      .filter((t) => !explicit.has(t.topic) && (!q || t.label.toLowerCase().includes(q)))
      .slice(0, q ? 24 : 12);
  }, [data, query]);

  return (
    <div className="mx-auto w-full max-w-3xl">
      <PageHeader title="My Interests" subtitle="See what Curio has learned, and correct it whenever you like." />
      {error && <ErrorState message={error} onRetry={reload} />}
      {!data && !error && (
        <div className="space-y-4">
          <Skeleton className="h-32" />
          <Skeleton className="h-48" />
        </div>
      )}
      {actionError && (
        <p role="alert" className="mb-4 rounded-2xl border border-border p-3 text-sm text-accent">
          {actionError}
        </p>
      )}
      {data && (
        <div className="space-y-6">
          <Section title="How should answers be explained?" description="Used by the AI companion in every conversation.">
            <div role="radiogroup" aria-label="Explanation style" className="grid gap-2 sm:grid-cols-3">
              {STYLES.map((s) => {
                const active = data.preferences.explanationStyle === s.value;
                return (
                  <button
                    key={s.value}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => setStyle(s.value)}
                    className={cn(
                      "rounded-2xl border px-4 py-3 text-left transition-colors",
                      active ? "border-foreground bg-foreground text-background" : "border-border hover:bg-muted",
                    )}
                  >
                    <span className="block text-sm font-medium">{s.label}</span>
                    <span className={cn("block text-xs", active ? "text-background/70" : "text-muted-foreground")}>{s.hint}</span>
                  </button>
                );
              })}
            </div>
          </Section>

          <Section title="Following" description="Topics you've chosen. These always count strongly in your feed.">
            {groups.following.length === 0 ? (
              <p className="text-sm text-muted-foreground">You’re not following any topics yet. Add some below.</p>
            ) : (
              <ul className="flex flex-wrap gap-2">
                {groups.following.map((i) => (
                  <li key={i.topic}>
                    <span className="inline-flex items-center gap-1 rounded-full bg-foreground py-1 pl-3 pr-1 text-sm text-background">
                      {i.label}
                      <button
                        type="button"
                        className="rounded-full p-1 hover:bg-background/20"
                        aria-label={`Stop following ${i.label}`}
                        disabled={busyTopic === i.topic}
                        onClick={() => act(i.topic, "reset")}
                      >
                        <Trash2 className="size-3.5" aria-hidden />
                      </button>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Section>

          <Section title="Learned from your activity" description="Inferred gently from saves, feedback and what you explore. Correct anything that's off.">
            {groups.learned.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nothing learned yet. Explore a few discoveries and this will fill in.</p>
            ) : (
              <ul className="divide-y divide-border">
                {groups.learned.map((i) => (
                  <li key={i.topic} className="flex flex-wrap items-center gap-3 py-2.5">
                    <span className="min-w-32 flex-1 text-sm">{i.label}</span>
                    <span className="flex w-28 items-center" aria-label={`Strength ${Math.round(i.weight * 100)} out of 100`}>
                      <span className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                        <span
                          className={cn("block h-full rounded-full", i.weight >= 0 ? "bg-accent" : "bg-muted-foreground")}
                          style={{ width: `${Math.min(100, Math.abs(i.weight) * 100)}%` }}
                        />
                      </span>
                    </span>
                    <span className="flex gap-1">
                      <Button size="sm" variant="ghost" disabled={busyTopic === i.topic} onClick={() => act(i.topic, "follow")}>
                        <Plus className="size-4" aria-hidden /> Follow
                      </Button>
                      <Button size="sm" variant="ghost" disabled={busyTopic === i.topic} onClick={() => act(i.topic, "mute")}>
                        <BellOff className="size-4" aria-hidden /> Less
                      </Button>
                      <Button size="sm" variant="ghost" disabled={busyTopic === i.topic} onClick={() => act(i.topic, "reset")} aria-label={`Forget ${i.label}`}>
                        <RotateCcw className="size-4" aria-hidden />
                      </Button>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Section>

          {data.recentTopics.length > 0 && (
            <Section title="Recently explored">
              <ul className="flex flex-wrap gap-2">
                {data.recentTopics.map((t) => (
                  <li key={t.topic} className="rounded-full bg-muted px-3 py-1 text-sm text-muted-foreground">
                    {t.label}
                  </li>
                ))}
              </ul>
            </Section>
          )}

          <Section title="Add an interest">
            <label className="flex items-center gap-2 rounded-2xl border border-border px-3 focus-within:border-foreground/40">
              <Search className="size-4 text-muted-foreground" aria-hidden />
              <span className="sr-only">Search topics</span>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search topics, e.g. ocean, black holes, rome"
                className="h-10 flex-1 bg-transparent text-sm outline-none"
              />
            </label>
            <ul className="mt-3 flex flex-wrap gap-2">
              {matches.map((t) => (
                <li key={t.topic} className="inline-flex overflow-hidden rounded-full border border-border text-sm">
                  <button
                    type="button"
                    className="px-3 py-1 hover:bg-muted"
                    disabled={busyTopic === t.topic}
                    onClick={() => act(t.topic, "follow")}
                    aria-label={`Follow ${t.label}`}
                  >
                    + {t.label}
                  </button>
                  <button
                    type="button"
                    className="border-l border-border px-2 text-muted-foreground hover:bg-muted"
                    disabled={busyTopic === t.topic}
                    onClick={() => act(t.topic, "mute")}
                    aria-label={`Show less of ${t.label}`}
                    title="Show less"
                  >
                    <BellOff className="size-3.5" aria-hidden />
                  </button>
                </li>
              ))}
              {matches.length === 0 && <li className="text-sm text-muted-foreground">No matching topics in the library yet.</li>}
            </ul>
          </Section>

          {groups.muted.length > 0 && (
            <Section title="Showing less of" description="Discoveries with these topics are hidden from your feed.">
              <ul className="flex flex-wrap gap-2">
                {groups.muted.map((i) => (
                  <li key={i.topic} className="inline-flex items-center gap-1 rounded-full border border-border py-1 pl-3 pr-1 text-sm">
                    {i.label}
                    <button
                      type="button"
                      className="rounded-full p-1 hover:bg-muted"
                      aria-label={`Unmute ${i.label}`}
                      disabled={busyTopic === i.topic}
                      onClick={() => act(i.topic, "reset")}
                    >
                      <RotateCcw className="size-3.5" aria-hidden />
                    </button>
                  </li>
                ))}
              </ul>
            </Section>
          )}

          <p className="flex items-start gap-2 px-1 text-xs text-muted-foreground">
            <ShieldCheck className="mt-0.5 size-4 shrink-0" aria-hidden />
            Curio only learns which subjects you enjoy from what you do in the app. It never infers personal attributes
            such as health, beliefs or identity.
          </p>

          {mode === "demo" && (
            <Section title="Demo data" description="Everything is stored in this browser's local storage and never leaves this device.">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (window.confirm("Delete all demo data (saved items, history, conversations and interests) from this browser?")) {
                    clearDemoData(window.localStorage);
                    window.location.reload();
                  }
                }}
              >
                <Trash2 className="size-4" aria-hidden /> Reset demo data
              </Button>
            </Section>
          )}
        </div>
      )}
    </div>
  );
}
