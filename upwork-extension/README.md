# Sari Job Radar (Browser Extension)

Polls job feeds from multiple platforms in the background via their **own
pages/APIs** and forwards new jobs to Sari. The backend filters and pushes them
into the Live Feed. No CDP, no visible browser window, no DOM scraping in an
automated browser — the extension makes requests that are indistinguishable from
normal tab requests.

## Platforms

| Key | Source | Mode |
|---|---|---|
| `upwork` | GraphQL `visitorJobSearch` (Bearer from cookie `UniversalSearchNuxt_vt`) | ✅ verified |
| `onlinejobs` | Same-origin fetch of the jobs list + HTML parse | ✅ verified |
| `guru` | Same-origin fetch `/d/jobs/` + HTML parse | ✅ verified |
| `freelancer` | Same-origin fetch `/jobs` + HTML parse | ✅ verified |
| `workingnomads`, `remoteok`, `jobspresso`, `peopleperhour`, `indeed` | Same-origin fetch + HTML parse | Best-effort (unverified) |
| `reddit` | Subreddit JSON feeds (`/r/<sub>/new.json`), URL = comma-separated subs | ✅ verified (tab needed) |
| `facebook` | Reads the rendered **Groups feed** of the open tab (`?filter=groups&sk=h_chr`); image posts are captured via backend OCR (tesseract); strict intent filter against noise | Reader verified, OCR in backend |
| `hubstaff` | Reads the rendered `/jobs/<slug>` links of the open tab (JS-loaded list) | ✅ verified |

## How it works

1. The service worker fires a poll every X minutes (alarm).
2. For each platform an **open tab** of the same site is used (content script
   runs in the page context → real cookies/headers). The adapter fetches the
   jobs (GraphQL or fetch + parse) and returns them as snake_case objects.
3. Only **new** jobs (compared against `seenIds` per platform) are sent to
   `POST <Sari-API>/api/jobs/upload-web` — with the source UUID that is
   automatically resolved from `/api/jobs/keywords`.
4. The backend dedupes, filters and pushes into the Live Feed.

**Important:** For the HTML platforms a tab of the respective site must be open
(it is only used as a "stage", never reloaded). Upwork can also run without a
tab (service worker fetch via cookie).

## Installation

1. `chrome://extensions` → Developer mode → "Load unpacked" → select the
   `upwork-extension` folder.
2. Configure in the popup:
   - **Sari API URL** (default `https://va-copilot-theta.vercel.app`)
   - **Admin Secret** (from `.env.local`)
   - **Interval** in minutes (e.g. `1.5` = 90s; Chrome alarms: unpacked from 0.5 min)
   - **Platforms:** check = enabled; for HTML sites you can adjust the jobs URL.
     Source IDs are mapped automatically.
3. **Save & Poll** → the status shows the result or error per platform.

## Notes

- Only new jobs are uploaded → even with a high poll frequency the upload stays small.
- If a site changes its structure, the adapter reports an error in the popup
  status (then check the selectors in `content.js`).
- `posted_at`, `budget`, `external_id` are sent in the backend contract
  (snake_case) — the Live Feed shows correct ages and budgets.
- The backend filters out irrelevant jobs on upload (VA/WFH focus) and deletes
  them directly; the **Cleanup** button in the popup additionally removes
  future-dated and already-existing irrelevant entries.
- Jobspresso runs in the collector via RSS; here via HTML parse (best-effort).