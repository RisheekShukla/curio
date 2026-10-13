import { categoryTopic, tagTopic } from "../topics";
import type { Discovery, FeedReason, InterestEntry, Interaction, TopicKey } from "../types";

export interface RankingConfig {
  /** Tunable exploration policy; proportions are targets, not exact quotas. */
  allocation: Record<FeedReason, number>;
  weights: { interest: number; adjacency: number; novelty: number; jitter: number };
  thresholds: { interest: number; adjacent: number };
  penalties: {
    /** Per impression, decaying with `impressionHalfLifeHours`. */
    impression: number;
    opened: number;
    saved: number;
    sameCategoryAsPrevious: number;
    sameCategoryInPage: number;
  };
  impressionHalfLifeHours: number;
  openedHalfLifeHours: number;
  /** How many recent engagements define the "recently explored" neighbourhood. */
  recentEngagementWindow: number;
}

export const DEFAULT_RANKING_CONFIG: RankingConfig = {
  allocation: { interest: 0.5, adjacent: 0.3, explore: 0.2 },
  weights: { interest: 1, adjacency: 0.6, novelty: 0.35, jitter: 0.05 },
  thresholds: { interest: 0.12, adjacent: 0.15 },
  penalties: {
    impression: 0.45,
    opened: 0.35,
    saved: 0.3,
    sameCategoryAsPrevious: 0.6,
    sameCategoryInPage: 0.2,
  },
  impressionHalfLifeHours: 36,
  openedHalfLifeHours: 24 * 7,
  recentEngagementWindow: 12,
};

export interface RankingInput {
  candidates: Discovery[];
  interests: InterestEntry[];
  /** Interaction history, any order. */
  interactions: Interaction[];
  savedIds: ReadonlySet<string>;
  /** Items already shown in the current session (pagination); never returned again. */
  excludeIds?: ReadonlySet<string>;
  limit: number;
  now: number;
  /** Seed for deterministic tie-breaking jitter, e.g. user id + day. */
  seed: string;
  config?: RankingConfig;
}

export interface RankedItem {
  discovery: Discovery;
  reason: FeedReason;
  score: number;
}

export interface RankingResult {
  items: RankedItem[];
  /** Eligible candidates left after this page. */
  remaining: number;
}

const ENGAGEMENT_TYPES = new Set(["open", "positive", "save", "starter_question", "conversation_start"]);
const HOUR = 3_600_000;

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const decay = (ageMs: number, halfLifeHours: number) => Math.pow(0.5, Math.max(0, ageMs) / (halfLifeHours * HOUR));

/** FNV-1a hash mapped to [0, 1); deterministic across runtimes. */
export function hashUnit(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0) / 0x100000000;
}

export function similarity(a: Pick<Discovery, "category" | "tags">, b: Pick<Discovery, "category" | "tags">): number {
  const tagsA = new Set(a.tags);
  const shared = b.tags.filter((t) => tagsA.has(t)).length;
  const union = new Set([...a.tags, ...b.tags]).size;
  const jaccard = union === 0 ? 0 : shared / union;
  return 0.7 * jaccard + (a.category === b.category ? 0.3 : 0);
}

interface Scored {
  discovery: Discovery;
  interest: number;
  adjacency: number;
  novelty: number;
  penalty: number;
  jitter: number;
  bucket: FeedReason;
  key: number;
}

