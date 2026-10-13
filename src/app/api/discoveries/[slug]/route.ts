import { NotFoundError } from "@/lib/errors";
import { getCloudContext } from "@/lib/server/context";
import { handle, ok, parseParam } from "@/lib/server/http";
import { slugParamSchema } from "@/lib/validation";

export const GET = handle(async (_req: Request, ctx: { params: Promise<{ slug: string }> }) => {
  const slug = parseParam((await ctx.params).slug, slugParamSchema);
  const { service } = await getCloudContext();
  const state = await service.getDiscovery(slug);
  if (!state) throw new NotFoundError("Discovery");
  return ok(state);
});
