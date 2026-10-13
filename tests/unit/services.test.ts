import { describe, expect, it, vi } from "vitest";
import { MockAI, MOCK_NOTICE } from "@/lib/ai/mock";
import { OpenAICompatibleAI } from "@/lib/ai/openai-compatible";
import { parseAnswer } from "@/lib/ai/prompt";
import { AIUnavailableError, type AIResponder } from "@/lib/ai/types";
import { CurioService } from "@/lib/services/curio-service";
import { createDemoRepository, DEMO_STORAGE_KEY, type KeyValueStorage } from "@/lib/storage/demo-storage";
import { emptyData, MemoryRepository } from "@/lib/storage/memory-repository";
import { LIBRARY, NOW } from "./fixtures";

let counter = 0;
const deps = () => ({ now: () => NOW + counter++, newId: () => `id-${++counter}` });

function memoryStorage(): KeyValueStorage & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => void data.set(k, v),
    removeItem: (k) => void data.delete(k),
  };
}

const failingAI: AIResponder = {
  answer: async () => {
    throw new Error("upstream exploded with secret sk-123");
  },
  generateQuestions: async () => {
    throw new AIUnavailableError();
  },
};

describe("conversation ownership", () => {
  it("prevents one user from reading or writing another user's conversation", async () => {
    const shared = emptyData();
    const alice = new CurioService({ repo: new MemoryRepository("alice", LIBRARY, shared), ai: new MockAI(), ...deps() });
    const bob = new CurioService({ repo: new MemoryRepository("bob", LIBRARY, shared), ai: new MockAI(), ...deps() });

    const thread = await alice.openConversation("space-1");
    await alice.sendMessage(thread.conversation.id, "What is it?");

    await expect(bob.getConversation(thread.conversation.id)).rejects.toThrow("Conversation not found");
    await expect(bob.sendMessage(thread.conversation.id, "Let me in")).rejects.toThrow("Conversation not found");
    expect(await bob.findConversation("space-1")).toBeNull();
    expect((await alice.getConversation(thread.conversation.id)).messages).toHaveLength(2);
  });

  it("rejects a repository that returns a conversation owned by someone else", async () => {
    const repo = new MemoryRepository("bob", LIBRARY);
    repo.getConversation = async () => ({ id: "c1", userId: "alice", discoveryId: "space-1", title: "x", createdAt: 0, updatedAt: 0 });
    const bob = new CurioService({ repo, ai: new MockAI(), ...deps() });
    await expect(bob.getConversation("c1")).rejects.toThrow("Conversation not found");
  });

  it("does not let a user pin another user's message", async () => {
    const shared = emptyData();
    const alice = new CurioService({ repo: new MemoryRepository("alice", LIBRARY, shared), ai: new MockAI(), ...deps() });
    const bob = new CurioService({ repo: new MemoryRepository("bob", LIBRARY, shared), ai: new MockAI(), ...deps() });
    const thread = await alice.openConversation("space-1");
    const { assistantMessage } = await alice.sendMessage(thread.conversation.id, "Hi");
    await expect(bob.setPinned(assistantMessage.id, true)).rejects.toThrow("Message not found");
  });
});

describe("demo-mode storage", () => {
  it("persists saves, interests and conversations across reloads", async () => {
    const storage = memoryStorage();
    const first = new CurioService({ repo: createDemoRepository(storage, LIBRARY), ai: new MockAI(), ...deps() });
    await first.setSaved("nat-1", true);
    const thread = await first.openConversation("nat-1");
    await first.sendMessage(thread.conversation.id, "How deep?", { starter: true });
    expect(storage.data.has(DEMO_STORAGE_KEY)).toBe(true);

    const reloaded = new CurioService({ repo: createDemoRepository(storage, LIBRARY), ai: new MockAI(), ...deps() });
    expect((await reloaded.getDiscovery("nat-1"))?.saved).toBe(true);
    expect((await reloaded.getSaved()).discoveries.map((d) => d.discovery.id)).toEqual(["nat-1"]);
    expect((await reloaded.getConversation(thread.conversation.id)).messages).toHaveLength(2);
    const interests = await reloaded.getInterests();
    expect(interests.interests.find((i) => i.topic === "category:nature")?.weight).toBeGreaterThan(0.3);
  });

  it("recovers from corrupted storage", async () => {
    const storage = memoryStorage();
    storage.setItem(DEMO_STORAGE_KEY, "{not json");
    const service = new CurioService({ repo: createDemoRepository(storage, LIBRARY), ai: new MockAI(), ...deps() });
    expect((await service.getSaved()).discoveries).toEqual([]);
  });

  it("drops impressions when storage is full rather than failing", async () => {
    const storage = memoryStorage();
    let calls = 0;
    storage.setItem = (k, v) => {
      calls++;
      if (calls === 2) throw new Error("QuotaExceededError");
      storage.data.set(k, v);
    };
    const service = new CurioService({ repo: createDemoRepository(storage, LIBRARY), ai: new MockAI(), ...deps() });
    await service.recordInteractions([{ discoveryId: "nat-1", type: "impression" }]);
    await service.setSaved("nat-1", true);
    expect(JSON.parse(storage.data.get(DEMO_STORAGE_KEY)!).saved).toHaveLength(1);
  });

  it("updates the feed after a dismissal", async () => {
    const service = new CurioService({ repo: createDemoRepository(memoryStorage(), LIBRARY), ai: new MockAI(), ...deps() });
    const before = await service.getFeed({ excludeIds: [], limit: 50 });
    const target = before.items[0]!.discovery.id;
    await service.recordInteractions([{ discoveryId: target, type: "dismiss" }]);
    const after = await service.getFeed({ excludeIds: [], limit: 50 });
    expect(after.items.map((i) => i.discovery.id)).not.toContain(target);
  });
});

