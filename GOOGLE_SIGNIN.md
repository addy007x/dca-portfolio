# Google Sign-In Setup

The public app now shows only Google login. Users do not enter Supabase URL or keys.

## 1. Google Cloud Console

Create an OAuth Client ID with application type **Web application**.

Authorized JavaScript origins:

- `https://addy007x.github.io`
- `http://127.0.0.1:5173`

For this Google Identity Services button, redirect URIs are not used by the app.

## 2. Frontend config

The public site only needs the Worker URL in `auth-config.js`:

```js
window.AUTH_CONFIG = {
  apiUrl: "https://siamfolio-api.kingbooms5678.workers.dev",
  googleClientId: "",
};
```

Leaving `googleClientId` blank is fine. The app reads it from `/api/auth/config` on the Worker.

## 3. Cloudflare Worker

Set the same Client ID on the Worker:

```powershell
cd backend
wrangler secret put GOOGLE_CLIENT_ID
wrangler d1 execute siamfolio --file=schema.sql
wrangler deploy
```

After that, anyone can open the GitHub Pages site, press **Sign in with Google**, and their portfolio is saved separately by Google account.
