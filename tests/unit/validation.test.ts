import { describe, expect, it } from "vitest";
import {
  demoChatSchema,
  feedRequestSchema,
  interactionsRequestSchema,
  interestUpdateSchema,
  sendMessageSchema,
} from "@/lib/validation";

describe("request validation", () => {
  it("applies feed defaults and bounds", () => {
    expect(feedRequestSchema.parse({})).toEqual({ excludeIds: [], limit: 8 });
    expect(feedRequestSchema.safeParse({ limit: 500 }).success).toBe(false);
    expect(feedRequestSchema.safeParse({ excludeIds: ["../etc/passwd"] }).success).toBe(false);
  });

  it("accepts known interaction types only, and rejects save via the interactions route", () => {
    expect(interactionsRequestSchema.safeParse({ events: [{ discoveryId: "abc", type: "open" }] }).success).toBe(true);
    expect(interactionsRequestSchema.safeParse({ events: [{ discoveryId: "abc", type: "hack" }] }).success).toBe(false);
    expect(interactionsRequestSchema.safeParse({ events: [{ discoveryId: "abc", type: "save" }] }).success).toBe(false);
    expect(interactionsRequestSchema.safeParse({ events: [] }).success).toBe(false);
  });

  it("limits interaction metadata", () => {
    const tooMany = Object.fromEntries(Array.from({ length: 6 }, (_, i) => [`k${i}`, "v"]));
    expect(
      interactionsRequestSchema.safeParse({ events: [{ discoveryId: "a", type: "open", metadata: tooMany }] }).success,
    ).toBe(false);
  });

  it("enforces message length and trims whitespace", () => {
    expect(sendMessageSchema.parse({ content: "  hi there  " }).content).toBe("hi there");
    expect(sendMessageSchema.safeParse({ content: "   " }).success).toBe(false);
    expect(sendMessageSchema.safeParse({ content: "x".repeat(2001) }).success).toBe(false);
  });

  it("validates topic keys", () => {
    expect(interestUpdateSchema.safeParse({ topic: "category:space", action: "follow" }).success).toBe(true);
    expect(interestUpdateSchema.safeParse({ topic: "tag:Black Holes", action: "follow" }).success).toBe(false);
    expect(interestUpdateSchema.safeParse({ topic: "religion:x", action: "follow" }).success).toBe(false);
    expect(interestUpdateSchema.safeParse({ topic: "tag:x", action: "delete-all" }).success).toBe(false);
  });

  it("bounds demo chat history", () => {
    const history = Array.from({ length: 13 }, () => ({ role: "user", content: "q" }));
    expect(demoChatSchema.safeParse({ discoverySlug: "auroras", message: "hi", history }).success).toBe(false);
    expect(demoChatSchema.safeParse({ discoverySlug: "auroras", message: "hi", history: [{ role: "system", content: "x" }] }).success).toBe(false);
  });
});
