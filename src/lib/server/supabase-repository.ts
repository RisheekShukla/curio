import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { AppError } from "../errors";
import type { CurioRepository } from "../services/repository";
import { createSupabaseAdminClient } from "../supabase/server";
import {
  DEFAULT_PREFERENCES,
  type Category,
  type Conversation,
  type ContentStatus,
  type Discovery,
  type InteractionType,
  type InterestEntry,
  type Interaction,
  type Message,
  type Preferences,
  type TopicKey,
} from "../types";

interface DiscoveryRow {
  id: string;
  slug: string;
  title: string;
  summary: string;
  category: Category;
  tags: string[];
  image_url: string | null;
  image_alt: string | null;
  image_credit: string | null;
  image_license: string | null;
  image_license_url: string | null;
  image_source_url: string | null;
  starter_questions: string[];
  generated_questions: string[] | null;
  source_title: string | null;
  source_url: string | null;
  reading_minutes: number;
  status: ContentStatus;
}

interface ConversationRow {
  id: string;
  user_id: string;
  discovery_id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

interface MessageRow {
  id: string;
  conversation_id: string;
  role: "user" | "assistant";
  content: string;
  is_mock: boolean;
  suggestions: string[] | null;
  pinned: boolean;
  created_at: string;
}

const DISCOVERY_COLUMNS =
  "id, slug, title, summary, category, tags, image_url, image_alt, image_credit, image_license, image_license_url, image_source_url, starter_questions, generated_questions, source_title, source_url, reading_minutes, status";
const MESSAGE_COLUMNS = "id, conversation_id, role, content, is_mock, suggestions, pinned, created_at";

const iso = (ms: number) => new Date(ms).toISOString();
const ms = (value: string) => Date.parse(value);

/** Fallback cache for generated questions when no service-role key is configured. */
const questionCache = new Map<string, string[]>();

function check<T>(result: { data: T; error: { message: string; code?: string } | null }): T {
  if (result.error) {
    console.error(`[db] ${result.error.code ?? "error"}: ${result.error.message}`);
    throw new AppError(500, "A database error occurred. Please try again.");
  }
  return result.data;
}

function toDiscovery(row: DiscoveryRow): Discovery {
  const generated = row.generated_questions?.length ? row.generated_questions : questionCache.get(row.id);
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    summary: row.summary,
    category: row.category,
    tags: row.tags ?? [],
    image: row.image_url
      ? {
          url: row.image_url,
          alt: row.image_alt ?? "",
          credit: row.image_credit ?? undefined,
          license: row.image_license ?? undefined,
          licenseUrl: row.image_license_url ?? undefined,
          sourcePageUrl: row.image_source_url ?? undefined,
        }
      : null,
    starterQuestions: row.starter_questions ?? [],
    generatedQuestions: generated,
    source: row.source_title && row.source_url ? { title: row.source_title, url: row.source_url } : undefined,
    readingMinutes: row.reading_minutes,
    status: row.status,
  };
}

const toConversation = (r: ConversationRow): Conversation => ({
  id: r.id,
  userId: r.user_id,
  discoveryId: r.discovery_id,
  title: r.title,
  createdAt: ms(r.created_at),
  updatedAt: ms(r.updated_at),
});

const toMessage = (r: MessageRow): Message => ({
  id: r.id,
  conversationId: r.conversation_id,
  role: r.role,
  content: r.content,
  createdAt: ms(r.created_at),
  isMock: r.is_mock,
  suggestions: r.suggestions ?? [],
  pinned: r.pinned,
});

/**
 * Uses the signed-in user's session client, so row-level security applies to every query.
 * Explicit `user_id` filters are kept as defence in depth.
 */
export class SupabaseRepository implements CurioRepository {
  constructor(
    private readonly db: SupabaseClient,
    readonly userId: string,
  ) {}

  async listPublishedDiscoveries() {
    const rows = check(
      await this.db.from("discoveries").select(DISCOVERY_COLUMNS).eq("status", "published").limit(1000),
    );
    return (rows as DiscoveryRow[]).map(toDiscovery);
  }

  async getDiscoveryBySlug(slug: string) {
    const row = check(await this.db.from("discoveries").select(DISCOVERY_COLUMNS).eq("slug", slug).maybeSingle());
    return row ? toDiscovery(row as DiscoveryRow) : null;
  }

  async getDiscoveriesByIds(ids: string[]) {
    const valid = ids.filter((id) => /^[0-9a-f-]{36}$/i.test(id));
    if (!valid.length) return [];
    const rows = check(await this.db.from("discoveries").select(DISCOVERY_COLUMNS).in("id", valid));
    return (rows as DiscoveryRow[]).map(toDiscovery);
  }

  async saveGeneratedQuestions(discoveryId: string, questions: string[]) {
    const admin = createSupabaseAdminClient();
    if (!admin) {
      questionCache.set(discoveryId, questions);
      return;
    }
    check(await admin.from("discoveries").update({ generated_questions: questions }).eq("id", discoveryId));
  }

  async listInteractions({ since, limit }: { since: number; limit: number }) {
    const rows = check(
      await this.db
        .from("interactions")
        .select("discovery_id, event_type, metadata, created_at")
        .eq("user_id", this.userId)
        .gte("created_at", iso(since))
        .order("created_at", { ascending: false })
        .limit(limit),
    ) as { discovery_id: string; event_type: InteractionType; metadata: Record<string, string> | null; created_at: string }[];
    return rows.map(
      (r): Interaction => ({
        discoveryId: r.discovery_id,
        type: r.event_type,
        at: ms(r.created_at),
        metadata: r.metadata ?? undefined,
      }),
    );
  }

