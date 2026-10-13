import { getCloudContext } from "@/lib/server/context";
import { enforceRateLimit, handle, ok, readJson } from "@/lib/server/http";
import { RATE_LIMITS } from "@/lib/server/rate-limit";
import { savedRequestSchema } from "@/lib/validation";

export const GET = handle(async () => {
  const { service } = await getCloudContext();
  return ok(await service.getSaved());
});

export const PUT = handle(async (req: Request) => {
  const { service, userId } = await getCloudContext();
  enforceRateLimit(`writes:${userId}`, RATE_LIMITS.writes);
  const { discoveryId, saved } = await readJson(req, savedRequestSchema);
  await service.setSaved(discoveryId, saved);
  return ok();
});
