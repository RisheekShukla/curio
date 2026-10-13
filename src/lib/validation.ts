import { z } from "zod";
import { LIMITS } from "./ai/types";
import { INTERACTION_TYPES, type TopicKey } from "./types";

const id = z.string().min(1).max(100).regex(/^[A-Za-z0-9-]+$/, "Invalid identifier");
const slug = z.string().min(1).max(100).regex(/^[a-z0-9-]+$/, "Invalid slug");

export const explanationStyleSchema = z.enum(["simple", "balanced", "detailed"]);

export const feedRequestSchema = z.object({
  excludeIds: z.array(id).max(300).default([]),
  limit: z.number().int().min(1).max(24).default(8),
});

const recordableTypes = INTERACTION_TYPES.filter((t) => t !== "save" && t !== "unsave") as [
  Exclude<(typeof INTERACTION_TYPES)[number], "save" | "unsave">,
  ...Exclude<(typeof INTERACTION_TYPES)[number], "save" | "unsave">[],
];

export const interactionEventSchema = z.object({
  discoveryId: id,
  type: z.enum(recordableTypes),
  metadata: z
    .record(z.string().max(40), z.string().max(200))
    .refine((m) => Object.keys(m).length <= 5, "Too many metadata fields")
    .optional(),
});

export const interactionsRequestSchema = z.object({
  events: z.array(interactionEventSchema).min(1).max(30),
});

export const savedRequestSchema = z.object({ discoveryId: id, saved: z.boolean() });

export const topicSchema = z
  .string()
  .regex(/^(category|tag):[a-z0-9-]{1,40}$/, "Invalid topic")
  .transform((t) => t as TopicKey);

export const interestUpdateSchema = z.object({
  topic: topicSchema,
  action: z.enum(["follow", "mute", "reset"]),
});

export const preferencesSchema = z.object({ explanationStyle: explanationStyleSchema });

export const openConversationSchema = z.object({ discoveryId: id, forceNew: z.boolean().optional() });

const messageContent = z.string().trim().min(1, "Message cannot be empty").max(LIMITS.messageChars);

export const sendMessageSchema = z.object({ content: messageContent, starter: z.boolean().optional() });

export const pinMessageSchema = z.object({ pinned: z.boolean() });

export const demoChatSchema = z.object({
  discoverySlug: slug,
  message: messageContent,
  history: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().max(LIMITS.historyTurnChars) }))
    .max(LIMITS.historyTurns)
    .default([]),
  explanationStyle: explanationStyleSchema.default("balanced"),
});

export const demoQuestionsSchema = z.object({
  discoverySlug: slug,
  existing: z.array(z.string().max(200)).max(10).default([]),
  count: z.number().int().min(1).max(LIMITS.maxQuestions).default(4),
});

export const idParamSchema = id;
export const slugParamSchema = slug;
