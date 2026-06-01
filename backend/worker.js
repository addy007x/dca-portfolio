// SiamFolio Backend - Cloudflare Worker
//
// Public endpoints:
//   GET  /api/prices/crypto?symbols=BTC,ETH
//   GET  /api/prices/stocks?symbols=NVDA,AAPL.BK
//   GET  /api/prices/fx?from=USD&to=THB
//   GET  /api/health
//
// Google session endpoints:
//   GET  /api/auth/config
//   POST /api/auth/google
//   GET  /api/auth/me
//   POST /api/auth/logout
//
// Per-user portfolio endpoints:
//   GET  /api/portfolio
//   PUT  /api/portfolio
//
// Legacy single-user endpoints still accept X-Api-Key when API_KEY is set.

const COINGECKO_IDS = {
  BTC: "bitcoin", ETH: "ethereum", SOL: "solana", XAUT: "tether-gold",
  ADA: "cardano", XRP: "ripple", DOGE: "dogecoin", MATIC: "polygon-pos",
  BNB: "binancecoin", AVAX: "avalanche-2", LINK: "chainlink", DOT: "polkadot",
  TRX: "tron", LTC: "litecoin", UNI: "uniswap", ATOM: "cosmos",
  NEAR: "near", FIL: "filecoin", APT: "aptos", ARB: "arbitrum",
};

const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, X-Api-Key, Authorization",
  "Access-Control-Max-Age": "86400",
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS },
  });
}

function error(message, status = 400) {
  return json({ error: message }, status);
}

function requireApiKey(req, env) {
  const key = req.headers.get("X-Api-Key");
  if (!env.API_KEY) return null;
  const stored = env.API_KEY.trim();
  if (!key || key.trim() !== stored) return error("Unauthorized", 401);
  return null;
}

function getBearerToken(req) {
  const header = req.headers.get("Authorization") || "";
  if (!header.toLowerCase().startsWith("bearer ")) return "";
  return header.slice(7).trim();
}

function bytesToHex(buffer) {
  return [...new Uint8Array(buffer)].map(b => b.toString(16).padStart(2, "0")).join("");
}

async function sha256Hex(text) {
  const bytes = new TextEncoder().encode(text);
  return bytesToHex(await crypto.subtle.digest("SHA-256", bytes));
}

function randomToken() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

async function verifyGoogleCredential(credential, env) {
  if (!credential || typeof credential !== "string") throw new Error("Missing Google credential");
  if (!env.GOOGLE_CLIENT_ID) throw new Error("GOOGLE_CLIENT_ID is not configured on the Worker");

  const response = await fetch(
    "https://oauth2.googleapis.com/tokeninfo?id_token=" + encodeURIComponent(credential),
    { headers: { "Accept": "application/json" } }
  );
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error_description || "Google token verification failed");
  if (data.aud !== env.GOOGLE_CLIENT_ID) throw new Error("Google Client ID does not match");
  if (data.email_verified !== true && data.email_verified !== "true") throw new Error("Google email is not verified");
  if (!data.sub || !data.email) throw new Error("Google profile is incomplete");

  return {
    id: data.sub,
    email: data.email,
    name: data.name || data.email,
    picture: data.picture || "",
  };
}

async function createSession(env, user) {
  const now = Date.now();
  const expiresAt = now + SESSION_TTL_MS;
  const token = randomToken();
  const tokenHash = await sha256Hex(token);

  await env.DB.prepare(
    `INSERT INTO users(id,email,name,picture,created_at,last_login_at)
     VALUES(?,?,?,?,?,?)
     ON CONFLICT(id) DO UPDATE SET
       email=excluded.email,
       name=excluded.name,
       picture=excluded.picture,
       last_login_at=excluded.last_login_at`
  ).bind(user.id, user.email, user.name, user.picture, now, now).run();

  await env.DB.prepare(
    `INSERT INTO user_sessions(token_hash,user_id,email,name,picture,expires_at,created_at)
     VALUES(?,?,?,?,?,?,?)`
  ).bind(tokenHash, user.id, user.email, user.name, user.picture, expiresAt, now).run();

  return { token, expiresAt, user };
}

