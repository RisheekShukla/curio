import { AIUnavailableError, LIMITS, type AIResponder, type DiscoveryContext } from "../ai/types";
import { NotFoundError, ValidationError } from "../errors";
import { applyInteraction, explicitInterest } from "../recommendation/interests";
import { rankFeed } from "../recommendation/engine";
import { buildCatalog, categoryTopic, tagTopic, topicLabel } from "../topics";
import type {
  ConversationThread,
  Discovery,
  DiscoveryState,
  FeedPage,
  HistoryData,
  InterestAction,
  InterestsData,
  InteractionType,
  Message,
  Preferences,
  SavedData,
  TopicKey,
  TopicOption,
} from "../types";
import type { CurioRepository } from "./repository";

export interface InteractionEvent {
  discoveryId: string;
  type: Exclude<InteractionType, "save" | "unsave">;
  metadata?: Record<string, string>;
}

/** The operations the UI needs, implemented locally (demo) or over HTTP (cloud). */
export interface CurioApi {
  getFeed(req: { excludeIds: string[]; limit: number }): Promise<FeedPage>;
  getDiscovery(slug: string): Promise<DiscoveryState | null>;
  recordInteractions(events: InteractionEvent[]): Promise<void>;
  setSaved(discoveryId: string, saved: boolean): Promise<void>;
  getSaved(): Promise<SavedData>;
  getHistory(): Promise<HistoryData>;
  getInterests(): Promise<InterestsData>;
  updateInterest(topic: TopicKey, action: InterestAction): Promise<void>;
  setPreferences(preferences: Preferences): Promise<void>;
  /** Latest existing conversation for a discovery, without creating one. */
  findConversation(discoveryId: string): Promise<ConversationThread | null>;
  openConversation(discoveryId: string, forceNew?: boolean): Promise<ConversationThread>;
  getConversation(id: string): Promise<ConversationThread>;
  sendMessage(
    conversationId: string,
    content: string,
    opts?: { starter?: boolean },
  ): Promise<{ userMessage: Message; assistantMessage: Message }>;
  setPinned(messageId: string, pinned: boolean): Promise<Message>;
  getMoreQuestions(discoveryId: string): Promise<{ questions: string[]; isMock: boolean }>;
}

export interface CurioServiceDeps {
  repo: CurioRepository;
  ai: AIResponder;
  now?: () => number;
  newId?: () => string;
}

const DAY = 86_400_000;
const INTEREST_DISPLAY_THRESHOLD = 0.05;

export function toDiscoveryContext(d: Discovery): DiscoveryContext {
  return { slug: d.slug, title: d.title, summary: d.summary, category: d.category, tags: d.tags, source: d.source };
}

export function sanitizeQuestions(list: string[], exclude: string[] = [], max: number = LIMITS.maxQuestions): string[] {
  const seen = new Set(exclude.map((q) => q.toLowerCase()));
  const out: string[] = [];
  for (const raw of list) {
    const q = raw.replace(/\s+/g, " ").trim().replace(/^[-*\d.)\s]+/, "");
    if (q.length < 8 || q.length > 200 || seen.has(q.toLowerCase())) continue;
    seen.add(q.toLowerCase());
    out.push(q.endsWith("?") ? q : `${q}?`);
    if (out.length >= max) break;
  }
  return out;
}

/** Business logic shared by demo (browser + localStorage) and cloud (server + Supabase) modes. */
export class CurioService implements CurioApi {
  private readonly repo: CurioRepository;
  private readonly ai: AIResponder;
  private readonly now: () => number;
  private readonly newId: () => string;

  constructor(deps: CurioServiceDeps) {
    this.repo = deps.repo;
    this.ai = deps.ai;
    this.now = deps.now ?? Date.now;
    this.newId = deps.newId ?? (() => crypto.randomUUID());
  }

  private get userId() {
    return this.repo.userId;
  }

  private async requireDiscovery(id: string): Promise<Discovery> {
    const [d] = await this.repo.getDiscoveriesByIds([id]);
    if (!d || d.status !== "published") throw new NotFoundError("Discovery");
    return d;
  }

  private async recentInteractions(days = 30) {
    return this.repo.listInteractions({ since: this.now() - days * DAY, limit: 1000 });
  }

