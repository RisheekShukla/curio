# Curio

Curio is an image-led discovery app. It shows a personalised feed of short discoveries from science, history, nature, culture and other subjects. You can open any discovery and keep exploring it in a chat with an AI companion that remembers which topic you started from.

- **Feed:** each card has a real photo, a factual 40–90 word explanation, starter questions, and controls to save, like, dislike or hide it.
- **Chat:** conversations stay tied to the discovery. You can ask follow-ups, get suggested next questions and save useful answers as insights.
- **Personalisation:** ranking is plain TypeScript and can be explained. It learns gradually from what you do and lets you correct it.
- **PWA:** you can install it, it has an offline fallback page, and it works on mobile, tablet and desktop.
- **No setup needed:** it runs in **demo mode** with no credentials. Add Supabase for multi-user cloud storage and an OpenAI-compatible key for real AI answers.

> Everything runs locally. Deploying is optional and described in [DEPLOYMENT.md](DEPLOYMENT.md).

---

## Quick start (demo mode, no accounts needed)

Requirements: **Node.js 20.9+** (Node 24 recommended) and npm.

```powershell
npm install
npm run dev
```

Open http://localhost:3000 to see the landing page, then choose **Start exploring** to open the feed at `/discover`. A **"Demo mode"** badge shows that data is stored **only in this browser** (localStorage). Chat replies are clearly marked **"Demo response"** templates until you configure an AI provider. The installed PWA opens directly on `/discover`.

> On Windows PowerShell, use `npm.cmd` if script execution policy blocks `npm`.

## What works with and without configuration

| Feature | No credentials (demo) | + AI key | + Supabase |
| --- | --- | --- | --- |
| Personalised feed, pagination, feedback, hide | ✅ (browser storage) | ✅ | ✅ (per-user, server-side) |
| Save discoveries, history, interests, explanation style | ✅ (browser storage) | ✅ | ✅ (RLS-protected) |
| Conversations, saved insights | ✅ (browser storage) | ✅ | ✅ |
| AI answers and follow-up suggestions | Labelled template replies | ✅ real model | ✅ |
| "Suggest more questions" | Labelled templates (not cached) | ✅ generated | ✅ cached on the discovery* |
| Email sign-in, multiple users, cross-device sync | — | — | ✅ |
| PWA install and offline page | ✅ (production build) | ✅ | ✅ |

\* Generated questions are cached in the database only when `SUPABASE_SERVICE_ROLE_KEY` is set. Otherwise they are cached in server memory.

## Configuration

Copy `.env.example` to `.env.local`. Every value is optional.

| Variable | Scope | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | public | Turns on cloud mode and email sign-in. |
| `SUPABASE_SERVICE_ROLE_KEY` | **server only** | Used only to cache generated starter questions on curated content. |
| `AI_API_KEY` | **server only** | Key for any OpenAI-compatible Chat Completions API. |
| `AI_BASE_URL` | server | Defaults to `https://api.openai.com/v1`. Works with other compatible providers, such as Azure OpenAI-compatible endpoints, OpenRouter, Groq or a local Ollama `/v1`. |
| `AI_MODEL` | server | Defaults to `gpt-4o-mini`. |
| `DEMO_ALLOW_LIVE_AI` | server | Demo mode has no login. A production build in demo mode therefore uses template replies unless this is `true`, so anonymous visitors can't spend your AI budget. |
| `CURIO_FORCE_DEMO` | server | Forces demo mode even when Supabase is configured. The e2e tests use this. |

Never prefix the AI or service-role keys with `NEXT_PUBLIC_`. They are read only in server code (`src/lib/server/*`, which imports `server-only`).

## Enabling Supabase (cloud mode)

1. Create a project at https://supabase.com, or run one locally with the Supabase CLI (`npx supabase start`).
2. **Apply the schema.** Use one of these:
   - CLI: `npx supabase link --project-ref <ref>` then `npx supabase db push`
   - Dashboard: paste [supabase/migrations/20261013000000_init.sql](supabase/migrations/20261013000000_init.sql) into the SQL editor and run it.
3. **Seed the curated library.** Use one of these:
   - Local CLI: `npx supabase db reset` (runs `supabase/seed.sql` automatically)
   - Dashboard: paste [supabase/seed.sql](supabase/seed.sql) into the SQL editor. You can run it again safely because it upserts by `slug`.
   - If you edit the content in `src/lib/content/seed-discoveries.ts`, regenerate the file with `npm run db:seed-sql`.
4. **Configure auth.** Go to *Authentication → URL Configuration*:
   - Site URL: `http://localhost:3000`
   - Redirect URLs: `http://localhost:3000/auth/callback`
   - Email sign-in (magic link) is on by default. The callback handles both PKCE `code` links and `token_hash` links.
5. Put the project URL and anon key in `.env.local`. You can also add the service-role key. Then restart `npm run dev`.

You'll be redirected to `/login` and can sign in with an email link. All your data is then stored per user and protected by row-level security.

## AI configuration

