import { getCloudContext } from "@/lib/server/context";
import { enforceRateLimit, handle, ok, parseParam, readJson } from "@/lib/server/http";
import { RATE_LIMITS } from "@/lib/server/rate-limit";
import { idParamSchema, sendMessageSchema } from "@/lib/validation";

export const POST = handle(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const id = parseParam((await ctx.params).id, idParamSchema);
  const { service, userId } = await getCloudContext();
  enforceRateLimit(`chat:${userId}`, RATE_LIMITS.chat);
  enforceRateLimit(`chat-day:${userId}`, RATE_LIMITS.chatDaily);
  const { content, starter } = await readJson(req, sendMessageSchema);
  return ok(await service.sendMessage(id, content, { starter }));
});
