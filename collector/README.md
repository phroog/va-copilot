# Sari Live Feed Collector

Scrapes web job listing pages (Upwork, OnlineJobs.ph, LinkedIn, Indeed, ...)
with a real browser (Playwright) and uploads the found jobs into the shared
**Live Feed**. Only the admin runs this — end users never scrape.

Runs on your laptop for now. Later you can run the exact same script on a
server (headless) for 24/7 collection.

## Setup (once)

```bash
cd collector
npm install
npx playwright install chromium
```

## Run

```powershell
# in collector/
$env:ADMIN_SECRET = "your-admin-secret"
npm start        # loops forever, every 6 minutes
npm run once     # single pass, good for a first test
```

Optional env vars:

| Var | Default | Purpose |
|---|---|---|
| `SARI_API` | `https://va-copilot-theta.vercel.app` | Server URL |
| `ADMIN_SECRET` | — | Must match the server's `ADMIN_SECRET` |
| `POLL_INTERVAL_MIN` | `6` | How often to check for pending sources |
| `HEADLESS` | off | Set `1` to hide the browser window (server mode) |
| `PROFILE_DIR` | — | Persistent Playwright storage state (keeps logins for LinkedIn/Indeed) |

## How it works

1. `GET /api/jobs/pending-web-sources` (max 5 web sources not polled in 10 min).
2. Opens each URL in Chromium, waits for job cards, scans them.
3. `POST /api/jobs/upload-web` uploads the jobs to the shared feed.
4. Even on failure, the source is marked collected so it isn't hammered.

Jobs appear in the Live Feed via Supabase Realtime for **all** users.

## Server mode (later)

Same script, on a small VM with Chrome/Chromium installed:

```bash
HEADLESS=1 ADMIN_SECRET=... POLL_INTERVAL_MIN=5 npm start
```

Optionally use a `PROFILE_DIR` to keep logins so protected sites work.
