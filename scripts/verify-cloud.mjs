// Verifies the cloud setup without ever printing secret values.
// Usage: node --env-file=.env.local scripts/verify-cloud.mjs
import { createClient } from "@supabase/supabase-js";

const env = process.env;
let failed = false;
const report = (ok, label, detail = "") => {
  if (!ok) failed = true;
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${detail ? ` - ${detail}` : ""}`);
};

const shape = {
  NEXT_PUBLIC_SUPABASE_URL: /^https:\/\/[a-z0-9]+\.supabase\.co\/?$/,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: /^(sb_publishable_|eyJ)/,
  SUPABASE_SERVICE_ROLE_KEY: /^(sb_secret_|eyJ)/,
  AI_API_KEY: /^.{20,}$/,
};
console.log("== Environment (values hidden) ==");
for (const [name, re] of Object.entries(shape)) {
  const v = (env[name] ?? "").trim();
  report(!!v && re.test(v), name, v ? (re.test(v) ? "set" : "set, but unexpected format") : "empty");
}
if (failed) process.exit(1);

const url = env.NEXT_PUBLIC_SUPABASE_URL;
const opts = { auth: { persistSession: false, autoRefreshToken: false } };
const admin = createClient(url, env.SUPABASE_SERVICE_ROLE_KEY, opts);
const anon = createClient(url, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, opts);

console.log("\n== Database ==");
{
  const { count, error } = await admin.from("discoveries").select("*", { count: "exact", head: true });
  report(!error && count === 42, "secret key reads curated library", error ? error.message : `${count} discoveries`);
}
{
  const { data, error } = await anon.from("discoveries").select("id").limit(1);
  // Either an empty result (RLS) or "permission denied" (privileges revoked from anon) is safe.
  const blocked = error ? /permission denied/i.test(error.message) : data.length === 0;
  report(blocked, "signed-out visitors cannot read discoveries", error ? "permission denied" : `${data.length} rows`);
}
{
  const { error } = await anon.from("interactions").insert({ discovery_id: "00000000-0000-0000-0000-000000000000", event_type: "open" });
  report(!!error, "signed-out visitors cannot write", error ? "rejected" : "INSERT SUCCEEDED");
}

console.log("\n== Row-level security between two users ==");
const stamp = Date.now();
const users = [];
try {
  for (const tag of ["a", "b"]) {
    const email = `curio-rls-test-${tag}-${stamp}@example.com`;
    const password = `T3st-${crypto.randomUUID()}`;
    const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
    if (error) throw new Error(`create test user: ${error.message}`);
    const client = createClient(url, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, opts);
    const signIn = await client.auth.signInWithPassword({ email, password });
    if (signIn.error) throw new Error(`sign in test user: ${signIn.error.message}`);
    users.push({ id: data.user.id, client });
  }
  const [a, b] = users;
  const { data: disc } = await a.client.from("discoveries").select("id").limit(1).single();
  report(!!disc, "signed-in user can read published discoveries");

  const conv = await a.client
    .from("conversations")
    .insert({ user_id: a.id, discovery_id: disc.id, title: "RLS test" })
    .select("id")
    .single();
  report(!conv.error, "user A can create own conversation", conv.error?.message);
  await a.client.from("saved_discoveries").insert({ user_id: a.id, discovery_id: disc.id });

  const peek = await b.client.from("conversations").select("id").eq("id", conv.data.id);
  report(!peek.error && peek.data.length === 0, "user B cannot read user A's conversation");
  const peekSaved = await b.client.from("saved_discoveries").select("discovery_id").eq("user_id", a.id);
  report(!peekSaved.error && peekSaved.data.length === 0, "user B cannot read user A's saved items");
  const spoof = await b.client.from("saved_discoveries").insert({ user_id: a.id, discovery_id: disc.id });
  report(!!spoof.error, "user B cannot write rows as user A", spoof.error ? "rejected" : "INSERT SUCCEEDED");
  const msgSpoof = await b.client
    .from("messages")
    .insert({ conversation_id: conv.data.id, user_id: b.id, role: "user", content: "intrusion" });
  report(!!msgSpoof.error, "user B cannot post into user A's conversation", msgSpoof.error ? "rejected" : "INSERT SUCCEEDED");
  const curated = await a.client.from("discoveries").update({ title: "hacked" }).eq("id", disc.id).select("id");
  report(!curated.error && curated.data.length === 0, "users cannot modify curated content");
} catch (err) {
  report(false, "RLS test setup", err.message);
} finally {
  for (const u of users) await admin.auth.admin.deleteUser(u.id);
  if (users.length) console.log(`(cleaned up ${users.length} temporary test users)`);
}

console.log("\n== AI provider ==");
try {
  const body = {
    model: env.AI_MODEL,
    messages: [{ role: "user", content: "Reply with the single word: ready" }],
    max_tokens: Number(env.AI_MAX_OUTPUT_TOKENS) || 200,
  };
  if (env.AI_REASONING_EFFORT) body.reasoning_effort = env.AI_REASONING_EFFORT;
  const res = await fetch(`${env.AI_BASE_URL.replace(/\/+$/, "")}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${env.AI_API_KEY}` },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(30_000),
  });
  const json = await res.json().catch(() => ({}));
  const text = json.choices?.[0]?.message?.content ?? "";
  report(res.ok && !!text.trim(), `${env.AI_MODEL} responds`, res.ok ? `"${text.trim().slice(0, 40)}"` : `HTTP ${res.status} ${json.error?.message?.slice(0, 160) ?? json[0]?.error?.message?.slice(0, 160) ?? ""}`);
} catch (err) {
  report(false, "AI provider reachable", err.name === "TimeoutError" ? "timed out" : err.message);
}

console.log(failed ? "\nSome checks failed." : "\nAll checks passed.");
process.exit(failed ? 1 : 0);
