import type {
  Conversation,
  Discovery,
  InterestEntry,
  Interaction,
  Message,
  Preferences,
  TopicKey,
} from "../types";

/**
 * Storage port used by CurioService. Every instance is scoped to a single user; implementations
 * must never return another user's private rows (Supabase enforces this with RLS as well).
 */
export interface CurioRepository {
  readonly userId: string;

  listPublishedDiscoveries(): Promise<Discovery[]>;
  getDiscoveryBySlug(slug: string): Promise<Discovery | null>;
  getDiscoveriesByIds(ids: string[]): Promise<Discovery[]>;
  saveGeneratedQuestions(discoveryId: string, questions: string[]): Promise<void>;

  listInteractions(opts: { since: number; limit: number }): Promise<Interaction[]>;
  addInteraction(interaction: Interaction): Promise<void>;

  listInterests(): Promise<InterestEntry[]>;
  upsertInterests(entries: InterestEntry[]): Promise<void>;
  deleteInterest(topic: TopicKey): Promise<void>;

  listSaved(): Promise<{ discoveryId: string; savedAt: number }[]>;
  setSaved(discoveryId: string, saved: boolean, at: number): Promise<void>;

  getPreferences(): Promise<Preferences>;
  setPreferences(preferences: Preferences): Promise<void>;

  listConversations(limit: number): Promise<Conversation[]>;
  getConversation(id: string): Promise<Conversation | null>;
  findLatestConversation(discoveryId: string): Promise<Conversation | null>;
  createConversation(conversation: Conversation): Promise<void>;
  touchConversation(id: string, at: number): Promise<void>;

  listMessages(conversationId: string): Promise<Message[]>;
  addMessages(messages: Message[]): Promise<void>;
  setMessagePinned(messageId: string, pinned: boolean): Promise<Message | null>;
  listPinnedMessages(limit: number): Promise<Message[]>;
}
