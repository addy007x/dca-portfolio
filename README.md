# SiamFolio DCA Portfolio Tracker

A portfolio tracker for DCA holdings, transactions, earnings, tax notes, reminders, and live price refreshes.

## Run Locally

On Windows:

```bat
open-dca.cmd
```

Then open:

```text
http://127.0.0.1:5173/
```

Keep the command window open while using the local app.

## GitHub Pages

After pushing to GitHub, the public app is served from:

```text
https://addy007x.github.io/dca-portfolio/
```

## Google Login

The public app uses Google login plus the Cloudflare Worker backend. Visitors only press **Sign in with Google**. They do not enter Supabase URL, publishable keys, or backend keys.

Each Google account saves its own portfolio snapshot in D1 table `portfolio_snapshots`.

Setup notes:

- `GOOGLE_SIGNIN.md`
- `backend/schema.sql`
- `backend/worker.js`

## Backend

The Cloudflare Worker lives in `backend/`.

Deploy basics:

```powershell
cd backend
wrangler secret put GOOGLE_CLIENT_ID
wrangler d1 execute siamfolio --file=schema.sql
wrangler deploy
```

`auth-config.js` only needs the Worker URL. The app reads the Google Client ID from the Worker.

## Main Files

- `index.html` - app entry point
- `auth-config.js` - public app auth config
- `auth.jsx` - Google login and cloud sync gate
- `app.jsx`, `views.jsx`, `dashboard.jsx`, `detail.jsx`, `tax.jsx` - main UI
- `store.jsx`, `api.jsx`, `backend.jsx`, `reminders.jsx` - data and integrations
- `backend/` - Cloudflare Worker + D1 backend
