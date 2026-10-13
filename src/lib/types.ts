export const CATEGORIES = [
  "science",
  "space",
  "nature",
  "history",
  "technology",
  "engineering",
  "psychology",
  "geography",
  "culture",
  "mathematics",
] as const;
export type Category = (typeof CATEGORIES)[number];

export const CATEGORY_LABELS: Record<Category, string> = {
  science: "Science",
  space: "Space",
  nature: "Nature",
  history: "History",
  technology: "Technology",
  engineering: "Engineering",
  psychology: "Psychology",
  geography: "Geography",
  culture: "Culture",
  mathematics: "Mathematics",
};

export type ContentStatus = "draft" | "published" | "archived";

export interface DiscoveryImage {
  url: string;
  alt: string;
  credit?: string;
  license?: string;
  licenseUrl?: string;
  sourcePageUrl?: string;
}

export interface Discovery {
  /** Opaque identifier: the slug in demo mode, a UUID in Supabase. */
  id: string;
  slug: string;
  title: string;
  summary: string;
  category: Category;
  tags: string[];
  image: DiscoveryImage | null;
  starterQuestions: string[];
  generatedQuestions?: string[];
  source?: { title: string; url: string };
  readingMinutes: number;
  status: ContentStatus;
}

export const INTERACTION_TYPES = [
  "impression",
  "open",
  "positive",
  "negative",
  "save",
  "unsave",
  "dismiss",
  "starter_question",
  "conversation_start",
] as const;
export type InteractionType = (typeof INTERACTION_TYPES)[number];

export interface Interaction {
  discoveryId: string;
  type: InteractionType;
  /** Epoch milliseconds. */
  at: number;
  metadata?: Record<string, string>;
}

/** Topic keys look like `category:space` or `tag:black-holes`. */
export type TopicKey = `category:${string}` | `tag:${string}`;

export interface InterestEntry {
  topic: TopicKey;
  /** -1 (avoid) .. 1 (strong interest). */
  weight: number;
  source: "explicit" | "inferred";
  updatedAt: number;
}

export type ExplanationStyle = "simple" | "balanced" | "detailed";

export interface Preferences {
  explanationStyle: ExplanationStyle;
}

export const DEFAULT_PREFERENCES: Preferences = { explanationStyle: "balanced" };

export type FeedReason = "interest" | "adjacent" | "explore";

export interface FeedItem {
  discovery: Discovery;
  reason: FeedReason;
  saved: boolean;
  feedback: "positive" | "negative" | null;
}

export interface FeedPage {
  items: FeedItem[];
  hasMore: boolean;
}

export interface DiscoveryState {
  discovery: Discovery;
  saved: boolean;
  feedback: "positive" | "negative" | null;
}

export interface Conversation {
  id: string;
  userId: string;
  discoveryId: string;
  title: string;
  createdAt: number;
  updatedAt: number;
}

export type MessageRole = "user" | "assistant";

export interface Message {
  id: string;
  conversationId: string;
  role: MessageRole;
  content: string;
  createdAt: number;
  /** True when produced by the deterministic demo responder rather than a real model. */
  isMock: boolean;
  suggestions: string[];
  pinned: boolean;
}

export interface ConversationThread {
  conversation: Conversation;
  discovery: Discovery;
  messages: Message[];
}

export interface HistoryData {
  recentlyViewed: { discovery: Discovery; at: number }[];
  conversations: { conversation: Conversation; discovery: Discovery }[];
}

export interface SavedData {
  discoveries: { discovery: Discovery; savedAt: number }[];
  insights: { message: Message; conversation: Conversation; discovery: Discovery }[];
}

export interface TopicOption {
  topic: TopicKey;
  label: string;
}

export interface InterestsData {
  interests: (InterestEntry & { label: string })[];
  recentTopics: TopicOption[];
  catalog: TopicOption[];
  preferences: Preferences;
}

export type InterestAction = "follow" | "mute" | "reset";
