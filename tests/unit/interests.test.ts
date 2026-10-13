import { describe, expect, it } from "vitest";
import { applyInteraction, EVENT_DELTAS, explicitInterest, nudge } from "@/lib/recommendation/interests";
import type { InterestEntry } from "@/lib/types";
import { LIBRARY, NOW } from "./fixtures";

const space = LIBRARY[0]!; // space, [black-holes, stars]
const weightOf = (entries: InterestEntry[], topic: string) => entries.find((e) => e.topic === topic)?.weight ?? 0;

function applyMany(type: Parameters<typeof applyInteraction>[2], times: number) {
  let interests: InterestEntry[] = [];
  for (let i = 0; i < times; i++) {
    const changed = applyInteraction(interests, space, type, NOW + i);
    interests = [...interests.filter((e) => !changed.some((c) => c.topic === e.topic)), ...changed];
  }
  return interests;
}

describe("interest weight updates", () => {
  it("does not establish a strong interest from a single impression", () => {
    const changed = applyInteraction([], space, "impression", NOW);
    expect(weightOf(changed, "category:space")).toBeGreaterThan(0);
    expect(weightOf(changed, "category:space")).toBeLessThan(0.05);
  });

  it("weights explicit feedback far more than passive views", () => {
    const view = weightOf(applyInteraction([], space, "impression", NOW), "category:space");
    const like = weightOf(applyInteraction([], space, "positive", NOW), "category:space");
    expect(like).toBeGreaterThan(view * 10);
    expect(Math.abs(EVENT_DELTAS.negative)).toBeGreaterThan(EVENT_DELTAS.open);
  });

  it("moves tags less than categories", () => {
    const changed = applyInteraction([], space, "positive", NOW);
    expect(weightOf(changed, "tag:stars")).toBeLessThan(weightOf(changed, "category:space"));
  });

  it("has diminishing returns and stays within [-1, 1]", () => {
    const liked = applyMany("positive", 50);
    expect(weightOf(liked, "category:space")).toBeLessThanOrEqual(1);
    expect(weightOf(liked, "category:space")).toBeGreaterThan(0.95);
    const disliked = applyMany("negative", 50);
    expect(weightOf(disliked, "category:space")).toBeGreaterThanOrEqual(-1);
    expect(nudge(0.5, 0.25)).toBeCloseTo(0.625);
    expect(nudge(0.5, -0.3)).toBeCloseTo(0.05);
  });

  it("lets negative feedback reduce an existing interest", () => {
    const liked = applyInteraction([], space, "positive", NOW);
    const after = applyInteraction(liked, space, "negative", NOW + 1);
    expect(weightOf(after, "category:space")).toBeLessThan(weightOf(liked, "category:space"));
  });

  it("never overrides explicit user choices", () => {
    const followed = [explicitInterest("category:space", "follow", NOW)];
    const changed = applyInteraction(followed, space, "negative", NOW + 1);
    expect(changed.some((c) => c.topic === "category:space")).toBe(false);
    expect(changed.some((c) => c.topic === "tag:stars")).toBe(true);
  });
});
