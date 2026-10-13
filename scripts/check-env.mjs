// Fails the build on misconfigured environments; an empty environment (demo mode) is valid.
// Runs automatically before `next build`, including on Vercel.
const env = process.env;
const errors = [];
const warnings = [];
const isProdDeploy = env.VERCEL_ENV === "production";

const hasUrl = Boolean(env.NEXT_PUBLIC_SUPABASE_URL);
const hasAnon = Boolean(env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
if (hasUrl !== hasAnon) {
  errors.push("Set both NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY, or neither.");
}
if (hasUrl && !/^https:\/\/|^http:\/\/(127\.0\.0\.1|localhost)/.test(env.NEXT_PUBLIC_SUPABASE_URL)) {
  errors.push("NEXT_PUBLIC_SUPABASE_URL must be an https:// URL (or a local http://localhost URL).");
}

// Secrets must never be exposed to the browser bundle.
for (const key of Object.keys(env)) {
  if (key.startsWith("NEXT_PUBLIC_") && /(SERVICE_ROLE|SECRET|AI_API_KEY|PRIVATE)/i.test(key)) {
    errors.push(`${key} looks like a secret but is prefixed NEXT_PUBLIC_, which would expose it to browsers.`);
  }
}

if (env.AI_BASE_URL && !/^https:\/\//.test(env.AI_BASE_URL) && !/localhost|127\.0\.0\.1/.test(env.AI_BASE_URL)) {
  errors.push("AI_BASE_URL must use https://.");
}
if (env.AI_REASONING_EFFORT && !["none", "minimal", "low", "medium", "high"].includes(env.AI_REASONING_EFFORT)) {
  errors.push("AI_REASONING_EFFORT must be one of none, minimal, low, medium, high.");
}

if (isProdDeploy) {
  if (!hasUrl) warnings.push("No Supabase configured: production will run in demo mode (data stays in each browser).");
  if (!env.AI_API_KEY) warnings.push("No AI_API_KEY: chat will use labelled demo replies.");
  if (!env.NEXT_PUBLIC_SITE_URL) warnings.push("NEXT_PUBLIC_SITE_URL not set: link previews will point at localhost.");
  if (env.CURIO_FORCE_DEMO) warnings.push("CURIO_FORCE_DEMO is set in production.");
}

for (const w of warnings) console.warn(`[env] warning: ${w}`);
if (errors.length) {
  for (const e of errors) console.error(`[env] error: ${e}`);
  process.exit(1);
}
console.log(`[env] ok (${hasUrl ? "cloud" : "demo"} mode, AI ${env.AI_API_KEY ? "configured" : "mock"})`);
