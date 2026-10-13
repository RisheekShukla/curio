import { getCloudContext } from "@/lib/server/context";
import { handle, ok } from "@/lib/server/http";

export const GET = handle(async () => {
  const { service } = await getCloudContext();
  return ok(await service.getHistory());
});
