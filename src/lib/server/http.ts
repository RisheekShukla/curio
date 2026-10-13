import "server-only";
import { NextResponse } from "next/server";
import { ZodError, type ZodType } from "zod";
import { AIUnavailableError } from "../ai/types";
import { AppError, ValidationError } from "../errors";
import { rateLimiter, type RateLimitRule } from "./rate-limit";

const DEFAULT_MAX_BYTES = 16_384;

export async function readJson<T>(req: Request, schema: ZodType<T>, maxBytes = DEFAULT_MAX_BYTES): Promise<T> {
  // Requiring JSON forces a CORS preflight for cross-site requests (CSRF defence alongside SameSite cookies).
  if (!req.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
    throw new AppError(415, "Expected a JSON request body.");
  }
  const declared = Number(req.headers.get("content-length") ?? 0);
  if (declared > maxBytes) throw new AppError(413, "Request body is too large.");
  const text = await req.text();
  if (text.length > maxBytes) throw new AppError(413, "Request body is too large.");
  let body: unknown;
  try {
    body = text ? JSON.parse(text) : {};
  } catch {
    throw new ValidationError("Request body must be valid JSON.");
  }
  return schema.parse(body);
}

export function parseParam<T>(value: unknown, schema: ZodType<T>): T {
  const result = schema.safeParse(value);
  if (!result.success) throw new ValidationError("Invalid identifier.");
  return result.data;
}

export function enforceRateLimit(key: string, rule: RateLimitRule) {
  const result = rateLimiter.check(key, rule);
  if (!result.ok) {
    throw new AppError(429, `Too many requests. Please try again in ${result.retryAfterSeconds} seconds.`);
  }
}

export function clientKey(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || req.headers.get("x-real-ip") || "local";
}

export function errorResponse(err: unknown): NextResponse {
  if (err instanceof ZodError) {
    const issue = err.issues[0];
    const message = issue ? `${issue.path.join(".") || "body"}: ${issue.message}` : "Invalid request.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
  if (err instanceof AIUnavailableError) return NextResponse.json({ error: err.message }, { status: 503 });
  if (err instanceof AppError) return NextResponse.json({ error: err.message }, { status: err.status });
  // Unknown errors: log the type/message server-side only, never the stack or request data to clients.
  console.error("[api] unexpected error:", err instanceof Error ? `${err.name}: ${err.message}` : "unknown");
  return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
}

export function handle<A extends unknown[]>(fn: (...args: A) => Promise<Response>) {
  return async (...args: A): Promise<Response> => {
    try {
      return await fn(...args);
    } catch (err) {
      return errorResponse(err);
    }
  };
}

export const ok = (data: unknown = { ok: true }) =>
  NextResponse.json(data, { headers: { "Cache-Control": "private, no-store" } });
