import { getCloudContext } from "@/lib/server/context";
import { enforceRateLimit, handle, ok, readJson } from "@/lib/server/http";
import { RATE_LIMITS } from "@/lib/server/rate-limit";
import { interactionsRequestSchema } from "@/lib/validation";

export const POST = handle(async (req: Request) => {
  const { service, userId } = await getCloudContext();
  enforceRateLimit(`writes:${userId}`, RATE_LIMITS.writes);
  const { events } = await readJson(req, interactionsRequestSchema);
  await service.recordInteractions(events);
  return ok();
});
