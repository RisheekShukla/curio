import { getCloudContext } from "@/lib/server/context";
import { handle, ok, parseParam } from "@/lib/server/http";
import { idParamSchema } from "@/lib/validation";

export const GET = handle(async (_req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const id = parseParam((await ctx.params).id, idParamSchema);
  const { service } = await getCloudContext();
  return ok(await service.getConversation(id));
});
