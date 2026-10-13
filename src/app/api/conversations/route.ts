import { getCloudContext } from "@/lib/server/context";
import { enforceRateLimit, handle, ok, parseParam, readJson } from "@/lib/server/http";
import { RATE_LIMITS } from "@/lib/server/rate-limit";
import { idParamSchema, openConversationSchema } from "@/lib/validation";

export const GET = handle(async (req: Request) => {
  const discoveryId = parseParam(new URL(req.url).searchParams.get("discoveryId"), idParamSchema);
  const { service } = await getCloudContext();
  return ok({ thread: await service.findConversation(discoveryId) });
});

export const POST = handle(async (req: Request) => {
  const { service, userId } = await getCloudContext();
  enforceRateLimit(`writes:${userId}`, RATE_LIMITS.writes);
  const { discoveryId, forceNew } = await readJson(req, openConversationSchema);
  return ok(await service.openConversation(discoveryId, forceNew));
});
