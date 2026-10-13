# Curio — Deployment Plan

**Status:** Curio has not been deployed yet. The repository is ready for a private GitHub repo plus Vercel, with Supabase Free and Google Gemini's free tier. Steps marked **(you)** need your own accounts and logins.

The plan has three stages:

1. **Local only (now):** demo mode or a local Supabase stack on your machine.
2. **Private deployment:** only you use it, on your own devices, through HTTPS. The zero-cost guide below covers this.
3. **Public multi-user release:** open sign-ups, with tighter limits, monitoring and policies.

---

## Zero-cost deployment guide (GitHub + Vercel Hobby + Supabase Free + Gemini free tier)

Expected cost: **$0**. Free tiers change, so check each provider's pricing page before you start.

| Piece | Free limits that matter |
| --- | --- |
| Vercel Hobby | Non-commercial use only. Free `*.vercel.app` HTTPS domain. |
| Supabase Free | A project **pauses after about a week without activity**; resume it from the dashboard and no data is lost. The built-in email sender only sends a few emails per hour. |
| Gemini free tier | Rate limited. Google may use free-tier prompts and responses to improve its products, so don't type anything private into the chat. |

### 1. Create the private GitHub repo (you)

The local repository already has its first commit.

1. On GitHub, create a **private** repository named `curio` with no README, `.gitignore` or licence.
2. In this folder, run:
   ```powershell
   git remote add origin https://github.com/<you>/curio.git
   git push -u origin main
   ```
3. Check that no `.env*` file except `.env.example` appears on GitHub.

### 2. Set up the Supabase project (you)

1. At https://supabase.com, create a new project (Free plan) in a region near you, and save the database password somewhere safe.
2. Open **SQL Editor**, paste the whole of `supabase/migrations/20261013000000_init.sql` and click **Run**.
3. Paste `supabase/seed.sql` and click **Run**. It is safe to re-run; you should end up with 42 rows in `discoveries`.
4. **Authentication → URL Configuration:** for now, set the Site URL to `http://localhost:3000` and add `http://localhost:3000/auth/callback` to Redirect URLs. You'll add the Vercel URL in step 5.
5. **Project Settings → API**, copy:
   - the Project URL, for `NEXT_PUBLIC_SUPABASE_URL`
   - the `anon` / publishable key, for `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - the `service_role` / secret key, for `SUPABASE_SERVICE_ROLE_KEY` (optional; it only caches AI-generated questions. **Never share it.**)
6. Check **Advisors → Security Advisor** and fix anything it reports.

### 3. Get a Gemini API key (you)

1. Go to https://aistudio.google.com/apikey and create an API key. Don't enable billing; without billing the key stays on the free tier.
2. Note these values:
   ```
   AI_API_KEY=<your key>
   AI_BASE_URL=https://generativelanguage.googleapis.com/v1beta/openai
   AI_MODEL=gemini-3.8-flash
   AI_REASONING_EFFORT=low
   AI_MAX_OUTPUT_TOKENS=4000
   ```
   Gemini 3 models always "think", and their thinking tokens count toward `AI_MAX_OUTPUT_TOKENS`, so keep the limit generous.

### 4. Optional: test the cloud setup locally first (you)

1. Create `.env.local`, which git ignores, with the Supabase and Gemini values from steps 2 and 3.
2. Run `npm.cmd run build`. The environment check prints `[env] ok (cloud mode, AI configured)`.
3. Run `npm.cmd run dev`, open http://localhost:3000, sign in with your email link, and ask a question. The answer should not show a "Demo response" badge.

### 5. Deploy on Vercel (you)

1. At https://vercel.com, sign up with GitHub on the **Hobby** plan, choose **Add New → Project**, and import the private `curio` repo.
2. Vercel detects Next.js from `vercel.json`. Before the first deploy, open **Environment Variables** and add these for **Production** (mark the starred ones **Sensitive**):
   | Name | Value |
   | --- | --- |
   | `NEXT_PUBLIC_SUPABASE_URL` | from step 2 |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | from step 2 |
   | `SUPABASE_SERVICE_ROLE_KEY` * | from step 2 (optional) |
   | `AI_API_KEY` * | from step 3 |
   | `AI_BASE_URL`, `AI_MODEL`, `AI_REASONING_EFFORT`, `AI_MAX_OUTPUT_TOKENS` | from step 3 |
   | `NEXT_PUBLIC_SITE_URL` | `https://<project>.vercel.app` (set after the first deploy, then redeploy) |
3. Click **Deploy**. The build runs `scripts/check-env.mjs` first and stops if the variables don't fit together, for example if only one of the two Supabase values is set.
4. Back in Supabase, under **Authentication → URL Configuration**:
   - set the Site URL to `https://<project>.vercel.app`
   - add `https://<project>.vercel.app/auth/callback` to Redirect URLs
5. In Vercel, set `NEXT_PUBLIC_SITE_URL` and choose **Redeploy**. `NEXT_PUBLIC_*` values are baked in when the app is built, so changing them always needs a redeploy.

