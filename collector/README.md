# Sari Live Feed Collector

Scrapes web job listing pages (Upwork, OnlineJobs.ph, Indeed, ...) with a real
browser (Playwright) and uploads the found jobs into the shared **Live Feed**.
Only the admin runs this — end users never scrape.

For each source the collector expands a set of search **keywords** (default:
virtual assistant, social media manager, data entry, ...) into separate
newest-first search URLs, scrolls each page to load more results, and pushes
everything into the feed.

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
| `SEARCH_KEYWORDS` | a WFH role list | Comma-separated search terms expanded per platform |
| `POLL_INTERVAL_MIN` | `6` | How often to check for pending sources |
| `HEADLESS` | off | Set `1` to hide the browser window (server mode) |
| `PROFILE_DIR` | — | Persistent Playwright storage state (keeps logins) |
| `UPWORK_TYPED` | — | *(legacy)* alias → enables typed mode for Upwork |
| `TYPED_SEARCH` | `1` (compose) | Search **each** platform by typing into one warm tab (human sim) instead of navigating 16 URLs |

## How it works

1. `GET /api/jobs/pending-web-sources` (max 5 web sources not polled in 10 min).
2. Each source is expanded into per-keyword search URLs (newest first):
   - Upwork → `?q=<kw>&sort=recency`
   - OnlineJobs.ph → `?jobkeyword=<kw>` (30 results/page)
   - Indeed → `?q=<kw>&sort=date`
3. Opens each URL in Chromium, scrolls to load more cards, scans them.
4. `POST /api/jobs/upload-web` uploads the jobs to the shared feed.
5. Even on failure, the source is marked collected so it isn't hammered.

> **Typed-search mode** (`TYPED_SEARCH=1`, default in Compose): instead of
> opening 16 search-URL tabs, the collector opens **one** landing tab per
> platform (Upwork, OnlineJobs.ph, Freelancer, Guru, WorkingNomads — each
> configured with its search box), then for each keyword it focuses the box,
> types the term character-by-character with human jitter, presses Enter and
> scrapes the results. The tab (and its warm, logged-in session) stays open
> across passes — far fewer Cloudflare signals than navigation churns. Upwork
> profits most: in `CHROME_CDP` mode it reuses *your* real logged-in Chrome
> tab. Solve any CAPTCHA once in the window, then typed passes run smooth.
> Indeed falls back to URL-scan (typing hits a login wall). Jobspresso is
> consumed via its RSS feed instead of the browser. PeoplePerHour, Remote.co
> and RemoteOK are deactivated (dog food / feed mismatch).

Jobs appear in the Live Feed via Supabase Realtime for **all** users.

## Server mode (home server / Docker)

Run the exact same collector on an always-on machine behind your home IP
(ideal for Cloudflare: residential IP beats datacenter IP). E.g. an old
laptop. Docker is the easiest way — nothing is installed on the host beyond
Docker itself.

### 1. Install Docker

- **Windows (old laptop):** install **Docker Desktop** (uses WSL2) and start it.
- **Linux (Debian/Ubuntu):**
  ```bash
  curl -fsSL https://get.docker.com | sh
  ```

### 2. Configure

Create `collector/.env` (Docker Compose reads it automatically):

```
ADMIN_SECRET=your-admin-secret
SARI_API=https://va-copilot-theta.vercel.app
# Optional:
# POLL_INTERVAL_MIN=6
# CONCURRENCY=2
# SEARCH_KEYWORDS=virtual assistant,social media manager
```

### 3. Build & start

```bash
cd collector
docker compose up -d --build
```

- Logs: `docker compose logs -f`
- Stop: `docker compose down`
- Restarts automatically (`restart: unless-stopped`) — also after a reboot.
- The browser profile lives in the `collector-profile` volume, so
  Cloudflare cookies / logins survive restarts.

### 4. One-time Cloudflare unlock (optional)

If Upwork shows a CAPTCHA, unlock it once interactively so the cookie is
saved into the profile volume:

```bash
docker compose run --rm -e HEADLESS= collector /bin/bash -c \
  "node collector.mjs --once"   # (or run a normal headed pass)
```

Then start the service again. The persistent profile keeps the clearance.

### Headless tips

- The collector prefers a real system **Google Chrome** (`channel: "chrome"`,
  best for Cloudflare); the Docker image installs it. If it's ever missing it
  falls back to the bundled Chromium automatically.
- `CHROME_CDP` mode is laptop-only (drives a visible real Chrome) and is
  intentionally not used in containers.

## VPS mode (later)

Same Dockerfile runs unchanged on a small VPS (e.g. DigitalOcean, Hetzner).
Keep in mind datacenter IPs trigger more Cloudflare challenges — a home
server or residential proxy usually works better.
