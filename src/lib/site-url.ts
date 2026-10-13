const DEFAULT_SITE_URL = "http://localhost:3000";

/** Resolves the public site URL, tolerating values without a scheme (e.g. "app.vercel.app"). */
export function resolveSiteUrl(env: Record<string, string | undefined> = process.env): URL {
  // VERCEL_PROJECT_PRODUCTION_URL is set automatically on Vercel, without a scheme.
  for (const raw of [env.NEXT_PUBLIC_SITE_URL, env.VERCEL_PROJECT_PRODUCTION_URL]) {
    const value = raw?.trim();
    if (!value) continue;
    try {
      return new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`);
    } catch {
      console.warn("[config] ignoring invalid site URL setting");
    }
  }
  return new URL(DEFAULT_SITE_URL);
}
