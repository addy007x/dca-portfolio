# SiamFolio Backend — Cloudflare Worker + D1

Personal portfolio API. Free forever for personal use on Cloudflare's free tier:
- Workers: 100k requests/day
- D1: 5 GB storage, 5M reads/day
- Cron triggers: included

## What it gives you

| Feature | Phase A (localStorage only) | + Backend |
|---|---|---|
| Real-time crypto prices | ✅ | ✅ |
| Real-time FX | ✅ | ✅ |
| **Reliable stock prices** (no CORS proxy gambling) | ⚠️ flaky | **✅ rock-solid** |
| **Multi-device sync** | ❌ | **✅** |
| **DCA cron** (flags due reminders even when browser closed) | ❌ | **✅** |
| Works offline | ✅ | ✅ (falls back to cache) |

## One-time setup (~10 minutes)

### Option A — via `wrangler` CLI (requires Node.js)

```bash
# 1. Install
npm install -g wrangler

# 2. Login
wrangler login

# 3. Create the D1 database
wrangler d1 create siamfolio
# → copy the printed `database_id` into wrangler.toml

# 4. Run the schema
wrangler d1 execute siamfolio --file=schema.sql

# 5. Set a strong shared secret (the frontend will use this to authenticate)
wrangler secret put API_KEY
# → paste e.g. `openssl rand -hex 32` output

# 6. Deploy
wrangler deploy
# → prints your Worker URL, e.g. https://siamfolio-api.<your-subdomain>.workers.dev
```

### Option B — via Cloudflare dashboard (no Node.js needed)

1. Go to **[dash.cloudflare.com](https://dash.cloudflare.com)** → Workers & Pages → **Create**
2. **Create application** → Hello World template → name it `siamfolio-api`
3. Edit the worker code → paste contents of [`worker.js`](worker.js) → Deploy
4. From Workers & Pages → **D1 SQL Database** → Create database `siamfolio`
5. In the D1 console, paste contents of [`schema.sql`](schema.sql) → Execute
6. Back to your Worker → Settings → **Variables and Secrets**:
   - Add **Secret**: `API_KEY` = some long random string (save it!)
7. Worker → Settings → **Bindings**:
   - Add **D1 database binding**: name `DB`, database `siamfolio`
8. Worker → Settings → **Triggers** → **Cron Triggers** → Add: `0 2 * * *`
9. Copy your Worker's URL — looks like `https://siamfolio-api.your-name.workers.dev`

## Test it

```bash
# Health (no auth)
curl https://YOUR-WORKER.workers.dev/api/health

# Crypto prices (no auth)
curl 'https://YOUR-WORKER.workers.dev/api/prices/crypto?symbols=BTC,ETH'

# Stocks (no auth, server-side fetch fixes CORS)
curl 'https://YOUR-WORKER.workers.dev/api/prices/stocks?symbols=NVDA,AAPL,PTT.BK'

# Portfolio (needs API key)
curl https://YOUR-WORKER.workers.dev/api/portfolio \
  -H "X-Api-Key: YOUR-API-KEY"

# LINE OA status and test push
curl https://YOUR-WORKER.workers.dev/api/line/status
curl -X POST https://YOUR-WORKER.workers.dev/api/line/test \
  -H "X-Api-Key: YOUR-API-KEY"
```

## Connect the frontend

1. Open [https://addy007x.github.io/dca-portfolio/](https://addy007x.github.io/dca-portfolio/)
2. Open browser console (F12) and run:
   ```js
   localStorage.setItem('siamfolio.backend',
     JSON.stringify({ url: 'https://YOUR-WORKER.workers.dev', key: 'YOUR-API-KEY' }));
   location.reload();
   ```
3. Or use the Settings panel (Tweaks → Backend → set URL + key) once UI is in place.

After setup, the app will:
- Fetch prices via your Worker (instant, reliable)
- Sync portfolio to D1 on every change
- Show DCAs flagged by the daily cron

## API reference

```
GET  /api/health                                   → { ok, version, time }
GET  /api/prices/crypto?symbols=BTC,ETH            → { BTC: { price, chg1d }, ... }
GET  /api/prices/stocks?symbols=NVDA,PTT.BK        → { NVDA: { price, chg1d }, ... }
GET  /api/prices/fx?from=USD&to=THB                → { rate, date, base, quote }

# Authenticated (X-Api-Key header)
GET  /api/portfolio                                → { holdings, transactions, dca, earn, dueDcaLog }
PUT  /api/portfolio                                → full replace { holdings: [...], ... }
GET  /api/dca/due                                  → { due: [{...}] }
GET  /api/line/status                              → { enabled, hasToken, targets }
POST /api/line/test                                → sends a test LINE OA push
```

Cron: `0 2 * * *` (09:00 ICT daily) — scans `dca_schedules`, inserts rows in `dca_log` with `status='due'` for each ticker whose `nextDate <= today`. If LINE OA secrets are set, it sends one LINE push and stores `status='notified'`. Frontend reads `/api/dca/due` on load and shows banner.

## LINE OA notifications

Create a LINE Official Account and Messaging API channel, then set these Worker secrets:

```bash
wrangler secret put LINE_CHANNEL_ACCESS_TOKEN
wrangler secret put LINE_TO_ID
```

`LINE_TO_ID` is the destination user ID, group ID, or room ID. You can comma-separate multiple destinations. After deployment, open Settings in SiamFolio and press the LINE OA test button.

## Cost

Cloudflare's free tier covers personal use comfortably:
- 100k Worker requests/day — you'd need to refresh prices every second non-stop to hit this
- 5 GB D1 storage — your portfolio uses ~10 KB
- Unlimited bandwidth

If you ever exceed free tier, paid plan starts at $5/month with much higher limits.
