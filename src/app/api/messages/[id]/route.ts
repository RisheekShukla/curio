import { getCloudContext } from "@/lib/server/context";
import { enforceRateLimit, handle, ok, parseParam, readJson } from "@/lib/server/http";
import { RATE_LIMITS } from "@/lib/server/rate-limit";
import { idParamSchema, pinMessageSchema } from "@/lib/validation";

export const PATCH = handle(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const id = parseParam((await ctx.params).id, idParamSchema);
  const { service, userId } = await getCloudContext();
  enforceRateLimit(`writes:${userId}`, RATE_LIMITS.writes);
  const { pinned } = await readJson(req, pinMessageSchema);
  return ok(await service.setPinned(id, pinned));
});