async function getSessionUser(req, env) {
  const token = getBearerToken(req);
  if (!token || !env.DB) return null;
  const tokenHash = await sha256Hex(token);
  const row = await env.DB.prepare(
    `SELECT user_id,email,name,picture,expires_at
     FROM user_sessions
     WHERE token_hash = ? AND expires_at > ?`
  ).bind(tokenHash, Date.now()).first();
  if (!row) return null;
  return {
    id: row.user_id,
    email: row.email,
    name: row.name,
    picture: row.picture,
  };
}

async function handleGoogleAuth(req, env) {
  if (!env.DB) return error("D1 database not bound", 500);
  const body = await req.json().catch(() => ({}));
  const user = await verifyGoogleCredential(body.credential, env);
  return json(await createSession(env, user));
}

async function handleMe(req, env) {
  const user = await getSessionUser(req, env);
  if (!user) return error("Unauthorized", 401);
  return json({ user });
}

async function handleLogout(req, env) {
  if (env.DB) {
    const token = getBearerToken(req);
    if (token) {
      await env.DB.prepare("DELETE FROM user_sessions WHERE token_hash = ?")
        .bind(await sha256Hex(token))
        .run();
    }
  }
  return json({ ok: true });
}

async function getUserPortfolio(env, user) {
  const row = await env.DB.prepare("SELECT data FROM portfolio_snapshots WHERE user_id = ?")
    .bind(user.id)
    .first();
  if (!row?.data) return json({});
  try {
    return json(JSON.parse(row.data));
  } catch (_) {
    return json({});
  }
}

async function putUserPortfolio(req, env, user) {
  const body = await req.json();
  await env.DB.prepare(
    `INSERT INTO portfolio_snapshots(user_id,data,updated_at)
     VALUES(?,?,?)
     ON CONFLICT(user_id) DO UPDATE SET
       data=excluded.data,
       updated_at=excluded.updated_at`
  ).bind(user.id, JSON.stringify(body), Date.now()).run();
  return json({ ok: true });
}

// Cache helpers. Workers KV is optional; in-memory cache covers warm isolates.
const memCache = new Map();
async function cacheGet(env, key) {
  if (env.CACHE) {
    const v = await env.CACHE.get(key, "json");
    if (v) return v;
  }
  const m = memCache.get(key);
  if (m && Date.now() - m.t < m.ttl) return m.v;
  return null;
}

async function cacheSet(env, key, value, ttlSec) {
  if (env.CACHE) {
    await env.CACHE.put(key, JSON.stringify(value), { expirationTtl: ttlSec });
  }
  memCache.set(key, { v: value, t: Date.now(), ttl: ttlSec * 1000 });
}

// Price proxies
async function handleCrypto(url, env) {
  const symbols = (url.searchParams.get("symbols") || "").split(",").filter(Boolean);
  const ids = symbols.map(s => COINGECKO_IDS[s.toUpperCase()]).filter(Boolean);
  if (ids.length === 0) return json({});
  const cacheKey = `cg:${ids.sort().join(",")}`;
  const cached = await cacheGet(env, cacheKey);
  if (cached) return json(cached);
  const r = await fetch(
    `https://api.coingecko.com/api/v3/simple/price?ids=${ids.join(",")}&vs_currencies=usd&include_24hr_change=true`,
    { headers: { "User-Agent": "SiamFolio/1.0 (https://github.com/addy007x/dca-portfolio)", "Accept": "application/json" } }
  );
  if (!r.ok) {
    const txt = await r.text().catch(() => "");
    return error(`CoinGecko ${r.status}: ${txt.slice(0, 200)}`, 502);
  }
  const data = await r.json();
  const out = {};
  for (const [t, id] of Object.entries(COINGECKO_IDS)) {
    if (data[id]) out[t] = { price: data[id].usd, chg1d: data[id].usd_24h_change ?? 0, source: "coingecko" };
  }
  await cacheSet(env, cacheKey, out, 30);
  return json(out);
}

