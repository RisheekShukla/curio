import "server-only";
import { AppError } from "../errors";
import { CurioService } from "../services/curio-service";
import { createSupabaseServerClient } from "../supabase/server";
import { getAIService } from "./ai";
import { getStorageMode } from "./config";
import { SupabaseRepository } from "./supabase-repository";

/** Resolves the verified user from the session cookie; client-supplied user IDs are never trusted. */
export async function getCloudContext() {
  if (getStorageMode() !== "cloud") {
    throw new AppError(404, "Cloud storage is not configured; Curio is running in demo mode.");
  }
  const supabase = await createSupabaseServerClient();
  // getClaims verifies the session JWT's signature (via the project's JWKS), so the user ID is trustworthy.
  const { data, error } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (error || typeof userId !== "string" || !userId) throw new AppError(401, "Please sign in to continue.");
  const repo = new SupabaseRepository(supabase, userId);
  return { userId, service: new CurioService({ repo, ai: getAIService("cloud") }) };
}