  private feedbackFor(interactions: { discoveryId: string; type: InteractionType; at: number }[], id: string) {
    const last = interactions
      .filter((i) => i.discoveryId === id && (i.type === "positive" || i.type === "negative"))
      .sort((a, b) => b.at - a.at)[0];
    return last ? (last.type as "positive" | "negative") : null;
  }

  async getFeed(req: { excludeIds: string[]; limit: number }): Promise<FeedPage> {
    const [candidates, interests, interactions, saved] = await Promise.all([
      this.repo.listPublishedDiscoveries(),
      this.repo.listInterests(),
      this.recentInteractions(),
      this.repo.listSaved(),
    ]);
    const savedIds = new Set(saved.map((s) => s.discoveryId));
    const now = this.now();
    const result = rankFeed({
      candidates,
      interests,
      interactions,
      savedIds,
      excludeIds: new Set(req.excludeIds),
      limit: req.limit,
      now,
      seed: `${this.userId}:${Math.floor(now / DAY)}`,
    });
    return {
      items: result.items.map((r) => ({
        discovery: r.discovery,
        reason: r.reason,
        saved: savedIds.has(r.discovery.id),
        feedback: this.feedbackFor(interactions, r.discovery.id),
      })),
      hasMore: result.remaining > 0,
    };
  }

  async getDiscovery(slug: string): Promise<DiscoveryState | null> {
    const discovery = await this.repo.getDiscoveryBySlug(slug);
    if (!discovery || discovery.status !== "published") return null;
    const [saved, interactions] = await Promise.all([this.repo.listSaved(), this.recentInteractions(365)]);
    return {
      discovery,
      saved: saved.some((s) => s.discoveryId === discovery.id),
      feedback: this.feedbackFor(interactions, discovery.id),
    };
  }

  private async learnFrom(discovery: Discovery, type: InteractionType, at: number) {
    const changed = applyInteraction(await this.repo.listInterests(), discovery, type, at);
    if (changed.length) await this.repo.upsertInterests(changed);
  }

  async recordInteractions(events: InteractionEvent[]): Promise<void> {
    if (!events.length) return;
    const discoveries = await this.repo.getDiscoveriesByIds([...new Set(events.map((e) => e.discoveryId))]);
    const byId = new Map(discoveries.map((d) => [d.id, d]));
    let interests = await this.repo.listInterests();
    const changed = new Map<TopicKey, (typeof interests)[number]>();
    for (const event of events) {
      const d = byId.get(event.discoveryId);
      if (!d) continue;
      const at = this.now();
      await this.repo.addInteraction({ discoveryId: d.id, type: event.type, at, metadata: event.metadata });
      for (const entry of applyInteraction(interests, d, event.type, at)) changed.set(entry.topic, entry);
      interests = [...interests.filter((i) => !changed.has(i.topic)), ...changed.values()];
    }
    if (changed.size) await this.repo.upsertInterests([...changed.values()]);
  }

  async setSaved(discoveryId: string, saved: boolean): Promise<void> {
    const d = await this.requireDiscovery(discoveryId);
    const at = this.now();
    await this.repo.setSaved(d.id, saved, at);
    const type = saved ? "save" : "unsave";
    await this.repo.addInteraction({ discoveryId: d.id, type, at });
    await this.learnFrom(d, type, at);
  }

  async getSaved(): Promise<SavedData> {
    const [saved, pinned] = await Promise.all([this.repo.listSaved(), this.repo.listPinnedMessages(50)]);
    const conversations = new Map<string, NonNullable<Awaited<ReturnType<CurioRepository["getConversation"]>>>>();
    for (const m of pinned) {
      if (conversations.has(m.conversationId)) continue;
      const c = await this.repo.getConversation(m.conversationId);
      if (c && c.userId === this.userId) conversations.set(c.id, c);
    }
    const ids = [...new Set([...saved.map((s) => s.discoveryId), ...[...conversations.values()].map((c) => c.discoveryId)])];
    const byId = new Map((await this.repo.getDiscoveriesByIds(ids)).map((d) => [d.id, d]));
    return {
      discoveries: saved
        .sort((a, b) => b.savedAt - a.savedAt)
        .flatMap((s) => {
          const discovery = byId.get(s.discoveryId);
          return discovery ? [{ discovery, savedAt: s.savedAt }] : [];
        }),
      insights: pinned.flatMap((message) => {
        const conversation = conversations.get(message.conversationId);
        const discovery = conversation && byId.get(conversation.discoveryId);
        return conversation && discovery ? [{ message, conversation, discovery }] : [];
      }),
    };
  }

