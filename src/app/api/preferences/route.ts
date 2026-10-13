import { getCloudContext } from "@/lib/server/context";
import { enforceRateLimit, handle, ok, readJson } from "@/lib/server/http";
import { RATE_LIMITS } from "@/lib/server/rate-limit";
import { preferencesSchema } from "@/lib/validation";

export const PUT = handle(async (req: Request) => {
  const { service, userId } = await getCloudContext();
  enforceRateLimit(`writes:${userId}`, RATE_LIMITS.writes);
  await service.setPreferences(await readJson(req, preferencesSchema));
  return ok();
});
