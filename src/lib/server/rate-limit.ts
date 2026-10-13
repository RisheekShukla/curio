export interface RateLimitRule {
  limit: number;
  windowMs: number;
}

export const RATE_LIMITS = {
  chat: { limit: 20, windowMs: 60_000 },
  chatDaily: { limit: 300, windowMs: 86_400_000 },
  questions: { limit: 10, windowMs: 60_000 },
  writes: { limit: 240, windowMs: 60_000 },
} satisfies Record<string, RateLimitRule>;

const MAX_KEYS = 10_000;

/**
 * Lightweight in-process sliding-window limiter. It protects a single server instance; for a
 * multi-instance public deployment replace it with a shared store (e.g. Redis/Upstash).
 */
export class RateLimiter {
  private readonly hits = new Map<string, number[]>();

  constructor(private readonly now: () => number = Date.now) {}

  check(key: string, rule: RateLimitRule): { ok: boolean; retryAfterSeconds: number } {
    const now = this.now();
    const recent = (this.hits.get(key) ?? []).filter((t) => now - t < rule.windowMs);
    if (recent.length >= rule.limit) {
      this.hits.set(key, recent);
      return { ok: false, retryAfterSeconds: Math.ceil((rule.windowMs - (now - recent[0]!)) / 1000) };
    }
    recent.push(now);
    this.hits.delete(key);
    this.hits.set(key, recent);
    if (this.hits.size > MAX_KEYS) {
      const oldest = this.hits.keys().next().value;
      if (oldest !== undefined) this.hits.delete(oldest);
    }
    return { ok: true, retryAfterSeconds: 0 };
  }
}

export const rateLimiter = new RateLimiter();
