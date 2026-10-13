import { describe, expect, it } from "vitest";
import { rankFeed, type RankingInput } from "@/lib/recommendation/engine";
import { explicitInterest } from "@/lib/recommendation/interests";
import type { Interaction } from "@/lib/types";
import { HOUR, LIBRARY, NOW } from "./fixtures";

const base = (overrides: Partial<RankingInput> = {}): RankingInput => ({
  candidates: LIBRARY,
  interests: [],
  interactions: [],
  savedIds: new Set(),
  limit: 6,
  now: NOW,
  seed: "user-1:day",
  ...overrides,
});

const ids = (input: RankingInput) => rankFeed(input).items.map((i) => i.discovery.id);
const categories = (input: RankingInput) => rankFeed(input).items.map((i) => i.discovery.category);

describe("rankFeed: new user", () => {
  it("returns a diverse feed with no history", () => {
    const cats = categories(base());
    expect(cats).toHaveLength(6);
    expect(new Set(cats).size).toBe(6);
  });

  it("marks everything as exploratory when nothing is known", () => {
    expect(rankFeed(base()).items.every((i) => i.reason === "explore")).toBe(true);
  });

  it("is deterministic for the same seed and varies across seeds", () => {
    expect(ids(base())).toEqual(ids(base()));
    const seeds = ["a", "b", "c", "d", "e"].map((seed) => ids(base({ seed })).join(","));
    expect(new Set(seeds).size).toBeGreaterThan(1);
  });

  it("never returns unpublished items", () => {
    const draft = { ...LIBRARY[0]!, id: "draft-1", status: "draft" as const };
    expect(ids(base({ candidates: [...LIBRARY, draft], limit: 50 }))).not.toContain("draft-1");
  });
});

describe("rankFeed: interests", () => {
  it("prioritises demonstrated interests while still exploring", () => {
    const interests = [
      { topic: "category:space" as const, weight: 0.8, source: "inferred" as const, updatedAt: NOW },
      { topic: "tag:stars" as const, weight: 0.6, source: "inferred" as const, updatedAt: NOW },
    ];
    const result = rankFeed(base({ interests, limit: 8 }));
    expect(result.items[0]!.discovery.category).toBe("space");
    expect(result.items[0]!.reason).toBe("interest");
    const spaceCount = result.items.filter((i) => i.discovery.category === "space").length;
    expect(spaceCount).toBe(3);
    expect(result.items.some((i) => i.reason === "explore")).toBe(true);
  });

  it("surfaces adjacent topics related to recent engagement", () => {
    const interactions: Interaction[] = [{ discoveryId: "nat-1", type: "open", at: NOW - HOUR }];
    const result = rankFeed(base({ interactions, excludeIds: new Set(["nat-1"]) }));
    const adjacent = result.items.filter((i) => i.reason === "adjacent").map((i) => i.discovery.id);
    expect(adjacent).toContain("nat-2");
  });

  it("follows the 50/30/20 allocation approximately when all buckets are full", () => {
    const interests = ["space", "history", "nature"].map((c) => ({
      topic: `category:${c}` as const,
      weight: 0.7,
      source: "inferred" as const,
      updatedAt: NOW,
    }));
    const interactions: Interaction[] = [{ discoveryId: "math-1", type: "open", at: NOW - HOUR }];
    const result = rankFeed(base({ interests, interactions, limit: 10 }));
    const count = (r: string) => result.items.filter((i) => i.reason === r).length;
    expect(count("interest")).toBeGreaterThanOrEqual(4);
    expect(count("interest")).toBeLessThanOrEqual(6);
    expect(count("explore")).toBeGreaterThanOrEqual(1);
  });
});

describe("rankFeed: negative signals", () => {
  it("excludes dismissed and disliked items", () => {
    const interactions: Interaction[] = [
      { discoveryId: "space-1", type: "dismiss", at: NOW - HOUR },
      { discoveryId: "hist-1", type: "negative", at: NOW - HOUR },
    ];
    const result = ids(base({ interactions, limit: 50 }));
    expect(result).not.toContain("space-1");
    expect(result).not.toContain("hist-1");
    expect(result).toHaveLength(LIBRARY.length - 2);
  });

  it("restores an item if positive feedback follows negative feedback", () => {
    const interactions: Interaction[] = [
      { discoveryId: "hist-1", type: "negative", at: NOW - 2 * HOUR },
      { discoveryId: "hist-1", type: "positive", at: NOW - HOUR },
    ];
    expect(ids(base({ interactions, limit: 50 }))).toContain("hist-1");
  });

  it("removes explicitly muted categories and tags entirely", () => {
    const interests = [explicitInterest("category:mathematics", "mute", NOW), explicitInterest("tag:brain", "mute", NOW)];
    const result = rankFeed(base({ interests, limit: 50 })).items;
    expect(result.some((i) => i.discovery.category === "mathematics")).toBe(false);
    expect(result.some((i) => i.discovery.tags.includes("brain"))).toBe(false);
  });

  it("ranks negatively weighted topics below neutral ones", () => {
    const interests = [{ topic: "category:history" as const, weight: -0.8, source: "inferred" as const, updatedAt: NOW }];
    const result = ids(base({ interests, limit: 50 }));
    const firstHistory = result.findIndex((id) => id.startsWith("hist"));
    expect(firstHistory).toBeGreaterThanOrEqual(5);
  });
});

describe("rankFeed: diversity and repetition", () => {
  it("avoids consecutive items from the same category when alternatives exist", () => {
    const interests = [{ topic: "category:space" as const, weight: 1, source: "explicit" as const, updatedAt: NOW }];
    const cats = categories(base({ interests, limit: 8 }));
    for (let i = 1; i < cats.length; i++) expect(cats[i]).not.toBe(cats[i - 1]);
  });

  it("demotes items shown recently so consecutive sessions differ", () => {
    const first = ids(base());
    const interactions: Interaction[] = first.map((discoveryId) => ({ discoveryId, type: "impression", at: NOW - HOUR }));
    const second = ids(base({ interactions, now: NOW + HOUR }));
    const overlap = second.filter((id) => first.includes(id));
    expect(overlap.length).toBeLessThanOrEqual(1);
  });

  it("lets impressions decay so old items can return", () => {
    const interactions: Interaction[] = LIBRARY.slice(0, 17).map((d) => ({
      discoveryId: d.id,
      type: "impression",
      at: NOW - 30 * 24 * HOUR,
    }));
    const result = rankFeed(base({ interactions, limit: 50 }));
    expect(result.items).toHaveLength(LIBRARY.length);
  });

  it("paginates without duplicates via excludeIds", () => {
    const page1 = ids(base());
    const page2 = ids(base({ excludeIds: new Set(page1) }));
    const page3 = ids(base({ excludeIds: new Set([...page1, ...page2]) }));
    const all = [...page1, ...page2, ...page3];
    expect(new Set(all).size).toBe(all.length);
    expect(all).toHaveLength(LIBRARY.length);
    expect(rankFeed(base({ excludeIds: new Set(all) })).remaining).toBe(0);
  });
});
