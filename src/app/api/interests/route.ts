import { getCloudContext } from "@/lib/server/context";
import { enforceRateLimit, handle, ok, readJson } from "@/lib/server/http";
import { RATE_LIMITS } from "@/lib/server/rate-limit";
import { interestUpdateSchema } from "@/lib/validation";

export const GET = handle(async () => {
  const { service } = await getCloudContext();
  return ok(await service.getInterests());
});

export const PATCH = handle(async (req: Request) => {
  const { service, userId } = await getCloudContext();
  enforceRateLimit(`writes:${userId}`, RATE_LIMITS.writes);
  const { topic, action } = await readJson(req, interestUpdateSchema);
  await service.updateInterest(topic, action);
  return ok();
});