  async addInteraction(i: Interaction) {
    check(
      await this.db.from("interactions").insert({
        user_id: this.userId,
        discovery_id: i.discoveryId,
        event_type: i.type,
        metadata: i.metadata ?? {},
        created_at: iso(i.at),
      }),
    );
  }

  async listInterests() {
    const rows = check(
      await this.db.from("user_interests").select("topic, weight, source, updated_at").eq("user_id", this.userId),
    ) as { topic: TopicKey; weight: number; source: "explicit" | "inferred"; updated_at: string }[];
    return rows.map(
      (r): InterestEntry => ({ topic: r.topic, weight: Number(r.weight), source: r.source, updatedAt: ms(r.updated_at) }),
    );
  }

  async upsertInterests(entries: InterestEntry[]) {
    if (!entries.length) return;
    check(
      await this.db.from("user_interests").upsert(
        entries.map((e) => ({
          user_id: this.userId,
          topic: e.topic,
          weight: e.weight,
          source: e.source,
          updated_at: iso(e.updatedAt),
        })),
        { onConflict: "user_id,topic" },
      ),
    );
  }

  async deleteInterest(topic: TopicKey) {
    check(await this.db.from("user_interests").delete().eq("user_id", this.userId).eq("topic", topic));
  }

  async listSaved() {
    const rows = check(
      await this.db.from("saved_discoveries").select("discovery_id, created_at").eq("user_id", this.userId),
    ) as { discovery_id: string; created_at: string }[];
    return rows.map((r) => ({ discoveryId: r.discovery_id, savedAt: ms(r.created_at) }));
  }

  async setSaved(discoveryId: string, saved: boolean, at: number) {
    if (saved) {
      check(
        await this.db
          .from("saved_discoveries")
          .upsert({ user_id: this.userId, discovery_id: discoveryId, created_at: iso(at) }, { onConflict: "user_id,discovery_id" }),
      );
    } else {
      check(
        await this.db.from("saved_discoveries").delete().eq("user_id", this.userId).eq("discovery_id", discoveryId),
      );
    }
  }

  async getPreferences(): Promise<Preferences> {
    const row = check(
      await this.db.from("profiles").select("display_preferences").eq("id", this.userId).maybeSingle(),
    ) as { display_preferences: Partial<Preferences> | null } | null;
    const style = row?.display_preferences?.explanationStyle;
    return style === "simple" || style === "balanced" || style === "detailed"
      ? { explanationStyle: style }
      : DEFAULT_PREFERENCES;
  }

  async setPreferences(preferences: Preferences) {
    check(
      await this.db
        .from("profiles")
        .upsert({ id: this.userId, display_preferences: preferences }, { onConflict: "id" }),
    );
  }

  async listConversations(limit: number) {
    const rows = check(
      await this.db
        .from("conversations")
        .select("*")
        .eq("user_id", this.userId)
        .order("updated_at", { ascending: false })
        .limit(limit),
    );
    return (rows as ConversationRow[]).map(toConversation);
  }

  async getConversation(id: string) {
    if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
    const row = check(
      await this.db.from("conversations").select("*").eq("id", id).eq("user_id", this.userId).maybeSingle(),
    );
    return row ? toConversation(row as ConversationRow) : null;
  }

  async findLatestConversation(discoveryId: string) {
    const row = check(
      await this.db
        .from("conversations")
        .select("*")
        .eq("user_id", this.userId)
        .eq("discovery_id", discoveryId)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    );
    return row ? toConversation(row as ConversationRow) : null;
  }

  async createConversation(c: Conversation) {
    check(
      await this.db.from("conversations").insert({
        id: c.id,
        user_id: this.userId,
        discovery_id: c.discoveryId,
        title: c.title,
        created_at: iso(c.createdAt),
        updated_at: iso(c.updatedAt),
      }),
    );
  }

  async touchConversation(id: string, at: number) {
    check(
      await this.db.from("conversations").update({ updated_at: iso(at) }).eq("id", id).eq("user_id", this.userId),
    );
  }

  async listMessages(conversationId: string) {
    const rows = check(
      await this.db
        .from("messages")
        .select(MESSAGE_COLUMNS)
        .eq("conversation_id", conversationId)
        .eq("user_id", this.userId)
        .order("created_at", { ascending: true })
        .limit(500),
    );
    return (rows as MessageRow[]).map(toMessage);
  }

  async addMessages(messages: Message[]) {
    check(
      await this.db.from("messages").insert(
        messages.map((m) => ({
          id: m.id,
          conversation_id: m.conversationId,
          user_id: this.userId,
          role: m.role,
          content: m.content,
          is_mock: m.isMock,
          suggestions: m.suggestions,
          pinned: m.pinned,
          created_at: iso(m.createdAt),
        })),
      ),
    );
  }

  async setMessagePinned(messageId: string, pinned: boolean) {
    if (!/^[0-9a-f-]{36}$/i.test(messageId)) return null;
    const row = check(
      await this.db
        .from("messages")
        .update({ pinned })
        .eq("id", messageId)
        .eq("user_id", this.userId)
        .select(MESSAGE_COLUMNS)
        .maybeSingle(),
    );
    return row ? toMessage(row as MessageRow) : null;
  }

  async listPinnedMessages(limit: number) {
    const rows = check(
      await this.db
        .from("messages")
        .select(MESSAGE_COLUMNS)
        .eq("user_id", this.userId)
        .eq("pinned", true)
        .order("created_at", { ascending: false })
        .limit(limit),
    );
    return (rows as MessageRow[]).map(toMessage);
  }
}
