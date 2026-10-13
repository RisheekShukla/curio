// Signs an EXISTING user in without sending an email (bypasses the email rate limit).
// Generates a one-time magic link with the secret key and opens it in the default browser; the link is never printed.
// Usage: node --env-file=.env.local scripts/sign-in-link.mjs you@example.com [https://your-site.vercel.app]
import { execFile } from "node:child_process";
import { createClient } from "@supabase/supabase-js";

async function main() {
  const [email, site = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"] = process.argv.slice(2);
  if (!email) return "Usage: node --env-file=.env.local scripts/sign-in-link.mjs <email> [site-url]";

  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Only existing accounts: this tool must never create users.
  const { data: list, error: listError } = await admin.auth.admin.listUsers({ perPage: 1000 });
  if (listError) return `Could not list users: ${listError.message}`;
  if (!list.users.some((u) => u.email?.toLowerCase() === email.toLowerCase())) return "No existing account for that email.";

  const { data, error } = await admin.auth.admin.generateLink({ type: "magiclink", email });
  if (error || !data.properties?.hashed_token) return `Could not generate a link: ${error?.message ?? "no token returned"}`;

  const url = new URL("/auth/callback", site);
  url.searchParams.set("token_hash", data.properties.hashed_token);
  url.searchParams.set("type", "magiclink");
  url.searchParams.set("next", "/discover");

  const [cmd, args] =
    process.platform === "win32"
      ? ["rundll32", ["url.dll,FileProtocolHandler", url.toString()]]
      : [process.platform === "darwin" ? "open" : "xdg-open", [url.toString()]];
  await new Promise((resolve) => execFile(cmd, args, () => resolve()));
  console.log(`Opened a one-time sign-in link for ${email} on ${url.origin} in your default browser.`);
  return null;
}

const failure = await main();
if (failure) {
  console.error(failure);
  process.exitCode = 1;
}