Set `AI_API_KEY` (plus `AI_BASE_URL` and `AI_MODEL` if you're not using OpenAI) and restart the app.

- The model receives the discovery's title, summary, tags and source, the last 12 turns of the conversation (each capped at 4,000 characters) and your explanation style.
- The system prompt tells the model to separate established facts from hypotheses, admit uncertainty, and never invent citations. Curio does **not** browse the web.
- Messages are limited to 2,000 characters. Provider errors become a generic "temporarily unavailable" message. Only the HTTP status is logged, never the request body or the key.
- Rate limits are 20 chat requests per minute and 300 per day per user (or per IP in demo mode), and 10 question generations per minute. The limiter runs in memory on a single instance; see [DEPLOYMENT.md](DEPLOYMENT.md) for scaling it.
- The AI is never used to rank the feed.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Starts the development server (service worker disabled). |
| `npm run build` / `npm start` | Builds and serves for production (service worker enabled). |
| `npm run lint` | Runs ESLint (Next.js core-web-vitals and TypeScript rules). |
| `npm run typecheck` | Runs `tsc --noEmit` in strict mode. |
| `npm test` | Runs the Vitest unit tests. |
| `npm run test:e2e` | Runs the Playwright end-to-end test (always in demo mode). Run `npx playwright install chromium` once first. |
| `npm run check` | Runs lint, typecheck, unit tests and the build. |
| `npm run db:seed-sql` | Regenerates `supabase/seed.sql` from the seed library. |
| `npm run curate-media` | Fetches image and source metadata from the Wikipedia/Commons APIs again. |
| `npm run icons` | Regenerates the PWA icons and category fallback images. |

## Testing

The unit tests in `tests/unit` cover:

- recommendations for a new user (diversity, determinism), interest-based and adjacent ranking, and the 50/30/20 allocation
- penalties for dismissals and negative feedback, muted topics, repetition and impression decay, and pagination
- interest-weight updates (a single impression stays weak, explicit feedback dominates, explicit choices are never overwritten)
- request validation
- conversation and message ownership
- demo storage persistence, corrupted data and storage-quota recovery
- AI provider failures (HTTP errors, network errors, empty replies, no key leakage), clear labelling of mock replies, and the rate limiter

The e2e tests in `tests/e2e` check that the landing page leads into the feed. They then open the feed, pick a starter question, receive a labelled demo answer, save the discovery, reload, and check that the saved state is still there.

## Architecture

```
src/
  app/                      Next.js App Router: landing (/), feed (/discover), pages, route handlers (api/*), manifest, auth callbacks
  proxy.ts                  Supabase session refresh, login redirect, signed-in / -> /discover (cloud mode only)
  components/               UI: landing page, app shell, feed, cards, chat, views, primitives
  lib/
    types.ts, topics.ts     Domain model
    recommendation/         engine.ts (ranking) + interests.ts (weight updates). Pure, no I/O.
    services/               CurioService: business logic over a CurioRepository port
    storage/                MemoryRepository (+ localStorage persistence for demo mode)
    server/                 Supabase repository, config, AI factory, HTTP helpers, rate limiter (server-only)
    ai/                     AIResponder port, OpenAI-compatible adapter, labelled mock, prompts
    client/                 Demo API (service runs in the browser) and HTTP API (cloud)
    content/                Seed library + generated curated media metadata
    images/provider.ts      Image-provider abstraction with a local fallback
supabase/                   Migration, seed.sql, CLI config
tests/                      Vitest unit tests, Playwright e2e
```

### Key design decisions

- **One service for both modes.** `CurioService` holds all the business logic (feed, interactions, interests, conversations). In **demo mode** it runs in the browser over a localStorage repository. In **cloud mode** it runs in route handlers over a Supabase repository that uses the signed-in user's session. The UI uses the same `CurioApi` interface in both modes, so logic is never duplicated.
- **Identity comes from the server.** Route handlers call `supabase.auth.getUser()`, which checks the session with Supabase Auth. Client-supplied user IDs are never accepted. Row-level security enforces ownership, and the repository and service also check ownership in code.
- **Events are separate from preferences.** `interactions` is an append-only log. `user_interests` stores the weights learned from it. Users can follow, mute or reset any topic, and their explicit choices are never overwritten by learned weights.
- **Ranking can be explained.** Each discovery gets a score from interest match, similarity to recently explored topics (shared tags and category), novelty, and penalties for recent impressions, opens and saves. Dismissed and disliked items are removed. Candidates are grouped as *interest*, *adjacent* or *explore*, and a deficit-based scheduler fills the page toward the 50/30/20 target while avoiding back-to-back items from the same category. A deterministic seed of user plus day keeps the order stable within a day. Each card shows the reason it was chosen.
- **AI is optional and kept out of ranking.** Curated starter questions are used first. More questions are generated only when you ask, and real (non-mock) results are cached. Mock answers are deterministic and clearly labelled.
- **Content is verified.** Summaries were written for this app. Source links and images come from the Wikipedia and Wikimedia Commons APIs through `scripts/curate-images.mjs`, so every URL and licence was fetched rather than guessed. Credits and licences appear on each card. Where no free image was available, a local illustration is shown.
- **The PWA is cautious with private data.** The service worker in `public/sw.js` has no dependencies and caches only hashed static assets and icons. It never caches HTML pages, `/api/*` responses or AI chat, so someone else using the same device can't see your data from the cache.

## Privacy and security notes

- Only topic preferences are learned. Curio doesn't infer sensitive personal attributes.
- API responses use `Cache-Control: private, no-store`. Errors returned to the browser never include stack traces. Server logs record error types and HTTP statuses, not message contents.
- Mutating endpoints require `application/json` (CSRF defence together with SameSite cookies), enforce payload size limits and validate input with Zod.
- Security headers are set in `next.config.ts`: `nosniff`, `Referrer-Policy`, `X-Frame-Options: DENY` and `Permissions-Policy`.
- In demo mode, **Reset demo data** on the *My Interests* page deletes everything stored in the browser.

## Image and content credits

Images are hosted by Wikimedia Commons under the licences shown on each card (public domain, CC0, CC BY or CC BY-SA). Each credit links to its Commons file page. "Further reading" links go to the matching Wikipedia article. Summaries are original paraphrases. Replacing these with primary sources such as museums or scientific institutions would be a good improvement before a public launch.
