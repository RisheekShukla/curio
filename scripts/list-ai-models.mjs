// Lists model IDs available to the configured AI key, and pings a few. Never prints the key.
// Usage: node --env-file=.env.local scripts/list-ai-models.mjs [model ...]
const base = process.env.AI_BASE_URL.replace(/\/+$/, "");
const headers = { "Content-Type": "application/json", Authorization: `Bearer ${process.env.AI_API_KEY}` };

const res = await fetch(`${base}/models`, { headers });
const json = await res.json().catch(() => ({}));
if (!res.ok) {
  console.log(`HTTP ${res.status}`);
  process.exit(1);
}
const ids = (json.data ?? []).map((m) => m.id.replace(/^models\//, ""));
console.log(ids.filter((id) => /flash|lite|pro/i.test(id) && !/tts|image|audio|live|embedding/i.test(id)).join("\n"));

for (const model of process.argv.slice(2)) {
  const r = await fetch(`${base}/chat/completions`, {
    method: "POST",
    headers,
    body: JSON.stringify({ model, messages: [{ role: "user", content: "Reply with: ready" }], max_tokens: 400 }),
    signal: AbortSignal.timeout(30_000),
  }).catch((e) => ({ ok: false, status: e.name }));
  const body = r.ok ? await r.json() : null;
  console.log(`${model}: ${r.ok ? `OK "${(body.choices?.[0]?.message?.content ?? "").trim().slice(0, 30)}"` : `HTTP ${r.status}`}`);
}
