import type { CurioApi, InteractionEvent } from "../services/curio-service";
import type { Preferences, TopicKey, InterestAction } from "../types";
import { ApiError } from "./api-error";

async function request<T>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, {
      method: init.method ?? "GET",
      headers: init.body !== undefined ? { "Content-Type": "application/json" } : undefined,
      body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
      credentials: "same-origin",
      cache: "no-store",
    });
  } catch {
    throw new ApiError(0, "Could not reach Curio. Check your connection and try again.");
  }
  const data = (await res.json().catch(() => ({}))) as { error?: string } & T;
  if (res.status === 401 && typeof window !== "undefined" && !window.location.pathname.startsWith("/login")) {
    window.location.replace(`/login?next=${encodeURIComponent(window.location.pathname)}`);
  }
  if (!res.ok) throw new ApiError(res.status, data.error ?? "Request failed.");
  return data;
}

const enc = encodeURIComponent;

/** Cloud-mode client: every operation runs server-side against Supabase as the signed-in user. */
export function createHttpApi(): CurioApi {
  return {
    getFeed: (req) => request("/api/feed", { method: "POST", body: req }),
    getDiscovery: async (slug) => {
      try {
        return await request(`/api/discoveries/${enc(slug)}`);
      } catch (err) {
        if (err instanceof ApiError && err.status === 404) return null;
        throw err;
      }
    },
    recordInteractions: async (events: InteractionEvent[]) => {
      await request("/api/interactions", { method: "POST", body: { events } });
    },
    setSaved: async (discoveryId, saved) => {
      await request("/api/saved", { method: "PUT", body: { discoveryId, saved } });
    },
    getSaved: () => request("/api/saved"),
    getHistory: () => request("/api/history"),
    getInterests: () => request("/api/interests"),
    updateInterest: async (topic: TopicKey, action: InterestAction) => {
      await request("/api/interests", { method: "PATCH", body: { topic, action } });
    },
    setPreferences: async (preferences: Preferences) => {
      await request("/api/preferences", { method: "PUT", body: preferences });
    },
    findConversation: async (discoveryId) =>
      (await request<{ thread: Awaited<ReturnType<CurioApi["findConversation"]>> }>(
        `/api/conversations?discoveryId=${enc(discoveryId)}`,
      )).thread,
    openConversation: (discoveryId, forceNew) =>
      request("/api/conversations", { method: "POST", body: { discoveryId, forceNew } }),
    getConversation: (id) => request(`/api/conversations/${enc(id)}`),
    sendMessage: (conversationId, content, opts) =>
      request(`/api/conversations/${enc(conversationId)}/messages`, {
        method: "POST",
        body: { content, starter: opts?.starter },
      }),
    setPinned: (messageId, pinned) => request(`/api/messages/${enc(messageId)}`, { method: "PATCH", body: { pinned } }),
    getMoreQuestions: (discoveryId) => request("/api/questions", { method: "POST", body: { discoveryId } }),
  };
}
