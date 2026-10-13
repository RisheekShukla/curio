import { buildAnswerMessages, buildQuestionMessages, parseAnswer, parseQuestions, type ChatMessage } from "./prompt";
import { AIUnavailableError, type AIAnswer, type AIQuestions, type AIResponder, type AnswerInput, type QuestionsInput } from "./types";

export interface OpenAICompatibleConfig {
  apiKey: string;
  baseUrl: string;
  model: string;
  /** Sent only when set; thinking models (e.g. Gemini 3) need it, others may reject it. */
  reasoningEffort?: "none" | "minimal" | "low" | "medium" | "high";
  /** Overrides per-call output limits; thinking tokens count toward this on some providers. */
  maxOutputTokens?: number;
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
}

/** Server-only adapter for any provider exposing the OpenAI Chat Completions API. */
export class OpenAICompatibleAI implements AIResponder {
  private readonly fetchImpl: typeof fetch;

  constructor(private readonly config: OpenAICompatibleConfig) {
    this.fetchImpl = config.fetchImpl ?? fetch;
  }

  private async complete(messages: ChatMessage[], maxTokens: number): Promise<string> {
    let res: Response;
    try {
      res = await this.fetchImpl(`${this.config.baseUrl.replace(/\/+$/, "")}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.config.apiKey}`,
        },
        body: JSON.stringify({
          model: this.config.model,
          messages,
          temperature: 0.4,
          max_tokens: this.config.maxOutputTokens ?? maxTokens,
          ...(this.config.reasoningEffort ? { reasoning_effort: this.config.reasoningEffort } : {}),
        }),
        signal: AbortSignal.timeout(this.config.timeoutMs ?? 30_000),
      });
    } catch (err) {
      const reason = err instanceof Error && err.name === "TimeoutError" ? "timeout" : "network";
      console.error(`[ai] provider request failed (${reason})`);
      throw new AIUnavailableError();
    }

    if (!res.ok) {
      // Log status only; provider bodies can echo request content.
      console.error(`[ai] provider responded with HTTP ${res.status}`);
      throw new AIUnavailableError(
        res.status === 429 ? "The AI service is busy right now. Please wait a moment and try again." : undefined,
      );
    }

    try {
      const data = (await res.json()) as { choices?: { message?: { content?: unknown } }[] };
      const content = data.choices?.[0]?.message?.content;
      if (typeof content !== "string" || !content.trim()) throw new Error("empty");
      return content;
    } catch {
      console.error("[ai] provider returned an unreadable response");
      throw new AIUnavailableError();
    }
  }

  async answer(input: AnswerInput): Promise<AIAnswer> {
    const raw = await this.complete(buildAnswerMessages(input), 700);
    const parsed = parseAnswer(raw);
    if (!parsed.content) throw new AIUnavailableError();
    return { ...parsed, isMock: false };
  }

  async generateQuestions(input: QuestionsInput): Promise<AIQuestions> {
    const raw = await this.complete(buildQuestionMessages(input), 300);
    return { questions: parseQuestions(raw), isMock: false };
  }
}
