import "server-only";
import { MockAI } from "../ai/mock";
import { OpenAICompatibleAI } from "../ai/openai-compatible";
import type { AIResponder } from "../ai/types";
import { getAIMode, getAIProviderConfig, type StorageMode } from "./config";

export function getAIService(mode: StorageMode): AIResponder {
  const config = getAIProviderConfig();
  if (config && getAIMode(mode) === "live") return new OpenAICompatibleAI(config);
  return new MockAI();
}
