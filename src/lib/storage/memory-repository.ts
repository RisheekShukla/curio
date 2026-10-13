import type { CurioRepository } from "../services/repository";
import {
  DEFAULT_PREFERENCES,
  type Conversation,
  type Discovery,
  type InterestEntry,
  type Interaction,
  type Message,
  type Preferences,
  type TopicKey,
} from "../types";

export interface MemoryData {
  version: 1;
  interactions: (Interaction & { userId: string })[];
  interests: (InterestEntry & { userId: string })[];
  saved: { userId: string; discoveryId: string; savedAt: number }[];
  preferences: Record<string, Preferences>;
  conversations: Conversation[];
  messages: (Message & { userId: string })[];
  generatedQuestions: Record<string, string[]>;
}

export const MAX_STORED_INTERACTIONS = 2000;

export function emptyData(): MemoryData {
  return {
    version: 1,
    interactions: [],
    interests: [],
    saved: [],
    preferences: {},
    conversations: [],
    messages: [],
    generatedQuestions: {},
  };
}

function strip<T extends { userId: string }>(row: T): Omit<T, "userId"> {
  const copy: Partial<T> = { ...row };
  delete copy.userId;
  return copy as Omit<T, "userId">;
}

/**
 * In-memory repository that can hold several users' data. Every query filters by the bound
 * user, mirroring row-level security. Used directly in tests and wrapped by the demo store.
 */
export class MemoryRepository implements CurioRepository {
  constructor(
    readonly userId: string,
    private readonly discoveries: Discovery[],
    protected data: MemoryData = emptyData(),
    private readonly onChange?: (data: MemoryData) => void,
  ) {}

  private commit() {
    if (this.data.interactions.length > MAX_STORED_INTERACTIONS) {
      this.data.interactions = this.data.interactions.slice(-MAX_STORED_INTERACTIONS);
    }
    this.onChange?.(this.data);
  }

  private withQuestions(d: Discovery): Discovery {
    const generated = this.data.generatedQuestions[d.id];
    return generated ? { ...d, generatedQuestions: generated } : d;
  }

  async listPublishedDiscoveries() {
    return this.discoveries.filter((d) => d.status === "published").map((d) => this.withQuestions(d));
  }

  async getDiscoveryBySlug(slug: string) {
    const d = this.discoveries.find((x) => x.slug === slug);
    return d ? this.withQuestions(d) : null;
  }

  async getDiscoveriesByIds(ids: string[]) {
    const set = new Set(ids);
    return this.discoveries.filter((d) => set.has(d.id)).map((d) => this.withQuestions(d));
  }

  async saveGeneratedQuestions(discoveryId: string, questions: string[]) {
    this.data.generatedQuestions[discoveryId] = questions;
    this.commit();
  }

  async listInteractions({ since, limit }: { since: number; limit: number }) {
    return this.data.interactions
      .filter((i) => i.userId === this.userId && i.at >= since)
      .slice(-limit)
      .map(strip);
  }

  async addInteraction(interaction: Interaction) {
    this.data.interactions.push({ ...interaction, userId: this.userId });
    this.commit();
  }

  async listInterests() {
    return this.data.interests.filter((i) => i.userId === this.userId).map(strip);
  }

  async upsertInterests(entries: InterestEntry[]) {
    const topics = new Set(entries.map((e) => e.topic));
    this.data.interests = [
      ...this.data.interests.filter((i) => i.userId !== this.userId || !topics.has(i.topic)),
      ...entries.map((e) => ({ ...e, userId: this.userId })),
    ];
    this.commit();
  }

  async deleteInterest(topic: TopicKey) {
    this.data.interests = this.data.interests.filter((i) => i.userId !== this.userId || i.topic !== topic);
    this.commit();
  }

  async listSaved() {
    return this.data.saved.filter((s) => s.userId === this.userId).map(strip);
  }

  async setSaved(discoveryId: string, saved: boolean, at: number) {
    this.data.saved = this.data.saved.filter((s) => s.userId !== this.userId || s.discoveryId !== discoveryId);
    if (saved) this.data.saved.push({ userId: this.userId, discoveryId, savedAt: at });
    this.commit();
  }

  async getPreferences() {
    return { ...DEFAULT_PREFERENCES, ...this.data.preferences[this.userId] };
  }

  async setPreferences(preferences: Preferences) {
    this.data.preferences[this.userId] = preferences;
    this.commit();
  }

  async listConversations(limit: number) {
    return this.data.conversations
      .filter((c) => c.userId === this.userId)
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .slice(0, limit);
  }

  async getConversation(id: string) {
    return this.data.conversations.find((c) => c.id === id && c.userId === this.userId) ?? null;
  }

  async findLatestConversation(discoveryId: string) {
    return (await this.listConversations(Number.MAX_SAFE_INTEGER)).find((c) => c.discoveryId === discoveryId) ?? null;
  }

  async createConversation(conversation: Conversation) {
    this.data.conversations.push({ ...conversation, userId: this.userId });
    this.commit();
  }

  async touchConversation(id: string, at: number) {
    const c = this.data.conversations.find((x) => x.id === id && x.userId === this.userId);
    if (c) c.updatedAt = at;
    this.commit();
  }

  async listMessages(conversationId: string) {
    return this.data.messages
      .filter((m) => m.userId === this.userId && m.conversationId === conversationId)
      .map(strip);
  }

  async addMessages(messages: Message[]) {
    this.data.messages.push(...messages.map((m) => ({ ...m, userId: this.userId })));
    this.commit();
  }

  async setMessagePinned(messageId: string, pinned: boolean) {
    const m = this.data.messages.find((x) => x.id === messageId && x.userId === this.userId);
    if (!m) return null;
    m.pinned = pinned;
    this.commit();
    return strip(m);
  }

  async listPinnedMessages(limit: number) {
    return this.data.messages
      .filter((m) => m.userId === this.userId && m.pinned)
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, limit)
      .map(strip);
  }
}