describe("AI failure handling", () => {
  it("turns provider errors into a safe error and stores nothing", async () => {
    const service = new CurioService({ repo: new MemoryRepository("u", LIBRARY), ai: failingAI, ...deps() });
    const thread = await service.openConversation("space-1");
    const error = await service.sendMessage(thread.conversation.id, "Hello").catch((e: unknown) => e);
    expect(error).toBeInstanceOf(AIUnavailableError);
    expect((error as Error).message).not.toContain("sk-123");
    expect((await service.getConversation(thread.conversation.id)).messages).toHaveLength(0);
  });

  it("OpenAI-compatible adapter hides HTTP errors and API keys", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const fetchImpl = vi.fn(async () => new Response('{"error":"bad key sk-secret"}', { status: 401 })) as unknown as typeof fetch;
    const ai = new OpenAICompatibleAI({ apiKey: "sk-secret", baseUrl: "https://example.test/v1", model: "m", fetchImpl });
    const input = {
      discovery: { slug: "s", title: "T", summary: "S", category: "space", tags: [] },
      history: [],
      message: "Hi",
      explanationStyle: "balanced" as const,
    };
    const error = await ai.answer(input).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(AIUnavailableError);
    expect(String((error as Error).message)).not.toContain("sk-secret");
    expect(errorSpy.mock.calls.flat().join(" ")).not.toContain("sk-secret");
    errorSpy.mockRestore();
  });

  it("OpenAI-compatible adapter handles network failures and empty responses", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const input = {
      discovery: { slug: "s", title: "T", summary: "S", category: "space", tags: [] },
      history: [],
      message: "Hi",
      explanationStyle: "balanced" as const,
    };
    const network = new OpenAICompatibleAI({
      apiKey: "k", baseUrl: "https://x", model: "m",
      fetchImpl: (async () => { throw new TypeError("fetch failed"); }) as unknown as typeof fetch,
    });
    await expect(network.answer(input)).rejects.toBeInstanceOf(AIUnavailableError);
    const empty = new OpenAICompatibleAI({
      apiKey: "k", baseUrl: "https://x", model: "m",
      fetchImpl: (async () => Response.json({ choices: [] })) as unknown as typeof fetch,
    });
    await expect(empty.answer(input)).rejects.toBeInstanceOf(AIUnavailableError);
    vi.restoreAllMocks();
  });

  it("sends reasoning_effort and max_tokens only when configured", async () => {
    const bodies: Record<string, unknown>[] = [];
    const fetchImpl = (async (_url: string, init: RequestInit) => {
      bodies.push(JSON.parse(String(init.body)));
      return Response.json({ choices: [{ message: { content: "Answer." } }] });
    }) as unknown as typeof fetch;
    const input = {
      discovery: { slug: "s", title: "T", summary: "S", category: "space", tags: [] },
      history: [],
      message: "Hi",
      explanationStyle: "balanced" as const,
    };
    await new OpenAICompatibleAI({ apiKey: "k", baseUrl: "https://x", model: "m", fetchImpl }).answer(input);
    await new OpenAICompatibleAI({
      apiKey: "k", baseUrl: "https://x/", model: "gemini", reasoningEffort: "low", maxOutputTokens: 4000, fetchImpl,
    }).answer(input);
    expect(bodies[0]).not.toHaveProperty("reasoning_effort");
    expect(bodies[0]!.max_tokens).toBe(700);
    expect(bodies[1]).toMatchObject({ reasoning_effort: "low", max_tokens: 4000, model: "gemini" });
  });

  describe("fallback model", () => {
    const input = {
      discovery: { slug: "s", title: "T", summary: "S", category: "space", tags: [] },
      history: [],
      message: "Hi",
      explanationStyle: "balanced" as const,
    };
    const recordingFetch = (statusFor: (model: string) => number) => {
      const models: string[] = [];
      const fetchImpl = (async (_url: string, init: RequestInit) => {
        const model = JSON.parse(String(init.body)).model as string;
        models.push(model);
        const status = statusFor(model);
        return status === 200
          ? Response.json({ choices: [{ message: { content: `from ${model}` } }] })
          : new Response("{}", { status });
      }) as unknown as typeof fetch;
      return { models, fetchImpl };
    };

    it("retries once with the fallback model when the primary is overloaded", async () => {
      vi.spyOn(console, "error").mockImplementation(() => {});
      vi.spyOn(console, "warn").mockImplementation(() => {});
      const { models, fetchImpl } = recordingFetch((m) => (m === "primary" ? 503 : 200));
      const ai = new OpenAICompatibleAI({ apiKey: "k", baseUrl: "https://x", model: "primary", fallbackModel: "backup", fetchImpl });
      const answer = await ai.answer(input);
      expect(models).toEqual(["primary", "backup"]);
      expect(answer.content).toBe("from backup");
      vi.restoreAllMocks();
    });

    it("does not fall back on non-retryable errors such as a bad key", async () => {
      vi.spyOn(console, "error").mockImplementation(() => {});
      const { models, fetchImpl } = recordingFetch(() => 401);
      const ai = new OpenAICompatibleAI({ apiKey: "k", baseUrl: "https://x", model: "primary", fallbackModel: "backup", fetchImpl });
      await expect(ai.answer(input)).rejects.toBeInstanceOf(AIUnavailableError);
      expect(models).toEqual(["primary"]);
      vi.restoreAllMocks();
    });

    it("returns a friendly busy message when both models are rate limited", async () => {
      vi.spyOn(console, "error").mockImplementation(() => {});
      vi.spyOn(console, "warn").mockImplementation(() => {});
      const { models, fetchImpl } = recordingFetch(() => 429);
      const ai = new OpenAICompatibleAI({ apiKey: "k", baseUrl: "https://x", model: "primary", fallbackModel: "backup", fetchImpl });
      const error = await ai.answer(input).catch((e: unknown) => e);
      expect(error).toBeInstanceOf(AIUnavailableError);
      expect((error as Error).message).toMatch(/busy/);
      expect(models).toEqual(["primary", "backup"]);
      vi.restoreAllMocks();
    });
  });

  it("parses answers and follow-up suggestions from the model", async () => {
    const fetchImpl = (async () =>
      Response.json({
        choices: [{ message: { content: 'Black holes form from collapse.\n<follow_ups>["Why?","How big?"]</follow_ups>' } }],
      })) as unknown as typeof fetch;
    const ai = new OpenAICompatibleAI({ apiKey: "k", baseUrl: "https://x", model: "m", fetchImpl });
    const answer = await ai.answer({
      discovery: { slug: "s", title: "T", summary: "S", category: "space", tags: [] },
      history: [],
      message: "Hi",
      explanationStyle: "balanced",
    });
    expect(answer).toEqual({ content: "Black holes form from collapse.", suggestions: ["Why?", "How big?"], isMock: false });
    expect(parseAnswer("No suggestions here").suggestions).toEqual([]);
  });

  it("labels mock responses clearly and never caches mock questions", async () => {
    const repo = new MemoryRepository("u", LIBRARY);
    const service = new CurioService({ repo, ai: new MockAI(), ...deps() });
    const thread = await service.openConversation("space-1");
    const { assistantMessage } = await service.sendMessage(thread.conversation.id, "Tell me more");
    expect(assistantMessage.isMock).toBe(true);
    expect(assistantMessage.content).toContain(MOCK_NOTICE);
    const questions = await service.getMoreQuestions("space-1");
    expect(questions.isMock).toBe(true);
    expect((await repo.getDiscoveriesByIds(["space-1"]))[0]!.generatedQuestions).toBeUndefined();
  });
});
