# Global Live Job Feed — Setup Guide

The centralized live job feed collects jobs from RSS/API sources via a Vercel
Cron job and from web sources via the browser extension's **Admin Mode**. It
runs entirely on Vercel's free tier + Supabase; no dedicated server is required.

## 1. Database migration

Run the new migration in your Supabase project:

```
supabase/migrations/20260805_global_jobs_feed.sql
```

It creates `job_sources`, `global_jobs`, and `user_job_interactions`, enables
RLS (public read for authenticated users, writes restricted to the service
role), adds the tables to realtime, and inserts the preset sources (Upwork,
OnlineJobs.ph, LinkedIn Jobs, Indeed).

## 2. Environment variables

Set these in your Vercel project (and local `.env.local`):

| Variable | Purpose |
|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` | Service-role key from Supabase → Settings → API. Used by the collector / admin endpoints to write to `global_jobs` (bypasses RLS). Never expose in the browser. |
| `CRON_SECRET` | Random string. Protects `/api/jobs/collect`. Used automatically by the cron in `vercel.json`. |
| `ADMIN_SECRET` | Random string. Protects `/api/jobs/upload-web` and `/api/jobs/pending-web-sources`. Paste into the extension's Admin Mode settings. |
| `JOOBLE_API_KEY` | Optional — only if you add a Jooble API source. |
| `GOOGLE_API_KEY`, `GOOGLE_CSE_ID` | Optional — only if you use Google Custom Search. |

Generate secrets with e.g. `openssl rand -hex 32`.

The cron is defined in `vercel.json` and calls `GET /api/jobs/collect` every
5 minutes (with `Authorization: Bearer $CRON_SECRET`). Vercel Cron runs on the
free (Hobby) plan.

## 3. Activating the extension Admin Mode

The Admin Mode scrapes web job sources (LinkedIn, Indeed, custom URLs) that
can't be reached by a server-side RSS/API poll. It uses your own browser.

1. Load the unpacked extension (`extension/` folder) in `chrome://extensions`.
2. Open the popup → **Settings** tab → scroll to **🛠️ Admin Mode**.
3. Toggle **Enable Admin Mode** and paste the same `ADMIN_SECRET` value, then
   press **Save & Start Collecting**.
4. Keep your browser (or just Chrome) running. The extension:
   - Every 6 minutes calls `GET /api/jobs/pending-web-sources` (up to 5 web
     sources not polled in the last 10 minutes),
   - opens each URL in a hidden tab, runs `scanJobListings()`,
   - uploads the jobs to `POST /api/jobs/upload-web` with `x-admin-secret`.

New jobs appear in **📡 Live Feed** automatically via Supabase Realtime.

### Setup checklist

- [ ] `job_sources` has active `source_type = 'web'` sources with URLs
      (manage from Dashboard → Settings → Job Sources).
- [ ] The extension is connected to Sari (Connect to Sari) and Admin Mode is
      enabled with the correct `ADMIN_SECRET`.
- [ ] Browser stays open. Closing the laptop pauses web scraping (RSS/API
      collection keeps running on Vercel).

## 4. Optional — 24/7 cloud scraping (low-cost)

To keep web scraping running around the clock without leaving your laptop on:

- **A spare computer / Raspberry Pi**: install Chrome (or Chromium) and the
  extension, enable Admin Mode, and leave it plugged in.
- **A small cloud VM (~$5/month, e.g. DigitalOcean droplet)**:
  1. Create a droplet (Ubuntu 22.04, basic $5 plan).
  2. Install Chromium: `sudo apt update && sudo apt install -y chromium-browser`
  3. Install the Sari extension in a fresh Chrome profile (or run Chromium in
     kiosk mode pointed at a Chrome Web Store / unpacked load). On Linux the
     cleanest approach is to run Chrome with a persistent profile and load the
     unpacked extension once via `--load-extension=/path/to/extension`.
  4. Enable Admin Mode in the extension settings (with your `ADMIN_SECRET`).
  5. Use `screen`/`tmux` (or a systemd service) to keep Chrome alive.
  6. Optionally add a `cron` on the VM to restart Chrome if it exits.

MVP note: your own computer is enough when it's on — RSS/API collection is
fully automatic.

## 5. User features

- **📡 Live Feed** (Dashboard sidebar): real-time feed of `global_jobs`,
  personalized matching scores, Save, Generate Pitch, bulk "Save All Visible",
  and filters by score/platform.
- **Settings → Job Sources**: toggle a source's "Include in Live Feed", see
  "Last collected", and add custom RSS/API/web sources.
- Manual / screenshot / URL import on `/dashboard/jobs` still works and now
  also publishes into the shared feed.
