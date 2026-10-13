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
  const started = Date.now();
  const r = await fetch(`${base}/chat/completions`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: "In about 150 words, explain why Roman concrete is so durable." }],
      max_tokens: 4000,
      ...(process.env.AI_REASONING_EFFORT ? { reasoning_effort: process.env.AI_REASONING_EFFORT } : {}),
    }),
    signal: AbortSignal.timeout(40_000),
  }).catch((e) => ({ ok: false, status: e.name }));
  const body = r.ok ? await r.json() : null;
  const words = (body?.choices?.[0]?.message?.content ?? "").split(/\s+/).filter(Boolean).length;
  console.log(`${model}: ${r.ok ? `OK ${words} words` : `HTTP ${r.status}`} in ${((Date.now() - started) / 1000).toFixed(1)}s`);
}
