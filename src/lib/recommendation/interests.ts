import { topicsFor } from "../topics";
import type { Discovery, InteractionType, InterestEntry, TopicKey } from "../types";

/**
 * Base weight change per event. Passive signals are tiny so that a single impression
 * never establishes an interest; explicit feedback dominates.
 */
export const EVENT_DELTAS: Record<InteractionType, number> = {
  impression: 0.01,
  open: 0.05,
  starter_question: 0.08,
  conversation_start: 0.1,
  positive: 0.25,
  save: 0.25,
  unsave: -0.1,
  dismiss: -0.15,
  negative: -0.3,
};

/** Tags are more specific than categories, so each tag moves a little less. */
export const TAG_FACTOR = 0.6;

/** Moves a weight toward +1 or -1 with diminishing returns, keeping it in [-1, 1]. */
export function nudge(weight: number, delta: number): number {
  const next = delta >= 0 ? weight + delta * (1 - weight) : weight + delta * (1 + weight);
  return Math.round(Math.min(1, Math.max(-1, next)) * 10_000) / 10_000;
}

/**
 * Returns only the interest entries that changed. Explicit (user-set) entries are never
 * overwritten by inferred learning.
 */
export function applyInteraction(
  current: InterestEntry[],
  discovery: Pick<Discovery, "category" | "tags">,
  type: InteractionType,
  now: number,
): InterestEntry[] {
  const base = EVENT_DELTAS[type];
  if (!base) return [];
  const byTopic = new Map<TopicKey, InterestEntry>(current.map((e) => [e.topic, e]));
  const changed: InterestEntry[] = [];
  for (const topic of topicsFor(discovery)) {
    const existing = byTopic.get(topic);
    if (existing?.source === "explicit") continue;
    const delta = topic.startsWith("tag:") ? base * TAG_FACTOR : base;
    const weight = nudge(existing?.weight ?? 0, delta);
    changed.push({ topic, weight, source: "inferred", updatedAt: now });
  }
  return changed;
}

export function explicitInterest(topic: TopicKey, action: "follow" | "mute", now: number): InterestEntry {
  return { topic, weight: action === "follow" ? 1 : -1, source: "explicit", updatedAt: now };
}
