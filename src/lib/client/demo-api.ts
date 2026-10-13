import { AIUnavailableError, type AIResponder, type AnswerInput, type QuestionsInput } from "../ai/types";
import { CurioService, type CurioApi } from "../services/curio-service";
import { createDemoRepository, DEMO_STORAGE_KEY } from "../storage/demo-storage";

async function post<T>(path: string, body: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
    });
  } catch {
    throw new AIUnavailableError("AI chat needs an internet connection. Please reconnect and try again.");
  }
  const data = (await res.json().catch(() => ({}))) as { error?: string } & T;
  if (!res.ok) throw new AIUnavailableError(data.error);
  return data;
}

/**
 * Demo-mode AI adapter. Only the slug is trusted server-side; the server looks up the
 * discovery itself rather than accepting arbitrary context from the browser.
 */
export class DemoHttpAI implements AIResponder {
  answer(input: AnswerInput) {
    return post<Awaited<ReturnType<AIResponder["answer"]>>>("/api/demo/chat", {
      discoverySlug: input.discovery.slug,
      message: input.message,
      history: input.history,
      explanationStyle: input.explanationStyle,
    });
  }

  generateQuestions(input: QuestionsInput) {
    return post<Awaited<ReturnType<AIResponder["generateQuestions"]>>>("/api/demo/questions", {
      discoverySlug: input.discovery.slug,
      existing: input.existing,
      count: input.count,
    });
  }
}

/** Demo-mode API: the shared CurioService running in the browser over localStorage. */
export function createDemoApi(): CurioApi {
  let service: Promise<CurioService> | null = null;
  const get = () =>
    (service ??= import("../content/seed-discoveries").then(
      ({ SEED_DISCOVERIES }) =>
        new CurioService({ repo: createDemoRepository(window.localStorage, SEED_DISCOVERIES), ai: new DemoHttpAI() }),
    ));

  // Another tab changed demo data: reload from storage on next use instead of overwriting it.
  window.addEventListener("storage", (e) => {
    if (e.key === DEMO_STORAGE_KEY || e.key === null) service = null;
  });

  const lazy = <K extends keyof CurioApi>(key: K): CurioApi[K] =>
    (async (...args: unknown[]) => {
      const s = await get();
      return (s[key] as (...a: unknown[]) => unknown).apply(s, args);
    }) as CurioApi[K];

  return {
    getFeed: lazy("getFeed"),
    getDiscovery: lazy("getDiscovery"),
    recordInteractions: lazy("recordInteractions"),
    setSaved: lazy("setSaved"),
    getSaved: lazy("getSaved"),
    getHistory: lazy("getHistory"),
    getInterests: lazy("getInterests"),
    updateInterest: lazy("updateInterest"),
    setPreferences: lazy("setPreferences"),
    findConversation: lazy("findConversation"),
    openConversation: lazy("openConversation"),
    getConversation: lazy("getConversation"),
    sendMessage: lazy("sendMessage"),
    setPinned: lazy("setPinned"),
    getMoreQuestions: lazy("getMoreQuestions"),
  };
}