async function handleStocks(url, env) {
  const symbols = (url.searchParams.get("symbols") || "").split(",").filter(Boolean);
  if (symbols.length === 0) return json({});
  const cacheKey = `yf:${symbols.sort().join(",")}`;
  const cached = await cacheGet(env, cacheKey);
  if (cached) return json(cached);
  const results = await Promise.all(symbols.map(async (sym) => {
    try {
      const r = await fetch(
        `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym)}?interval=1d&range=2d`,
        { headers: { "User-Agent": "Mozilla/5.0 SiamFolio/1.0" } }
      );
      if (!r.ok) return [sym, null];
      const data = await r.json();
      const meta = data?.chart?.result?.[0]?.meta;
      if (!meta || typeof meta.regularMarketPrice !== "number") return [sym, null];
      const price = meta.regularMarketPrice;
      const prev = meta.chartPreviousClose || meta.previousClose || price;
      const chg1d = prev > 0 ? ((price - prev) / prev) * 100 : 0;
      return [sym, { price, chg1d, source: "yahoo", currency: meta.currency }];
    } catch (_) {
      return [sym, null];
    }
  }));
  const out = {};
  for (const [sym, info] of results) if (info) out[sym] = info;
  await cacheSet(env, cacheKey, out, 60);
  return json(out);
}

async function handleFX(url, env) {
  const from = url.searchParams.get("from") || "USD";
  const to = url.searchParams.get("to") || "THB";
  const cacheKey = `fx:${from}-${to}`;
  const cached = await cacheGet(env, cacheKey);
  if (cached) return json(cached);
  const r = await fetch(`https://api.frankfurter.app/latest?from=${from}&to=${to}`);
  if (!r.ok) return error("Frankfurter upstream error", 502);
  const data = await r.json();
  const out = { rate: data?.rates?.[to], date: data?.date, base: from, quote: to };
  await cacheSet(env, cacheKey, out, 300);
  return json(out);
}

// Legacy single-user D1 portfolio CRUD
async function getPortfolio(env) {
  const [holdings, transactions, dca, earn, dcaLog] = await Promise.all([
    env.DB.prepare("SELECT * FROM holdings ORDER BY rowid").all(),
    env.DB.prepare("SELECT * FROM transactions ORDER BY date DESC").all(),
    env.DB.prepare("SELECT * FROM dca_schedules ORDER BY nextDate").all(),
    env.DB.prepare("SELECT * FROM earn_positions ORDER BY rowid").all(),
    env.DB.prepare("SELECT * FROM dca_log WHERE status IN ('due','notified') ORDER BY created_at DESC LIMIT 20").all(),
  ]);
  const holdingsOut = (holdings.results || []).map(h => ({
    ...h,
    spark: h.spark ? JSON.parse(h.spark) : [],
    paused: undefined,
  }));
  const dcaOut = (dca.results || []).map(d => ({ ...d, paused: !!d.paused }));
  return json({
    holdings: holdingsOut,
    transactions: transactions.results || [],
    dca: dcaOut,
    earn: earn.results || [],
    dueDcaLog: dcaLog.results || [],
  });
}

