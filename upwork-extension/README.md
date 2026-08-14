# Sari Job Radar (Browser-Erweiterung)

Pollt die Job-Feeds mehrerer Plattformen im Hintergrund über deren **eigene
Seiten/APIs** und reicht neue Jobs an Sari weiter. Das Backend filtert und pusht
in den Live-Feed. Kein CDP, kein sichtbares Browserfenster, kein DOM-Scraping in
einem automatisierten Browser — die Erweiterung macht Requests, die von normalen
Tab-Abrufen nicht unterscheidbar sind.

## Plattformen

| Key | Quelle | Modus |
|---|---|---|
| `upwork` | GraphQL `visitorJobSearch` (Bearer aus Cookie `UniversalSearchNuxt_vt`) | ✅ verifiziert |
| `onlinejobs` | Same-Origin-Fetch der Jobs-Liste + HTML-Parse | ✅ verifiziert |
| `guru` | Same-Origin-Fetch `/d/jobs/` + HTML-Parse | ✅ verifiziert |
| `freelancer` | Same-Origin-Fetch `/jobs` + HTML-Parse | ✅ verifiziert |
| `workingnomads`, `remoteok`, `jobspresso`, `peopleperhour`, `indeed` | Same-Origin-Fetch + HTML-Parse | Best-Effort (unverifiziert) |
| `reddit` | Subreddit-JSON-Feeds (`/r/<sub>/new.json`), URL = komma-getrennte Subs | ✅ verifiziert (Tab nötig) |
| `facebook` | Liest den gerenderten **Groups-Feed** des offenen Tabs (`?filter=groups&sk=h_chr`); Bildposts werden per Backend-OCR (tesseract) erfasst; strenger Intent-Filter gegen Noise | Reader verifiziert, OCR im Backend |
| `hubstaff` | Liest die gerenderten `/jobs/<slug>`-Links des offenen Tabs (JS-geladene Liste) | ✅ verifiziert |

## Wie es funktioniert

1. Der Service Worker feuert alle X Minuten (Alarm) einen Poll.
2. Pro Plattform wird ein **offener Tab** derselben Site gesucht (Content-Script
   läuft im Seitenkontext → echte Cookies/Header). Der Adapter holt die Jobs
   (GraphQL oder Fetch + Parse) und gibt sie als snake_case-Objekte zurück.
3. Nur **neue** Jobs (gegen `seenIds` je Plattform) werden an
   `POST <Sari-API>/api/jobs/upload-web` geschickt — mit der Source-UUID, die beim
   Speichern automatisch aus `/api/jobs/keywords` geholt wird.
4. Das Backend dedupliziert, filtert und pusht in den Live-Feed.

**Wichtig:** Für die HTML-Plattformen muss je ein Tab der jeweiligen Site offen
sein (der wird nur als „Bühne“ genutzt, nie neu geladen). Upwork kann auch ohne
Tab laufen (Service-Worker-Fetch via Cookie).

## Installation

1. `chrome://extensions` → Entwicklermodus → „Entpackte Erweiterung laden“ →
   Ordner `upwork-extension` (Ordnername bleibt, ist jetzt aber mehrspurig).
2. Im Popup konfigurieren:
   - **Sari API URL** (Default `https://va-copilot-theta.vercel.app`)
   - **Admin Secret** (aus `.env.local`)
   - **Intervall** in Minuten (z. B. `1.5` = 90s; Chrome-Alarms: unpacked ab 0.5 Min)
   - **Plattformen:** Häkchen setzen = aktiv; bei den HTML-Sites ggf. die
     Jobs-URL anpassen. Source-IDs werden automatisch gemappt.
3. **Save & Poll** → Status zeigt pro Plattform Ergebnis oder Fehler.

## Hinweise

- Nur neue Jobs werden hochgeladen → auch bei hoher Poll-Frequenz bleibt der
  Upload klein.
- Falls eine Site ihre Struktur ändert, wirft der Adapter einen Fehler im
  Popup-Status (dann Selector in `content.js` prüfen).
- `posted_at`, `budget`, `external_id` werden im Backend-Vertrag (snake_case)
  gesendet — der Live-Feed zeigt damit korrekte Alter und Budgets.
- Das Backend filtert beim Upload irrelevante Jobs (VA/WFH-Fokus) und löscht
  sie direkt; der **Cleanup**-Knopf im Popup entfernt außerdem zukunfts-datierte
  und schon vorhandene irrelevante Einträge.
- Jobspresso läuft im Collector über RSS; hier via HTML-Parse (Best-Effort).