### 6. Lock it down and smoke-test (you)

1. Open the site, sign in with your email, and go through the feed, a chat answer, saving, a reload and the History page.
2. In Supabase, go to **Authentication → Providers → Email** and turn off **Allow new users to sign up**. Now only your account can sign in.
3. In Chrome DevTools → **Application**, check that the Manifest is valid and the Service Worker is active.
4. On your phone, open the site and choose *Install app* (Android) or *Share → Add to Home Screen* (iOS).

### Staying at $0

- Don't add a payment method to the Gemini key or the Supabase project. If a free limit is reached, requests fail and nothing is charged.
- If you haven't used Curio for about a week, resume the Supabase project from the dashboard.
- Curio's own limits also apply: 20 chats a minute and 300 a day per user.

---

## Stage 0 — Pre-flight checklist (run locally before any deployment)

- [ ] `npm run check` passes: lint, typecheck, unit tests and production build.
- [ ] `npx playwright install chromium` followed by `npm run test:e2e` passes.
- [ ] `.env.local` is in `.gitignore` (it already is), and no real keys appear in any committed file. Check with `git grep -nE "sk-|service_role|eyJhbGci"`.
- [ ] `npm run db:seed-sql` has been run after any content change, and `supabase/seed.sql` is current.
- [ ] Every curated image and source link still loads. Run `npm run curate-media` again if needed.
- [ ] Lighthouse PWA and accessibility audits pass against `npm run build && npm start` on `localhost`.

## Stage 1 — Local Supabase (optional, still fully local)

Use this to test cloud mode without creating a hosted project.

```powershell
npx supabase start            # starts Postgres, Auth, Studio and Inbucket in Docker
npx supabase db reset         # applies migrations and runs supabase/seed.sql
```

