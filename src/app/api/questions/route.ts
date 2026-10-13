import { z } from "zod";
import { getCloudContext } from "@/lib/server/context";
import { enforceRateLimit, handle, ok, readJson } from "@/lib/server/http";
import { RATE_LIMITS } from "@/lib/server/rate-limit";
import { idParamSchema } from "@/lib/validation";

const schema = z.object({ discoveryId: idParamSchema });

export const POST = handle(async (req: Request) => {
  const { service, userId } = await getCloudContext();
  enforceRateLimit(`questions:${userId}`, RATE_LIMITS.questions);
  const { discoveryId } = await readJson(req, schema);
  return ok(await service.getMoreQuestions(discoveryId));
});
