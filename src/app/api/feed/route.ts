import { getCloudContext } from "@/lib/server/context";
import { enforceRateLimit, handle, ok, readJson } from "@/lib/server/http";
import { RATE_LIMITS } from "@/lib/server/rate-limit";
import { feedRequestSchema } from "@/lib/validation";

export const POST = handle(async (req: Request) => {
  const { service, userId } = await getCloudContext();
  enforceRateLimit(`writes:${userId}`, RATE_LIMITS.writes);
  const body = await readJson(req, feedRequestSchema);
  return ok(await service.getFeed(body));
});
