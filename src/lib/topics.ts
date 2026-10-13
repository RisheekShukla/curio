import { CATEGORIES, CATEGORY_LABELS, type Category, type Discovery, type TopicKey, type TopicOption } from "./types";

export const categoryTopic = (category: string): TopicKey => `category:${category}`;
export const tagTopic = (tag: string): TopicKey => `tag:${tag}`;

export function topicsFor(discovery: Pick<Discovery, "category" | "tags">): TopicKey[] {
  return [categoryTopic(discovery.category), ...discovery.tags.map(tagTopic)];
}

export function topicLabel(topic: TopicKey): string {
  const [kind, value = ""] = topic.split(":");
  if (kind === "category" && (CATEGORIES as readonly string[]).includes(value)) {
    return CATEGORY_LABELS[value as Category];
  }
  const text = value.replace(/-/g, " ");
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function buildCatalog(discoveries: Discovery[]): TopicOption[] {
  const tags = new Set<string>();
  for (const d of discoveries) d.tags.forEach((t) => tags.add(t));
  return [
    ...CATEGORIES.map((c) => ({ topic: categoryTopic(c), label: CATEGORY_LABELS[c] })),
    ...[...tags].sort().map((t) => ({ topic: tagTopic(t), label: topicLabel(tagTopic(t)) })),
  ];
}
