import "server-only";

export type StorageMode = "demo" | "cloud";
export type AIMode = "live" | "mock";

export function getStorageMode(): StorageMode {
  if (process.env.CURIO_FORCE_DEMO === "1" || process.env.CURIO_FORCE_DEMO === "true") return "demo";
  return process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? "cloud" : "demo";
}

export function getSupabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) throw new Error("Supabase is not configured");
  return { url, anonKey, serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || undefined };
}

const REASONING_EFFORTS = ["none", "minimal", "low", "medium", "high"] as const;

export function getAIProviderConfig() {
  const apiKey = process.env.AI_API_KEY;
  if (!apiKey || process.env.CURIO_FORCE_DEMO === "1") return null;
  const effort = process.env.AI_REASONING_EFFORT as (typeof REASONING_EFFORTS)[number] | undefined;
  const maxTokens = Number(process.env.AI_MAX_OUTPUT_TOKENS);
  return {
    apiKey,
    baseUrl: process.env.AI_BASE_URL || "https://api.openai.com/v1",
    model: process.env.AI_MODEL || "gpt-4o-mini",
    reasoningEffort: effort && REASONING_EFFORTS.includes(effort) ? effort : undefined,
    maxOutputTokens: Number.isInteger(maxTokens) && maxTokens > 0 && maxTokens <= 32_000 ? maxTokens : undefined,
  };
}

/**
 * Demo mode has no authentication, so a production demo deployment only calls the paid
 * provider when explicitly allowed (and is still rate limited).
 */
export function getAIMode(mode: StorageMode = getStorageMode()): AIMode {
  if (!getAIProviderConfig()) return "mock";
  if (mode === "demo" && process.env.NODE_ENV === "production" && process.env.DEMO_ALLOW_LIVE_AI !== "true") {
    return "mock";
  }
  return "live";
}