Copy the printed `API URL` and `anon key` into `.env.local`, then run `npm run dev`. Magic-link emails arrive in the local Inbucket inbox that the CLI prints (usually http://localhost:54324).

## Stage 2 — Private deployment (personal use)

### 2.1 Hosting choice

| Option | Notes |
| --- | --- |
| **Vercel** (recommended) | Supports Next.js 16 natively, provides HTTPS automatically and has a generous free tier. Route handlers run as serverless functions. |
| Netlify / Cloudflare (OpenNext) | Both work. Check Next 16 adapter support before choosing. |
| Self-hosted (Docker / VPS) | Run `npm run build && npm start` behind a reverse proxy such as Caddy or nginx that terminates TLS. Use a single instance so the in-memory rate limiter stays accurate. |

**HTTPS is required.** Service workers and PWA installation only work on secure origins (`https://` or `http://localhost`). All the options above provide TLS, so no extra setup is needed for that.

### 2.2 Supabase project

1. Create a hosted project in a region close to the hosting region.
2. Apply the schema with `npx supabase link --project-ref <ref>` and `npx supabase db push`, or paste the migration into the SQL editor.
3. Seed the content by running `supabase/seed.sql` in the SQL editor. It is idempotent.
4. Configure Auth:
   - Set the **Site URL** to `https://<your-domain>`.
   - Add **Redirect URLs** for `https://<your-domain>/auth/callback` and `http://localhost:3000/auth/callback`.
   - For personal use, consider **disabling new sign-ups** after creating your own account (*Authentication → Providers → Email → Allow new users to sign up*). This is the simplest way to keep the deployment private.
   - Configure custom SMTP (for example Resend, Postmark or SES). Supabase's built-in email sender is heavily rate limited.
5. Confirm RLS is enabled on every table. The migration does this. Run the Supabase **Security Advisor** and resolve any warnings.

### 2.3 Environment variables (set in the hosting dashboard, never in git)

| Variable | Value |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Anon (publishable) key |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key. Optional; mark it **sensitive** and server-only. |
| `AI_API_KEY` | Provider key. Mark it **sensitive**. |
| `AI_BASE_URL`, `AI_MODEL` | As required by your provider |
| `DEMO_ALLOW_LIVE_AI` | Leave unset. It only matters if you deploy without Supabase. |

Set a **monthly spending cap** in the AI provider's dashboard. That is your final protection against runaway costs.

> **Set variables before building.** `NEXT_PUBLIC_*` values are inlined at build time, and pages without Supabase configured are prerendered as static demo-mode pages. After changing environment variables, always **rebuild and redeploy**; restarting the server is not enough.

### 2.4 Release steps

1. Create a private git repository and push the code. **Only do this when you are ready; nothing has been pushed so far.**
2. Import the repository into the hosting provider and set the environment variables.
3. Deploy, then run a smoke test:
   - Sign in with a magic link.
   - The feed loads, and saving survives a reload.
   - Chat answers come from the real model, with no "Demo response" badge.
   - Chrome DevTools → Application shows a valid **Manifest** and an active **Service Worker**.
   - Install the PWA on your phone: *Add to Home Screen* on iOS Safari, or *Install app* on Android Chrome.
4. Optional: add a custom domain and update the Supabase Site URL and redirect URLs to match.

### 2.5 Rollback

- **Hosting:** promote the previous deployment (instant on Vercel and Netlify).
- **Database:** migrations only add things. For risky changes, take a backup first (*Database → Backups*, or `npx supabase db dump`). Write a new forward migration instead of editing an applied one.
- **Service worker:** raise `VERSION` in `public/sw.js` so clients delete old caches.

---

## Stage 3 — Public multi-user release

Complete these before opening sign-ups to other people.

### 3.1 Abuse and cost controls

- [ ] **Shared rate limiter.** Replace the in-memory `RateLimiter` (`src/lib/server/rate-limit.ts`) with a shared store such as Upstash Redis or a Postgres function. Serverless instances don't share memory, so the current limiter only works per instance.
- [ ] Add per-user daily AI token budgets stored in Postgres, and show users their remaining allowance.
- [ ] Add CAPTCHA to sign-up using Supabase Auth's built-in hCaptcha or Turnstile support.
- [ ] Only trust `x-forwarded-for` when it comes from your platform's proxy. Vercel sets it reliably; other platforms vary.
- [ ] Add moderation for user prompts, either through the provider's moderation endpoint or a lightweight classifier, before sending them to the model.

### 3.2 Security hardening

- [ ] Add a strict **Content-Security-Policy** with nonces. The theme bootstrap is already an external file (`public/theme-init.js`), so no inline-script exception is needed. Allow images from `upload.wikimedia.org`, and in `connect-src` allow only `'self'` and the Supabase URL.
- [ ] Add HSTS (`Strict-Transport-Security`) once the domain will only ever be served over HTTPS.
- [ ] Rotate keys, and confirm the service-role key is present only in server environments.
- [ ] Re-run the Supabase Security Advisor and add RLS tests, for example with pgTAP, that confirm user A can't read user B's rows.
- [ ] Run dependency audits (`npm audit`, Dependabot or Renovate).

### 3.3 Privacy and compliance

- [ ] Publish a privacy policy covering what is stored (email, interactions, interests, conversations), why, how long it is kept, and which processors are used (Supabase, the AI provider, the host).
- [ ] Add self-service **data export** and **account deletion**. Deleting the `auth.users` row cascades to all user tables.
- [ ] Set a retention policy, for example deleting `impression` rows older than 90 days with a scheduled `pg_cron` job.
- [ ] Check the AI provider's data-retention and training settings, and opt out of training where possible.
- [ ] Keep showing image attribution (CC BY and CC BY-SA require it). Consider caching thumbnails in your own storage if Wikimedia rate-limits hotlinking.

### 3.4 Content operations

- [ ] Build an admin path for curated content. Today it is service-role or SQL only. Options include a protected admin role checked server-side, or keep editing `seed-discoveries.ts` and re-running the seed.
- [ ] Add more primary sources from museums, scientific institutions and peer-reviewed reviews alongside the Wikipedia links.
- [ ] Use the `draft` / `published` / `archived` workflow, which the schema and RLS already support.
- [ ] Grow the library well beyond 42 items. The ranking engine loads all published items into memory, which is fine up to a few thousand. Beyond that, filter candidates in SQL by category and tags before ranking.

### 3.5 Observability

- [ ] Track errors with privacy-respecting settings, for example Sentry with PII scrubbing and no request bodies.
- [ ] Add structured logs for route latency, AI provider status codes and rate-limit hits. Never log prompts or answers.
- [ ] Use uptime checks on `/` and `/manifest.webmanifest`.
- [ ] Set up Supabase usage alerts for database size, auth emails and egress.

### 3.6 Scaling notes

| Concern | Current | When to change |
| --- | --- | --- |
| Rate limiting | In-memory, single instance | Before going public (see 3.1) |
| Feed ranking | All published items ranked per request | More than ~5k items: pre-filter in SQL and cache the candidate list |
| Interaction log | Unbounded table with indexes | Add a retention job and consider partitioning by month |
| Interest updates | Read-modify-write per request | Move to a Postgres function if concurrent writes cause lost updates |
| Generated-question cache | Database (with service key) or process memory | Always set the service key in production |
| Chat responses | Non-streaming | Add streaming (SSE) for faster perceived response time |

---

## Appendix — Environment matrix

| Environment | Storage | Auth | AI | Service worker |
| --- | --- | --- | --- | --- |
| `npm run dev`, no env | localStorage (demo) | none | mock | off |
| `npm run dev` + local Supabase | Local Postgres | Magic link via Inbucket | mock or real | off |
| `npm run build && npm start` | as configured | as configured | as configured | **on** |
| Private deploy | Hosted Supabase | Magic link, sign-ups closed | real, with spending cap | on (HTTPS) |
| Public release | Hosted Supabase | Magic link + CAPTCHA | real, shared limiter and budgets | on (HTTPS) |
