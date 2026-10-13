import { SEED_DISCOVERIES } from "@/lib/content/seed-discoveries";
import { AppError, NotFoundError } from "@/lib/errors";
import { toDiscoveryContext } from "@/lib/services/curio-service";
import { getAIService } from "@/lib/server/ai";
import { getStorageMode } from "@/lib/server/config";
import { clientKey, enforceRateLimit, handle, ok, readJson } from "@/lib/server/http";
import { RATE_LIMITS } from "@/lib/server/rate-limit";
import { demoQuestionsSchema } from "@/lib/validation";

export const POST = handle(async (req: Request) => {
  if (getStorageMode() !== "demo") throw new AppError(404, "Not available.");
  enforceRateLimit(`demo-questions:${clientKey(req)}`, RATE_LIMITS.questions);
  const body = await readJson(req, demoQuestionsSchema);
  const discovery = SEED_DISCOVERIES.find((d) => d.slug === body.discoverySlug);
  if (!discovery) throw new NotFoundError("Discovery");
  return ok(
    await getAIService("demo").generateQuestions({
      discovery: toDiscoveryContext(discovery),
      existing: discovery.starterQuestions,
      count: body.count,
    }),
  );
});