async function putPortfolio(req, env) {
  const body = await req.json();
  const { holdings = [], transactions = [], dca = [], earn = [] } = body;
  const stmts = [];
  stmts.push(env.DB.prepare("DELETE FROM holdings"));
  stmts.push(env.DB.prepare("DELETE FROM transactions"));
  stmts.push(env.DB.prepare("DELETE FROM dca_schedules"));
  stmts.push(env.DB.prepare("DELETE FROM earn_positions"));
  for (const h of holdings) {
    stmts.push(env.DB.prepare(
      "INSERT INTO holdings(id,ticker,name,classKey,ccy,qty,costAvg,price,chg1d,spark,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)"
    ).bind(h.id, h.ticker, h.name || "", h.classKey, h.ccy, h.qty, h.costAvg,
            h.price || 0, h.chg1d || 0, JSON.stringify(h.spark || []), Date.now()));
  }
  for (const t of transactions) {
    stmts.push(env.DB.prepare(
      "INSERT INTO transactions(id,ticker,kind,date,qty,pricePerUnit,valUSD,ccy,note,dca_id) VALUES (?,?,?,?,?,?,?,?,?,?)"
    ).bind(t.id, t.ticker, t.kind, t.date, t.qty, t.pricePerUnit || 0,
            t.valUSD || 0, t.ccy || "USD", t.note || "", t.dcaId || null));
  }
  for (const d of dca) {
    stmts.push(env.DB.prepare(
      "INSERT INTO dca_schedules(id,ticker,classKey,ccy,amount,freq,startDate,nextDate,executedCount,totalSpent,paused) VALUES (?,?,?,?,?,?,?,?,?,?,?)"
    ).bind(d.id, d.ticker, d.classKey || "crypto", d.ccy, d.amount, d.freq,
            d.startDate || null, d.nextDate || null,
            d.executedCount || 0, d.totalSpent || 0, d.paused ? 1 : 0));
  }
  for (const e of earn) {
    stmts.push(env.DB.prepare(
      "INSERT INTO earn_positions(id,sym,qty,apy,kind,earnedToday) VALUES (?,?,?,?,?,?)"
    ).bind(e.id, e.sym, e.qty, e.apy, e.kind || "", e.earnedToday || 0));
  }
  await env.DB.batch(stmts);
  return json({ ok: true, counts: { holdings: holdings.length, transactions: transactions.length, dca: dca.length, earn: earn.length } });
}

async function getDueDCAs(env) {
  const r = await env.DB.prepare(
    "SELECT * FROM dca_schedules WHERE paused = 0 AND nextDate <= ? ORDER BY nextDate"
  ).bind(new Date().toISOString().slice(0, 10)).all();
  return json({ due: r.results || [] });
}

function getLineTargetIds(env) {
  const raw = env.LINE_TO_ID || env.LINE_TARGET_ID || "";
  return raw.split(",").map(s => s.trim()).filter(Boolean);
}

function lineStatus(env) {
  return {
    enabled: !!(env.LINE_CHANNEL_ACCESS_TOKEN && getLineTargetIds(env).length),
    hasToken: !!env.LINE_CHANNEL_ACCESS_TOKEN,
    targets: getLineTargetIds(env).length,
  };
}

async function sendLinePush(env, text, toOverride) {
  if (!env.LINE_CHANNEL_ACCESS_TOKEN) throw new Error("LINE_CHANNEL_ACCESS_TOKEN is not configured");
  const targets = toOverride ? [toOverride] : getLineTargetIds(env);
  if (!targets.length) throw new Error("LINE_TO_ID is not configured");

  const results = [];
  for (const to of targets) {
    const res = await fetch("https://api.line.me/v2/bot/message/push", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${env.LINE_CHANNEL_ACCESS_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        to,
        messages: [{ type: "text", text }],
      }),
    });
    const body = await res.text().catch(() => "");
    if (!res.ok) throw new Error(`LINE ${res.status}: ${body.slice(0, 300)}`);
    results.push({ to, status: res.status });
  }
  return results;
}

function formatDcaLineMessage(due) {
  const lines = [
    "SiamFolio DCA reminder",
    `Due today: ${due.length} item(s)`,
    "",
    ...due.slice(0, 12).map(d => {
      const sym = d.ticker || "-";
      const amount = Number(d.amount || 0).toLocaleString("en-US");
      return `- ${sym}: ${d.ccy || "USD"} ${amount}`;
    }),
  ];
  if (due.length > 12) lines.push(`...and ${due.length - 12} more`);
  return lines.join("\n");
}

async function requireLineActionAuth(req, env) {
  const user = await getSessionUser(req, env);
  if (user) return { user };

  const key = req.headers.get("X-Api-Key");
  if (env.API_KEY && key && key.trim() === env.API_KEY.trim()) return { apiKey: true };

  return { response: error("Unauthorized", 401) };
}

async function handleLineTest(req, env, actor) {
  const body = await req.json().catch(() => ({}));
  const who = actor?.user?.name || actor?.user?.email || "SiamFolio";
  const text = (body.text || `SiamFolio LINE test\nSender: ${who}\nTime: ${new Date().toLocaleString("en-US", { timeZone: "Asia/Bangkok" })}`).slice(0, 4500);
  const results = await sendLinePush(env, text, body.to);
  return json({ ok: true, sent: results.length, results });
}