  async getHistory(): Promise<HistoryData> {
    const [interactions, conversations] = await Promise.all([
      this.recentInteractions(90),
      this.repo.listConversations(30),
    ]);
    const opens = interactions
      .filter((i) => i.type === "open")
      .sort((a, b) => b.at - a.at)
      .filter((i, idx, arr) => arr.findIndex((x) => x.discoveryId === i.discoveryId) === idx)
      .slice(0, 30);
    const ids = [...new Set([...opens.map((o) => o.discoveryId), ...conversations.map((c) => c.discoveryId)])];
    const byId = new Map((await this.repo.getDiscoveriesByIds(ids)).map((d) => [d.id, d]));
    return {
      recentlyViewed: opens.flatMap((o) => {
        const discovery = byId.get(o.discoveryId);
        return discovery ? [{ discovery, at: o.at }] : [];
      }),
      conversations: conversations
        .sort((a, b) => b.updatedAt - a.updatedAt)
        .flatMap((conversation) => {
          const discovery = byId.get(conversation.discoveryId);
          return discovery ? [{ conversation, discovery }] : [];
        }),
    };
  }

  async getInterests(): Promise<InterestsData> {
    const [interests, interactions, published, preferences] = await Promise.all([
      this.repo.listInterests(),
      this.recentInteractions(30),
      this.repo.listPublishedDiscoveries(),
      this.repo.getPreferences(),
    ]);
    const byId = new Map(published.map((d) => [d.id, d]));
    const recentTopics: TopicOption[] = [];
    const seen = new Set<string>();
    const engaged = interactions
      .filter((i) => i.type !== "impression" && i.type !== "dismiss" && i.type !== "negative")
      .sort((a, b) => b.at - a.at);
    for (const i of engaged) {
      const d = byId.get(i.discoveryId);
      if (!d) continue;
      for (const topic of [categoryTopic(d.category), ...d.tags.slice(0, 2).map(tagTopic)]) {
        if (seen.has(topic)) continue;
        seen.add(topic);
        recentTopics.push({ topic, label: topicLabel(topic) });
      }
      if (recentTopics.length >= 12) break;
    }
    return {
      interests: interests
        .filter((i) => i.source === "explicit" || Math.abs(i.weight) >= INTEREST_DISPLAY_THRESHOLD)
        .sort((a, b) => b.weight - a.weight)
        .map((i) => ({ ...i, label: topicLabel(i.topic) })),
      recentTopics: recentTopics.slice(0, 12),
      catalog: buildCatalog(published),
      preferences,
    };
  }

  async updateInterest(topic: TopicKey, action: InterestAction): Promise<void> {
    const catalog = buildCatalog(await this.repo.listPublishedDiscoveries());
    if (!catalog.some((c) => c.topic === topic)) throw new ValidationError("Unknown topic.");
    if (action === "reset") await this.repo.deleteInterest(topic);
    else await this.repo.upsertInterests([explicitInterest(topic, action, this.now())]);
  }

  async setPreferences(preferences: Preferences): Promise<void> {
    await this.repo.setPreferences(preferences);
  }

  private async thread(conversationId: string): Promise<ConversationThread> {
    const conversation = await this.repo.getConversation(conversationId);
    // Ownership check: repositories are user-scoped, but never rely on that alone.
    if (!conversation || conversation.userId !== this.userId) throw new NotFoundError("Conversation");
    const [discovery] = await this.repo.getDiscoveriesByIds([conversation.discoveryId]);
    if (!discovery) throw new NotFoundError("Discovery");
    const messages = (await this.repo.listMessages(conversation.id)).sort((a, b) => a.createdAt - b.createdAt);
    return { conversation, discovery, messages };
  }

