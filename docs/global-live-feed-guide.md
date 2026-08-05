# Global Live Job Feed — Setup Guide

The centralized live job feed collects jobs by scraping web listing pages
(Upwork, OnlineJobs.ph, LinkedIn, Indeed, ...) with Playwright and pushing
them into a shared feed. **Only the admin scrapes** — end users just browse
the feed and never run any scraper.

- The collector runs on the admin's laptop now, and can later run unchanged
  on a small server (headless) for 24/7 collection.
- There are **no RSS sources and no Vercel cron** — everything is web scraping
  by the admin collector.

## 1. Database migration

Run the migration in your Supabase project (SQL Editor):

```
supabase/migrations/20260805_global_jobs_feed.sql
```

It creates `job_sources`, `global_jobs`, and `user_job_interactions`, enables
RLS (public read for authenticated users, writes restricted to the service
role), adds `global_jobs` to realtime, and inserts preset web sources (Upwork,
OnlineJobs.ph, LinkedIn Jobs, Indeed search pages).

## 2. Environment variables

Set these in your Vercel project (and local `.env.local`):

| Variable | Purpose |
|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` | Service-role key from Supabase → Settings → API. Used by the admin endpoints to write to `global_jobs` (bypasses RLS). Never expose in the browser. |
| `ADMIN_SECRET` | Random string. Protects `/api/jobs/upload-web` and `/api/jobs/pending-web-sources`. Used by the admin collector. |

Generate secrets with e.g. `openssl rand -hex 32`.

## 3. Running the admin collector

See `collector/README.md` for full details. Quick start:

```powershell
cd collector
npm install
npx playwright install chromium
$env:ADMIN_SECRET = "your-admin-secret"
npm run once   # single test pass
npm start      # loops forever, every 6 minutes
```

The collector:
1. Calls `GET /api/jobs/pending-web-sources` (up to 5 web sources not polled
   in the last 10 minutes),
2. opens each URL in Chromium, waits for job cards, scans them,
3. uploads the jobs to `POST /api/jobs/upload-web` with `x-admin-secret`.

New jobs appear in **📡 Live Feed** for every user via Supabase Realtime.

Keep the laptop (or a server later) running — closing it pauses collection.
Sites that need a login (LinkedIn/Indeed) only yield what's visible without
a logged-in session; optionally use `PROFILE_DIR` to persist a login.

## 4. Optional — 24/7 cloud scraping (later)

When you want collection running without your laptop: run the same script on
a small VM (e.g. a $5 DigitalOcean droplet) with Chromium installed and
`HEADLESS=1`. See `collector/README.md`.

## 5. User features

- **📡 Live Feed** (Dashboard sidebar): real-time feed of `global_jobs`,
  personalized matching scores, Save, Generate Pitch, bulk "Save All Visible",
  and filters by score/platform.
- **Settings → Job Sources**: toggle a source's "Include in Live Feed", see
  "Last collected", and add custom web listing URLs.
- Manual / screenshot / URL import on `/dashboard/jobs` still works and now
  also publishes into the shared feed.
