import { describe, expect, it } from "vitest";
import { RateLimiter } from "@/lib/server/rate-limit";

describe("RateLimiter", () => {
  it("blocks after the limit and recovers after the window", () => {
    let now = 0;
    const limiter = new RateLimiter(() => now);
    const rule = { limit: 2, windowMs: 1000 };
    expect(limiter.check("k", rule).ok).toBe(true);
    expect(limiter.check("k", rule).ok).toBe(true);
    const blocked = limiter.check("k", rule);
    expect(blocked.ok).toBe(false);
    expect(blocked.retryAfterSeconds).toBe(1);
    expect(limiter.check("other", rule).ok).toBe(true);
    now = 1001;
    expect(limiter.check("k", rule).ok).toBe(true);
  });
});