export function rankFeed(input: RankingInput): RankingResult {
  const config = input.config ?? DEFAULT_RANKING_CONFIG;
  const weights = new Map<TopicKey, InterestEntry>(input.interests.map((i) => [i.topic, i]));
  const byId = new Map(input.candidates.map((d) => [d.id, d]));

  // Explicit feedback on an item, or an explicitly muted topic, removes it from the feed.
  const blocked = new Set<string>();
  const impressions = new Map<string, number[]>();
  const opens = new Map<string, number>();
  const chronological = [...input.interactions].sort((a, b) => a.at - b.at);
  for (const it of chronological) {
    if (it.type === "dismiss" || it.type === "negative") blocked.add(it.discoveryId);
    if (it.type === "positive") blocked.delete(it.discoveryId);
    if (it.type === "impression") {
      const list = impressions.get(it.discoveryId) ?? [];
      list.push(it.at);
      impressions.set(it.discoveryId, list);
    }
    if (it.type === "open") opens.set(it.discoveryId, it.at);
  }

  const isMuted = (topic: TopicKey) => {
    const entry = weights.get(topic);
    return entry?.source === "explicit" && entry.weight < 0;
  };

  const recentEngaged = [...input.interactions]
    .filter((it) => ENGAGEMENT_TYPES.has(it.type))
    .sort((a, b) => b.at - a.at)
    .map((it) => byId.get(it.discoveryId))
    .filter((d): d is Discovery => !!d)
    .filter((d, i, arr) => arr.findIndex((x) => x.id === d.id) === i)
    .slice(0, config.recentEngagementWindow);

  const recentImpressionCategories = new Map<string, number>();
  const recentImpressions = input.interactions
    .filter((it) => it.type === "impression")
    .sort((a, b) => b.at - a.at)
    .slice(0, 30);
  for (const it of recentImpressions) {
    const d = byId.get(it.discoveryId);
    if (d) recentImpressionCategories.set(d.category, (recentImpressionCategories.get(d.category) ?? 0) + 1);
  }

  const w = (topic: TopicKey) => weights.get(topic)?.weight ?? 0;

  const scored: Scored[] = [];
  for (const d of input.candidates) {
    if (d.status !== "published") continue;
    if (input.excludeIds?.has(d.id) || blocked.has(d.id)) continue;
    if (isMuted(categoryTopic(d.category)) || d.tags.some((t) => isMuted(tagTopic(t)))) continue;

    const tagWeights = d.tags.map((t) => w(tagTopic(t)));
    const tagScore = tagWeights.length ? tagWeights.reduce((a, b) => a + b, 0) / Math.sqrt(tagWeights.length) : 0;
    const interest = clamp(0.5 * w(categoryTopic(d.category)) + 0.5 * clamp(tagScore, -1, 1), -1, 1);

    let adjacency = 0;
    recentEngaged.forEach((e, i) => {
      if (e.id === d.id) return;
      const recencyWeight = 1 - i / (2 * config.recentEngagementWindow);
      adjacency = Math.max(adjacency, similarity(d, e) * recencyWeight);
    });

    const seen = impressions.get(d.id) ?? [];
    const categoryShare = recentImpressions.length
      ? (recentImpressionCategories.get(d.category) ?? 0) / recentImpressions.length
      : 0;
    const novelty = 0.5 * (seen.length === 0 ? 1 : 0) + 0.5 * (1 - categoryShare);

    let penalty = 0;
    for (const at of seen) penalty += config.penalties.impression * decay(input.now - at, config.impressionHalfLifeHours);
    const openedAt = opens.get(d.id);
    if (openedAt !== undefined) penalty += config.penalties.opened * decay(input.now - openedAt, config.openedHalfLifeHours);
    if (input.savedIds.has(d.id)) penalty += config.penalties.saved;

    const jitter = hashUnit(`${input.seed}:${d.id}`);
    const bucket: FeedReason =
      interest >= config.thresholds.interest
        ? "interest"
        : adjacency >= config.thresholds.adjacent || interest > 0
          ? "adjacent"
          : "explore";

    const key =
      bucket === "explore"
        ? config.weights.novelty * novelty + 0.5 * Math.min(interest, 0) - penalty + config.weights.jitter * 4 * jitter
        : config.weights.interest * interest +
          config.weights.adjacency * adjacency +
          config.weights.novelty * novelty -
          penalty +
          config.weights.jitter * jitter;

    scored.push({ discovery: d, interest, adjacency, novelty, penalty, jitter, bucket, key });
  }

  const buckets: Record<FeedReason, Scored[]> = { interest: [], adjacent: [], explore: [] };
  for (const s of scored) buckets[s.bucket].push(s);

  const picked: Scored[] = [];
  const taken: Record<FeedReason, number> = { interest: 0, adjacent: 0, explore: 0 };
  const order: FeedReason[] = ["interest", "adjacent", "explore"];
  const limit = Math.max(0, Math.min(input.limit, scored.length));

  for (let slot = 0; slot < limit; slot++) {
    const byDeficit = order
      .filter((b) => buckets[b].length > 0)
      .sort((a, b) => {
        const deficitA = config.allocation[a] * (slot + 1) - taken[a];
        const deficitB = config.allocation[b] * (slot + 1) - taken[b];
        return deficitB - deficitA || order.indexOf(a) - order.indexOf(b);
      });
    if (!byDeficit.length) break;

    const previous = picked[picked.length - 1]?.discovery.category;
    const bestIn = (bucket: FeedReason) => {
      let bestIndex = 0;
      let bestValue = -Infinity;
      buckets[bucket].forEach((s, i) => {
        const sameInPage = picked.filter((p) => p.discovery.category === s.discovery.category).length;
        const value =
          s.key -
          (s.discovery.category === previous ? config.penalties.sameCategoryAsPrevious : 0) -
          sameInPage * config.penalties.sameCategoryInPage;
        if (value > bestValue || (value === bestValue && s.discovery.id < buckets[bucket][bestIndex]!.discovery.id)) {
          bestValue = value;
          bestIndex = i;
        }
      });
      return bestIndex;
    };

    // Respect the allocation, but avoid back-to-back categories when another bucket offers variety.
    let bucket = byDeficit[0]!;
    let index = bestIn(bucket);
    if (buckets[bucket][index]!.discovery.category === previous) {
      for (const alt of byDeficit.slice(1)) {
        const altIndex = bestIn(alt);
        if (buckets[alt][altIndex]!.discovery.category !== previous) {
          bucket = alt;
          index = altIndex;
          break;
        }
      }
    }
    const [choice] = buckets[bucket].splice(index, 1);
    picked.push(choice!);
    taken[bucket]++;
  }

  return {
    items: picked.map((s) => ({ discovery: s.discovery, reason: s.bucket, score: Number(s.key.toFixed(4)) })),
    remaining: scored.length - picked.length,
  };
}