  async findConversation(discoveryId: string): Promise<ConversationThread | null> {
    const existing = await this.repo.findLatestConversation(discoveryId);
    return existing ? this.thread(existing.id) : null;
  }

  async openConversation(discoveryId: string, forceNew = false): Promise<ConversationThread> {
    const discovery = await this.requireDiscovery(discoveryId);
    if (!forceNew) {
      const existing = await this.repo.findLatestConversation(discovery.id);
      if (existing) return this.thread(existing.id);
    }
    const at = this.now();
    const conversation = {
      id: this.newId(),
      userId: this.userId,
      discoveryId: discovery.id,
      title: discovery.title,
      createdAt: at,
      updatedAt: at,
    };
    await this.repo.createConversation(conversation);
    await this.repo.addInteraction({ discoveryId: discovery.id, type: "conversation_start", at });
    await this.learnFrom(discovery, "conversation_start", at);
    return { conversation, discovery, messages: [] };
  }

  getConversation(id: string): Promise<ConversationThread> {
    return this.thread(id);
  }

  async sendMessage(conversationId: string, content: string, opts: { starter?: boolean } = {}) {
    const text = content.trim();
    if (!text) throw new ValidationError("Message cannot be empty.");
    if (text.length > LIMITS.messageChars) throw new ValidationError(`Messages are limited to ${LIMITS.messageChars} characters.`);

    const { conversation, discovery, messages } = await this.thread(conversationId);
    const preferences = await this.repo.getPreferences();
    const history = messages.slice(-LIMITS.historyTurns).map((m) => ({
      role: m.role,
      content: m.content.slice(0, LIMITS.historyTurnChars),
    }));

    let answer;
    try {
      answer = await this.ai.answer({
        discovery: toDiscoveryContext(discovery),
        history,
        message: text,
        explanationStyle: preferences.explanationStyle,
      });
    } catch (err) {
      if (err instanceof AIUnavailableError) throw err;
      throw new AIUnavailableError();
    }

    // Persist only after a successful answer so a failed request can simply be retried.
    const at = this.now();
    const userMessage: Message = {
      id: this.newId(),
      conversationId: conversation.id,
      role: "user",
      content: text,
      createdAt: at,
      isMock: false,
      suggestions: [],
      pinned: false,
    };
    const assistantMessage: Message = {
      id: this.newId(),
      conversationId: conversation.id,
      role: "assistant",
      content: answer.content.trim().slice(0, 8000),
      createdAt: at + 1,
      isMock: answer.isMock,
      suggestions: sanitizeQuestions(answer.suggestions, [text], 3),
      pinned: false,
    };
    await this.repo.addMessages([userMessage, assistantMessage]);
    await this.repo.touchConversation(conversation.id, at + 1);
    if (opts.starter) {
      await this.repo.addInteraction({
        discoveryId: discovery.id,
        type: "starter_question",
        at,
        metadata: { question: text.slice(0, 200) },
      });
      await this.learnFrom(discovery, "starter_question", at);
    }
    return { userMessage, assistantMessage };
  }

  async setPinned(messageId: string, pinned: boolean): Promise<Message> {
    const message = await this.repo.setMessagePinned(messageId, pinned);
    if (!message) throw new NotFoundError("Message");
    return message;
  }

  async getMoreQuestions(discoveryId: string): Promise<{ questions: string[]; isMock: boolean }> {
    const discovery = await this.requireDiscovery(discoveryId);
    const cached = discovery.generatedQuestions ?? [];
    if (cached.length >= 3) return { questions: cached, isMock: false };
    let result;
    try {
      result = await this.ai.generateQuestions({
        discovery: toDiscoveryContext(discovery),
        existing: discovery.starterQuestions,
        count: 4,
      });
    } catch (err) {
      if (err instanceof AIUnavailableError) throw err;
      throw new AIUnavailableError();
    }
    const questions = sanitizeQuestions(result.questions, discovery.starterQuestions, 4);
    // Mock questions are never cached, so a real provider can replace them later.
    if (!result.isMock && questions.length) await this.repo.saveGeneratedQuestions(discovery.id, questions);
    return { questions, isMock: result.isMock };
  }
}
