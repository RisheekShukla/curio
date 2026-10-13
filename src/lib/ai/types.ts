import type { ExplanationStyle } from "../types";

/** Context about the current discovery handed to the model; never client-supplied in cloud mode. */
export interface DiscoveryContext {
  slug: string;
  title: string;
  summary: string;
  category: string;
  tags: string[];
  source?: { title: string; url: string };
}

export interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

export interface AnswerInput {
  discovery: DiscoveryContext;
  history: ChatTurn[];
  message: string;
  explanationStyle: ExplanationStyle;
}

export interface AIAnswer {
  content: string;
  suggestions: string[];
  isMock: boolean;
}

export interface QuestionsInput {
  discovery: DiscoveryContext;
  existing: string[];
  count: number;
}

export interface AIQuestions {
  questions: string[];
  isMock: boolean;
}

/** Port implemented server-side by real/mock providers and client-side (demo) by an HTTP adapter. */
export interface AIResponder {
  answer(input: AnswerInput): Promise<AIAnswer>;
  generateQuestions(input: QuestionsInput): Promise<AIQuestions>;
}

export const LIMITS = {
  messageChars: 2000,
  historyTurns: 12,
  historyTurnChars: 4000,
  maxQuestions: 6,
} as const;

/** Public-safe error for provider failures; never carries upstream bodies or credentials. */
export class AIUnavailableError extends Error {
  constructor(message = "The AI service is temporarily unavailable. Please try again.") {
    super(message);
    this.name = "AIUnavailableError";
  }
}
