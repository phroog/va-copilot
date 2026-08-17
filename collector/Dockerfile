# Sari Live Feed Collector — home server build.
# Runs the same collector.mjs headless, with a persistent browser profile so
# Cloudflare cf_clearance / login cookies survive restarts.
#
# Build & run:
#   docker compose up -d --build
# Logs:
#   docker compose logs -f
FROM node:20-slim

ENV NODE_ENV=production

# Chromium system deps (Playwright's recommended set) + curl for the Chrome download.
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    curl \
    fonts-liberation \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libc6 \
    libcairo2 \
    libcups2 \
    libdbus-1-3 \
    libdrm2 \
    libexpat1 \
    libfontconfig1 \
    libgbm1 \
    libglib2.0-0 \
    libnspr4 \
    libnss3 \
    libpango-1.0-0 \
    libx11-6 \
    libxcb1 \
    libxcomposite1 \
    libxdamage1 \
    libxext6 \
    libxfixes3 \
    libxkbcommon0 \
    libxrandr2 \
    xdg-utils \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install the collector (Playwright only).
COPY package.json package-lock.json ./
RUN npm install --omit=dev

# Real Google Chrome for the best Cloudflare behavior (channel: "chrome").
RUN curl -fsSL -o /tmp/chrome.deb https://dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb \
  && apt-get update \
  && apt-get install -y --no-install-recommends /tmp/chrome.deb \
  && rm -f /tmp/chrome.deb \
  && rm -rf /var/lib/apt/lists/*

# Bundled Chromium as a safe fallback when system Chrome is missing.
RUN npx playwright install chromium

# The collector itself.
COPY collector.mjs ./

# Keep a persistent browser profile (cookies / cf_clearance / logins).
RUN mkdir -p /app/profile
ENV PROFILE_DIR=/app/profile
ENV HEADLESS=1

CMD ["node", "collector.mjs"]
