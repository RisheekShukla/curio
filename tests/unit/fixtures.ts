import type { Category, Discovery } from "@/lib/types";

export function makeDiscovery(id: string, category: Category, tags: string[], extra: Partial<Discovery> = {}): Discovery {
  return {
    id,
    slug: id,
    title: `Title ${id}`,
    summary: `Summary for ${id}.`,
    category,
    tags,
    image: null,
    starterQuestions: [`What is ${id}?`, `Why does ${id} matter?`, `How was ${id} discovered?`],
    readingMinutes: 2,
    status: "published",
    ...extra,
  };
}

/** A small, varied library: 3 items in each of 6 categories with overlapping tags. */
export const LIBRARY: Discovery[] = [
  makeDiscovery("space-1", "space", ["black-holes", "stars"]),
  makeDiscovery("space-2", "space", ["exoplanets", "stars"]),
  makeDiscovery("space-3", "space", ["sun", "magnetism"]),
  makeDiscovery("hist-1", "history", ["rome", "materials"]),
  makeDiscovery("hist-2", "history", ["trade", "china"]),
  makeDiscovery("hist-3", "history", ["china", "archaeology"]),
  makeDiscovery("nat-1", "nature", ["ocean", "deep-sea"]),
  makeDiscovery("nat-2", "nature", ["animals", "ocean"]),
  makeDiscovery("nat-3", "nature", ["fungi", "plants"]),
  makeDiscovery("math-1", "mathematics", ["numbers", "patterns"]),
  makeDiscovery("math-2", "mathematics", ["probability", "puzzles"]),
  makeDiscovery("math-3", "mathematics", ["cryptography", "numbers"]),
  makeDiscovery("tech-1", "technology", ["computing", "electronics"]),
  makeDiscovery("tech-2", "technology", ["satellites", "physics"]),
  makeDiscovery("tech-3", "technology", ["printing", "books"]),
  makeDiscovery("psy-1", "psychology", ["memory", "brain"]),
  makeDiscovery("psy-2", "psychology", ["sleep", "brain"]),
  makeDiscovery("psy-3", "psychology", ["animals", "cognition"]),
];

export const NOW = Date.UTC(2026, 9, 13, 12);
export const HOUR = 3_600_000;