// Router
async function handleRequest(req, env, ctx) {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS_HEADERS });
  const url = new URL(req.url);
  const path = url.pathname;

  if (path === "/api/prices/crypto") return handleCrypto(url, env);
  if (path === "/api/prices/stocks") return handleStocks(url, env);
  if (path === "/api/prices/fx") return handleFX(url, env);
  if (path === "/api/health") return json({ ok: true, version: "2.0", time: new Date().toISOString() });
  if (path === "/api/line/status" && req.method === "GET") return json(lineStatus(env));

  if (path === "/api/auth/config" && req.method === "GET") {
    return json({ googleClientId: env.GOOGLE_CLIENT_ID || "" });
  }
  if (path === "/api/auth/google" && req.method === "POST") return handleGoogleAuth(req, env);
  if (path === "/api/auth/me" && req.method === "GET") return handleMe(req, env);
  if (path === "/api/auth/logout" && req.method === "POST") return handleLogout(req, env);
  if (path === "/api/line/test" && req.method === "POST") {
    const actor = await requireLineActionAuth(req, env);
    if (actor.response) return actor.response;
    return handleLineTest(req, env, actor);
  }

  if (!env.DB) return error("D1 database not bound", 500);

  const hasBearer = !!getBearerToken(req);
  const user = hasBearer ? await getSessionUser(req, env) : null;
  if (hasBearer && !user) return error("Unauthorized", 401);

  if (user && path === "/api/portfolio" && req.method === "GET") return getUserPortfolio(env, user);
  if (user && path === "/api/portfolio" && req.method === "PUT") return putUserPortfolio(req, env, user);

  const authErr = requireApiKey(req, env);
  if (authErr) return authErr;

  if (path === "/api/portfolio" && req.method === "GET") return getPortfolio(env);
  if (path === "/api/portfolio" && req.method === "PUT") return putPortfolio(req, env);
  if (path === "/api/dca/due" && req.method === "GET") return getDueDCAs(env);

  return error("Not found: " + path, 404);
}

// Cron handler. Scans legacy DCA schedules and logs due reminders.
async function handleCron(env) {
  if (!env.DB) return;
  const today = new Date().toISOString().slice(0, 10);
  const due = await env.DB.prepare(
    "SELECT * FROM dca_schedules WHERE paused = 0 AND nextDate <= ?"
  ).bind(today).all();
  const existing = await env.DB.prepare(
    "SELECT dca_id FROM dca_log WHERE date = ? AND status IN ('due','notified')"
  ).bind(today).all();
  const alreadyLogged = new Set((existing.results || []).map(r => r.dca_id));
  const newDue = (due.results || []).filter(d => !alreadyLogged.has(d.id));

  let lineSent = false;
  if (newDue.length > 0 && lineStatus(env).enabled) {
    try {
      await sendLinePush(env, formatDcaLineMessage(newDue));
      lineSent = true;
    } catch (e) {
      console.error("LINE push failed:", e.stack || e);
    }
  }

  const stmts = [];
  for (const d of newDue) {
    const logId = `log-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    stmts.push(env.DB.prepare(
      "INSERT INTO dca_log(id,dca_id,date,ticker,amount,status,created_at) VALUES (?,?,?,?,?,?,?)"
    ).bind(logId, d.id, today, d.ticker, d.amount, lineSent ? "notified" : "due", Date.now()));
  }
  if (stmts.length > 0) await env.DB.batch(stmts);
  console.log(`[cron ${today}] Logged ${stmts.length} due DCA(s); lineSent=${lineSent}`);
}

export default {
  async fetch(req, env, ctx) {
    try {
      return await handleRequest(req, env, ctx);
    } catch (e) {
      console.error("Worker error:", e.stack || e);
      return error("Server error: " + (e.message || String(e)), 500);
    }
  },
  async scheduled(event, env, ctx) {
    ctx.waitUntil(handleCron(env));
  },
};
