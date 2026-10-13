import { hashUnit } from "../recommendation/engine";
import type { AIAnswer, AIQuestions, AIResponder, AnswerInput, QuestionsInput } from "./types";

export const MOCK_NOTICE = "Demo response: no AI provider is configured, so this reply was generated from a template.";

const FOLLOW_UP_TEMPLATES = [
  (t: string) => `What is still debated about ${t}?`,
  (t: string) => `How did people first figure out ${t}?`,
  (t: string) => `What is a common misconception about ${t}?`,
  (t: string) => `How does ${t} connect to everyday life?`,
  (t: string) => `What would be a good next topic after ${t}?`,
];

const lowerFirst = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);

/** Deterministic, clearly labelled stand-in used when no provider credentials are configured. */
export class MockAI implements AIResponder {
  async answer(input: AnswerInput): Promise<AIAnswer> {
    const topic = lowerFirst(input.discovery.title.replace(/[.?!]$/, ""));
    const firstSentence = input.discovery.summary.split(/(?<=[.!?])\s/)[0] ?? input.discovery.summary;
    const start = Math.floor(hashUnit(input.message) * FOLLOW_UP_TEMPLATES.length);
    const suggestions = [0, 1, 2].map((i) => FOLLOW_UP_TEMPLATES[(start + i) % FOLLOW_UP_TEMPLATES.length]!(topic));
    const content = [
      MOCK_NOTICE,
      "",
      `You asked: "${input.message.slice(0, 160)}"`,
      "",
      `Here is what this discovery says: ${firstSentence}`,
      "",
      input.discovery.source
        ? `For a real answer, connect an AI provider, or read more in ${input.discovery.source.title}.`
        : "For a real answer, connect an AI provider (see the README).",
    ].join("\n");
    return { content, suggestions, isMock: true };
  }

  async generateQuestions(input: QuestionsInput): Promise<AIQuestions> {
    const topic = lowerFirst(input.discovery.title.replace(/[.?!]$/, ""));
    return {
      questions: FOLLOW_UP_TEMPLATES.slice(0, input.count).map((f) => f(topic)),
      isMock: true,
    };
  }
}
