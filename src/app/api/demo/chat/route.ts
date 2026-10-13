import { LIMITS } from "@/lib/ai/types";
import { SEED_DISCOVERIES } from "@/lib/content/seed-discoveries";
import { AppError, NotFoundError } from "@/lib/errors";
import { toDiscoveryContext } from "@/lib/services/curio-service";
import { getAIService } from "@/lib/server/ai";
import { getStorageMode } from "@/lib/server/config";
import { clientKey, enforceRateLimit, handle, ok, readJson } from "@/lib/server/http";
import { RATE_LIMITS } from "@/lib/server/rate-limit";
import { demoChatSchema } from "@/lib/validation";

/** Stateless AI endpoint for demo mode; conversation storage happens in the browser. */
export const POST = handle(async (req: Request) => {
  if (getStorageMode() !== "demo") throw new AppError(404, "Not available.");
  const key = clientKey(req);
  enforceRateLimit(`demo-chat:${key}`, RATE_LIMITS.chat);
  enforceRateLimit(`demo-chat-day:${key}`, RATE_LIMITS.chatDaily);

  const body = await readJson(req, demoChatSchema, 64_000);
  const discovery = SEED_DISCOVERIES.find((d) => d.slug === body.discoverySlug);
  if (!discovery) throw new NotFoundError("Discovery");

  const answer = await getAIService("demo").answer({
    discovery: toDiscoveryContext(discovery),
    history: body.history.slice(-LIMITS.historyTurns),
    message: body.message,
    explanationStyle: body.explanationStyle,
  });
  return ok(answer);
});
