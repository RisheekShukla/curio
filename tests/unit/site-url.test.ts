import { describe, expect, it, vi } from "vitest";
import { resolveSiteUrl } from "@/lib/site-url";

describe("resolveSiteUrl", () => {
  it("accepts a full URL", () => {
    expect(resolveSiteUrl({ NEXT_PUBLIC_SITE_URL: "https://curio.example.com" }).href).toBe("https://curio.example.com/");
  });

  it("adds https:// to a bare domain", () => {
    expect(resolveSiteUrl({ NEXT_PUBLIC_SITE_URL: "curio-seety.vercel.app" }).href).toBe("https://curio-seety.vercel.app/");
  });

  it("falls back to Vercel's production domain, then localhost", () => {
    expect(resolveSiteUrl({ VERCEL_PROJECT_PRODUCTION_URL: "curio.vercel.app" }).origin).toBe("https://curio.vercel.app");
    expect(resolveSiteUrl({}).origin).toBe("http://localhost:3000");
  });

  it("ignores a malformed value instead of crashing the build", () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(resolveSiteUrl({ NEXT_PUBLIC_SITE_URL: "https://bad url with spaces" }).origin).toBe("http://localhost:3000");
    vi.restoreAllMocks();
  });
});
