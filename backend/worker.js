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

function randomCode(length = 6) {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return [...bytes].map(b => alphabet[b % alphabet.length]).join("");
}

function bangkokNow(ms = Date.now()) {
  const shifted = new Date(ms + 7 * 60 * 60 * 1000);
  return {
    date: shifted.toISOString().slice(0, 10),
    time: shifted.toISOString().slice(11, 16),
  };
}

function addDaysISO(iso, days) {
  const d = new Date((iso || bangkokNow().date) + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function dcaFreqDays(freq) {
  return { daily: 1, weekly: 7, biweekly: 14, monthly: 30 }[freq] || 7;
}

function nextDcaDate(freq, fromISO) {
  return addDaysISO(fromISO || bangkokNow().date, dcaFreqDays(freq));
}

function isDcaDueAt(dca, dateISO, timeHHMM) {
  if (!dca || dca.paused || !dca.nextDate) return false;
  if (dca.nextDate < dateISO) return true;
  if (dca.nextDate > dateISO) return false;
  return String(dca.execTime || "00:00").slice(0, 5) <= timeHHMM;
}

function normalizeDcaForCron(dca) {
  if (!dca) return dca;
  if (Number(dca.executedCount || 0) === 0 && dca.startDate && (!dca.nextDate || dca.nextDate > dca.startDate)) {
    return { ...dca, nextDate: dca.startDate };
  }
  return dca;
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
  const incoming = await req.json();
  const body = await mergePortfolioSnapshotForSave(env, user, incoming);
  await env.DB.prepare(
    `INSERT INTO portfolio_snapshots(user_id,data,updated_at)
     VALUES(?,?,?)
     ON CONFLICT(user_id) DO UPDATE SET
       data=excluded.data,
       updated_at=excluded.updated_at`
  ).bind(user.id, JSON.stringify(body), Date.now()).run();
  return json({ ok: true });
}

async function mergePortfolioSnapshotForSave(env, user, incoming) {
  const row = await env.DB.prepare("SELECT data FROM portfolio_snapshots WHERE user_id = ?")
    .bind(user.id)
    .first()
    .catch(() => null);
  if (!row?.data) return incoming;

  let current = null;
  try {
    current = JSON.parse(row.data || "{}");
  } catch (_) {
    return incoming;
  }

  const next = { ...incoming };
  const incomingTx = Array.isArray(incoming.transactions) ? incoming.transactions : [];
  const currentTx = Array.isArray(current.transactions) ? current.transactions : [];
  const txIds = new Set(incomingTx.map(t => t.id).filter(Boolean));
  const preservedDcaTx = currentTx.filter(t => t.kind === "dca" && t.dcaId && !txIds.has(t.id));
  if (preservedDcaTx.length) next.transactions = [...preservedDcaTx, ...incomingTx];

  const currentDcaById = new Map((current.dca || []).map(d => [d.id, d]));
  next.dca = (incoming.dca || []).map(d => {
    const old = currentDcaById.get(d.id);
    if (!old) return d;
    const oldCount = Number(old.executedCount || 0);
    const newCount = Number(d.executedCount || 0);
    if (oldCount <= newCount) return d;
    return {
      ...d,
      executedCount: old.executedCount,
      totalSpent: Math.max(Number(d.totalSpent || 0), Number(old.totalSpent || 0)),
      nextDate: old.nextDate || d.nextDate,
    };
  });

  return next;
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

const TRADFI_SYMBOLS = {
  XAUUSD: "XAUUSD=X",
  GOLD: "GC=F",
  "GC=F": "GC=F",
  GC: "GC=F",
};

const TRADFI_INTERVALS = {
  "15m": "15m",
  "1H": "1h",
  "1h": "1h",
  "4H": "1h",
  "4h": "1h",
  "1D": "1d",
  "1d": "1d",
};

function normalizeTradfiSymbol(symbol) {
  const s = String(symbol || "GC=F").trim().toUpperCase();
  return TRADFI_SYMBOLS[s] || s;
}

function normalizeTradfiInterval(granularity) {
  return TRADFI_INTERVALS[String(granularity || "1H")] || "1h";
}

function tradfiRangeFor(interval, limit) {
  const n = clampNumber(limit, 300, 50, 1000);
  if (interval === "15m") return n > 600 ? "30d" : "10d";
  if (interval === "1h") return n > 500 ? "6mo" : "60d";
  return n > 370 ? "5y" : "1y";
}

function normalizeYahooCandles(result, limit) {
  const timestamps = result?.timestamp || [];
  const quote = result?.indicators?.quote?.[0] || {};
  const out = timestamps.map((ts, i) => ({
    time: Number(ts) * 1000,
    open: Number(quote.open?.[i]),
    high: Number(quote.high?.[i]),
    low: Number(quote.low?.[i]),
    close: Number(quote.close?.[i]),
    baseVolume: Number(quote.volume?.[i] || 0),
    quoteVolume: Number(quote.volume?.[i] || 0),
  }))
    .filter(c =>
      Number.isFinite(c.time) &&
      Number.isFinite(c.open) &&
      Number.isFinite(c.high) &&
      Number.isFinite(c.low) &&
      Number.isFinite(c.close) &&
      c.close > 0
    )
    .sort((a, b) => a.time - b.time);
  return out.slice(-Math.round(clampNumber(limit, 300, 50, 1000)));
}

async function fetchTradfiCandles(params, env) {
  const requested = String(params.symbol || "GC=F").trim().toUpperCase();
  const symbol = normalizeTradfiSymbol(requested);
  const interval = normalizeTradfiInterval(params.granularity);
  const limit = Math.round(clampNumber(params.limit, 300, 50, 1000));
  const range = tradfiRangeFor(interval, limit);
  const cacheKey = `tradfi:candles:${symbol}:${interval}:${range}:${limit}`;
  const cached = await cacheGet(env, cacheKey);
  if (cached) return { ...cached, cached: true };

  const endpoint = new URL(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}`);
  endpoint.searchParams.set("interval", interval);
  endpoint.searchParams.set("range", range);
  endpoint.searchParams.set("includePrePost", "true");

  const response = await fetch(endpoint, {
    headers: {
      "Accept": "application/json",
      "User-Agent": "Mozilla/5.0 SiamFolio/1.0",
    },
  });
  const data = await response.json().catch(() => ({}));
  const result = data?.chart?.result?.[0];
  const err = data?.chart?.error;
  if (!response.ok || err || !result) {
    throw new Error(err?.description || `TradFi candles failed (${response.status})`);
  }

  const payload = {
    ok: true,
    symbol: requested,
    yahooSymbol: symbol,
    productType: "tradfi",
    granularity: params.granularity || interval,
    interval,
    range,
    limit,
    source: "yahoo",
    sourceLabel: symbol === "GC=F" ? "TradFi Gold Futures (COMEX)" : "TradFi Spot Gold",
    currency: result?.meta?.currency || "USD",
    candles: normalizeYahooCandles(result, limit),
    requestTime: Date.now(),
    cached: false,
  };
  if (!payload.candles.length) throw new Error("Yahoo returned no TradFi candles");
  await cacheSet(env, cacheKey, payload, 60);
  return payload;
}

async function responseJson(response, fallback = {}) {
  if (!response || !response.ok) return fallback;
  return response.json().catch(() => fallback);
}

function uniqueSymbols(values) {
  return [...new Set((values || [])
    .map(v => String(v || "").trim())
    .filter(Boolean))];
}

function stockLookupSymbol(holding) {
  const ticker = String(holding?.ticker || "").trim().toUpperCase();
  if (!ticker) return "";
  const classKey = String(holding?.classKey || "").toLowerCase();
  if (classKey === "th" && !ticker.endsWith(".BK")) return `${ticker}.BK`;
  return ticker;
}

async function refreshSnapshotPrices(env, snapshot, userId = "") {
  const holdings = Array.isArray(snapshot?.holdings) ? snapshot.holdings : [];
  if (!holdings.length) return snapshot || {};

  const cryptoSymbols = uniqueSymbols(holdings
    .filter(h => {
      const classKey = String(h.classKey || "").toLowerCase();
      const ticker = String(h.ticker || "").toUpperCase();
      return classKey === "crypto" || classKey === "gold" || COINGECKO_IDS[ticker];
    })
    .map(h => String(h.ticker || "").toUpperCase()));

  const stockSymbols = uniqueSymbols(holdings
    .filter(h => !cryptoSymbols.includes(String(h.ticker || "").toUpperCase()))
    .map(stockLookupSymbol));

  const [cryptoRes, stockRes, fxRes] = await Promise.allSettled([
    cryptoSymbols.length
      ? handleCrypto(new URL(`https://worker.local/api/prices/crypto?symbols=${encodeURIComponent(cryptoSymbols.join(","))}`), env)
      : Promise.resolve(json({})),
    stockSymbols.length
      ? handleStocks(new URL(`https://worker.local/api/prices/stocks?symbols=${encodeURIComponent(stockSymbols.join(","))}`), env)
      : Promise.resolve(json({})),
    handleFX(new URL("https://worker.local/api/prices/fx?from=USD&to=THB"), env),
  ]);

  const cryptoPrices = cryptoRes.status === "fulfilled" ? await responseJson(cryptoRes.value) : {};
  const stockPrices = stockRes.status === "fulfilled" ? await responseJson(stockRes.value) : {};
  const fxData = fxRes.status === "fulfilled" ? await responseJson(fxRes.value, null) : null;
  const fx = Number(fxData?.rate) || Number(snapshot?.fx) || 35.8;
  let changed = false;

  const nextHoldings = holdings.map(h => {
    const ticker = String(h.ticker || "").toUpperCase();
    const stockSymbol = stockLookupSymbol(h);
    const info = cryptoPrices[ticker] || stockPrices[stockSymbol] || stockPrices[ticker];
    if (!info || typeof info.price !== "number") return h;
    const oldPrice = Number(h.price || 0);
    const nextPrice = Number(info.price);
    const nextChg = typeof info.chg1d === "number" ? info.chg1d : h.chg1d;
    const nextSpark = [...(Array.isArray(h.spark) ? h.spark : []).slice(-7), nextPrice];
    if (oldPrice !== nextPrice || h.chg1d !== nextChg) changed = true;
    return {
      ...h,
      price: nextPrice,
      chg1d: nextChg,
      spark: nextSpark,
      priceSource: info.source || h.priceSource || "worker",
      priceUpdatedAt: Date.now(),
    };
  });

  const nextSnapshot = {
    ...(snapshot || {}),
    holdings: nextHoldings,
    fx,
    pricesUpdatedAt: Date.now(),
    priceRefreshSource: "line-worker",
  };

  if ((changed || fx !== Number(snapshot?.fx || 0)) && userId && env.DB) {
    await env.DB.prepare("UPDATE portfolio_snapshots SET data = ?, updated_at = ? WHERE user_id = ?")
      .bind(JSON.stringify(nextSnapshot), Date.now(), userId)
      .run()
      .catch(e => console.error("LINE price snapshot save failed:", e.stack || e));
  }

  return nextSnapshot;
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
      "INSERT INTO dca_schedules(id,ticker,classKey,ccy,amount,freq,startDate,nextDate,execTime,executedCount,totalSpent,paused) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)"
    ).bind(d.id, d.ticker, d.classKey || "crypto", d.ccy, d.amount, d.freq,
            d.startDate || null, d.nextDate || null, d.execTime || "09:00",
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
  const now = bangkokNow();
  const r = await env.DB.prepare(
    "SELECT * FROM dca_schedules WHERE paused = 0 AND nextDate <= ? ORDER BY nextDate"
  ).bind(now.date).all();
  const due = (r.results || []).filter(d => isDcaDueAt(d, now.date, now.time));
  return json({ due });
}

function getLineSecretTargetIds(env) {
  const raw = env.LINE_TO_ID || env.LINE_TARGET_ID || "";
  return raw.split(",").map(s => s.trim()).filter(Boolean);
}

async function getLineTargetIds(env) {
  const ids = new Set(getLineSecretTargetIds(env));
  if (env.DB) {
    try {
      const rows = await env.DB.prepare("SELECT id FROM line_targets ORDER BY last_seen_at DESC").all();
      for (const row of (rows.results || [])) {
        if (row.id) ids.add(row.id);
      }
    } catch (_) {
      // Schema may not have been applied yet; secret targets still work.
    }
  }
  return [...ids];
}

async function getLinkedLineTargets(env, userId) {
  if (!env.DB || !userId) return [];
  const rows = await env.DB.prepare(
    `SELECT line_target_id
     FROM line_account_links
     WHERE user_id = ?`
  ).bind(userId).all().catch(() => null);
  return (rows?.results || []).map(r => r.line_target_id).filter(Boolean);
}

async function getLineLinkedUserId(env, targetId) {
  if (!env.DB || !targetId) return "";
  const row = await env.DB.prepare(
    "SELECT user_id FROM line_account_links WHERE line_target_id = ?"
  ).bind(targetId).first().catch(() => null);
  return row?.user_id || "";
}

async function lineStatus(env) {
  const targets = await getLineTargetIds(env);
  const linked = env.DB
    ? await env.DB.prepare("SELECT COUNT(*) AS count FROM line_account_links").first().catch(() => null)
    : null;
  return {
    enabled: !!(env.LINE_CHANNEL_ACCESS_TOKEN && targets.length),
    hasToken: !!env.LINE_CHANNEL_ACCESS_TOKEN,
    targets: targets.length,
    linkedTargets: Number(linked?.count || 0),
    webhookUrl: "https://<your-worker>/api/line/webhook",
  };
}

async function sendLinePush(env, text, toOverride) {
  if (!env.LINE_CHANNEL_ACCESS_TOKEN) throw new Error("LINE_CHANNEL_ACCESS_TOKEN is not configured");
  const targets = toOverride
    ? Array.isArray(toOverride) ? toOverride : [toOverride]
    : await getLineTargetIds(env);
  if (!targets.length) throw new Error("No LINE target found. Add the OA as a friend and send it one message.");

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

function getLineSource(event) {
  const source = event?.source || {};
  if (source.userId) return { id: source.userId, kind: "user" };
  if (source.groupId) return { id: source.groupId, kind: "group" };
  if (source.roomId) return { id: source.roomId, kind: "room" };
  return null;
}

async function verifyLineSignature(req, env, bodyText) {
  if (!env.LINE_CHANNEL_SECRET) return true;
  const signature = req.headers.get("X-Line-Signature") || "";
  if (!signature) return false;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(env.LINE_CHANNEL_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const digest = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(bodyText));
  const expected = btoa(String.fromCharCode(...new Uint8Array(digest)));
  return signature === expected;
}

function lineMessages(payload) {
  if (Array.isArray(payload)) return payload;
  if (payload && typeof payload === "object") return [payload];
  return [{ type: "text", text: String(payload || "") }];
}

function normalizeLineReply(payload) {
  if (payload?.__lineReply) return payload;
  return { messages: lineMessages(payload), fallback: null };
}

async function postLineReply(env, replyToken, messages) {
  return fetch("https://api.line.me/v2/bot/message/reply", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${env.LINE_CHANNEL_ACCESS_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ replyToken, messages }),
  });
}

async function replyLine(env, replyToken, payload) {
  if (!env.LINE_CHANNEL_ACCESS_TOKEN || !replyToken) return;
  const reply = normalizeLineReply(payload);
  try {
    const res = await postLineReply(env, replyToken, reply.messages);
    if (res.ok) return;
    const body = await res.text().catch(() => "");
    console.error("LINE reply failed:", res.status, body);
    if (reply.fallback) {
      await postLineReply(env, replyToken, [{ type: "text", text: reply.fallback }]);
    }
  } catch (e) {
    console.error("LINE reply error:", e.stack || e);
    if (reply.fallback) {
      await postLineReply(env, replyToken, [{ type: "text", text: reply.fallback }]).catch(() => {});
    }
  }
}

function fmtTHB(value) {
  const n = Math.round(Math.abs(Number(value) || 0));
  return `${value < 0 ? "-" : ""}฿${n.toLocaleString("en-US")}`;
}

function fmtSignedTHB(value) {
  const n = Number(value) || 0;
  return `${n >= 0 ? "+" : "-"}${fmtTHB(Math.abs(n))}`;
}

function fmtPctValue(value) {
  const n = Number(value) || 0;
  return `${n >= 0 ? "+" : ""}${n.toFixed(2)}%`;
}

async function getLatestPortfolioData(env, userId = "") {
  const row = userId
    ? await env.DB.prepare("SELECT data FROM portfolio_snapshots WHERE user_id = ?")
      .bind(userId)
      .first()
      .catch(() => null)
    : await env.DB.prepare("SELECT data FROM portfolio_snapshots ORDER BY updated_at DESC LIMIT 1")
      .first()
      .catch(() => null);
  if (row?.data) {
    try {
      return JSON.parse(row.data);
    } catch (_) {}
  }

  const legacy = await env.DB.prepare("SELECT * FROM holdings ORDER BY rowid").all().catch(() => null);
  const holdings = (legacy?.results || []).map(h => ({
    ...h,
    spark: h.spark ? JSON.parse(h.spark) : [],
  }));
  return { holdings, fx: 35.8 };
}

function portfolioRows(snapshot) {
  const holdings = snapshot?.holdings || [];
  const fx = Number(snapshot?.fx) || 35.8;
  return holdings.map(h => {
    const qty = Number(h.qty) || 0;
    const price = Number(h.price) || 0;
    const costAvg = Number(h.costAvg) || 0;
    const multiplier = String(h.ccy || "USD").toUpperCase() === "THB" ? 1 : fx;
    const valueTHB = qty * price * multiplier;
    const costTHB = qty * costAvg * multiplier;
    const plTHB = valueTHB - costTHB;
    const plPct = costTHB > 0 ? (plTHB / costTHB) * 100 : 0;
    return {
      ticker: h.ticker || "-",
      name: h.name || "",
      valueTHB,
      costTHB,
      plTHB,
      plPct,
    };
  });
}

function formatAssetLine(row) {
  return `${row.ticker}: ${fmtSignedTHB(row.plTHB)} (${fmtPctValue(row.plPct)})`;
}

function portfolioStats(snapshot) {
  const rows = portfolioRows(snapshot);
  const totalValue = rows.reduce((sum, r) => sum + r.valueTHB, 0);
  const totalCost = rows.reduce((sum, r) => sum + r.costTHB, 0);
  const totalPL = totalValue - totalCost;
  const totalPct = totalCost > 0 ? (totalPL / totalCost) * 100 : 0;
  const gains = rows.filter(r => r.plTHB > 0).sort((a, b) => b.plTHB - a.plTHB);
  const losses = rows.filter(r => r.plTHB < 0).sort((a, b) => a.plTHB - b.plTHB);
  return { rows, totalValue, totalCost, totalPL, totalPct, gains, losses };
}

function compactSnapshotForAi(snapshot) {
  const stats = portfolioStats(snapshot);
  const now = bangkokNow();
  const dca = (snapshot?.dca || []).map(normalizeDcaForCron);
  const activeDca = dca.filter(d => !d.paused);
  const dueDca = activeDca.filter(d => isDcaDueAt(d, now.date, now.time));
  const nextDca = activeDca
    .slice()
    .sort((a, b) => String(a.nextDate || "").localeCompare(String(b.nextDate || "")))
    .slice(0, 8)
    .map(d => ({
      ticker: d.ticker,
      amount: Number(d.amount || 0),
      ccy: d.ccy || "USD",
      freq: d.freq || "weekly",
      nextDate: d.nextDate || "",
      execTime: d.execTime || "",
      executedCount: Number(d.executedCount || 0),
      totalSpent: Number(d.totalSpent || 0),
    }));
  const earn = (snapshot?.earn || []).map(e => ({
    sym: e.sym,
    qty: Number(e.qty || 0),
    apy: Number(e.apy || 0),
    accruedEarnedUSD: Number(e.accruedEarnedUSD ?? e.earnedToday ?? 0),
  }));
  return {
    nowBangkok: now,
    fx: Number(snapshot?.fx || 35.8),
    totals: {
      valueTHB: Math.round(stats.totalValue),
      costTHB: Math.round(stats.totalCost),
      plTHB: Math.round(stats.totalPL),
      plPct: Number(stats.totalPct.toFixed(2)),
      assetCount: stats.rows.length,
    },
    assets: stats.rows.map(r => ({
      ticker: r.ticker,
      name: r.name,
      valueTHB: Math.round(r.valueTHB),
      costTHB: Math.round(r.costTHB),
      plTHB: Math.round(r.plTHB),
      plPct: Number(r.plPct.toFixed(2)),
    })).sort((a, b) => b.valueTHB - a.valueTHB),
    gainers: stats.gains.slice(0, 5).map(r => ({ ticker: r.ticker, plTHB: Math.round(r.plTHB), plPct: Number(r.plPct.toFixed(2)) })),
    losers: stats.losses.slice(0, 5).map(r => ({ ticker: r.ticker, plTHB: Math.round(r.plTHB), plPct: Number(r.plPct.toFixed(2)) })),
    dca: {
      activeCount: activeDca.length,
      pausedCount: dca.filter(d => d.paused).length,
      dueCount: dueDca.length,
      due: dueDca.map(d => ({ ticker: d.ticker, amount: Number(d.amount || 0), ccy: d.ccy || "USD", nextDate: d.nextDate, execTime: d.execTime })),
      next: nextDca,
    },
    earn,
    transactionCount: (snapshot?.transactions || []).length,
    pricesUpdatedAt: snapshot?.pricesUpdatedAt || 0,
    priceRefreshSource: snapshot?.priceRefreshSource || "",
  };
}

function localAiAnswer(question, context) {
  const q = String(question || "").toLowerCase();
  const t = context.totals;
  if (
    q.includes("line") ||
    q.includes("oa") ||
    q.includes("@166kcvav") ||
    q.includes("ผูก") ||
    q.includes("แจ้งเตือน")
  ) {
    return [
      "ขั้นตอนผูก LINE OA กับ SiamFolio",
      "1. เพิ่มเพื่อน LINE OA: @166kcvav",
      "2. เปิดเว็บ SiamFolio แล้วล็อกอิน Google ให้เรียบร้อย",
      "3. ไปที่ Settings > LINE OA",
      "4. กดสร้างรหัสผูก LINE",
      "5. คัดลอกรหัส แล้วพิมพ์ในแชท LINE ว่า: ผูก CODE",
      "6. ถ้าผูกสำเร็จ จะขึ้นข้อความยืนยัน",
      "",
      "หลังผูกแล้วพิมพ์ใน LINE ได้ เช่น พอร์ต, กำไร, ขาดทุน, DCA, คำสั่ง",
    ].join("\n");
  }
  if (!context.assets.length) return "ยังไม่มีข้อมูลพอร์ตในระบบครับ ลองเพิ่มสินทรัพย์หรือรอ cloud sync ก่อน แล้วถามผมใหม่ได้เลย";
  if (q.includes("dca") || q.includes("รอบ") || q.includes("ซื้อ")) {
    const due = context.dca.due.length
      ? context.dca.due.map(d => `- ${d.ticker}: ${d.ccy} ${d.amount} เวลา ${d.execTime || "-"}`).join("\n")
      : "ตอนนี้ยังไม่มีรายการ DCA ที่ถึงรอบ";
    const next = context.dca.next.length
      ? context.dca.next.slice(0, 5).map(d => `- ${d.ticker}: ${d.ccy} ${d.amount} วันที่ ${d.nextDate} ${d.execTime || ""}`).join("\n")
      : "ยังไม่มี DCA ที่เปิดใช้งาน";
    return `สรุป DCA ตอนนี้\nใช้งานอยู่ ${context.dca.activeCount} รายการ, พักไว้ ${context.dca.pausedCount} รายการ\n\nถึงรอบ:\n${due}\n\nรอบถัดไป:\n${next}`;
  }
  if (q.includes("ลบ") || q.includes("ขาดทุน") || q.includes("ติด")) {
    return context.losers.length
      ? `สินทรัพย์ที่ติดลบเด่น ๆ:\n${context.losers.map(a => `- ${a.ticker}: ${fmtSignedTHB(a.plTHB)} (${fmtPctValue(a.plPct)})`).join("\n")}`
      : "ตอนนี้ยังไม่มีสินทรัพย์ที่ติดลบในพอร์ตครับ";
  }
  if (q.includes("บวก") || q.includes("กำไร") || q.includes("เด่น")) {
    return context.gainers.length
      ? `สินทรัพย์ที่เป็นบวกเด่น ๆ:\n${context.gainers.map(a => `- ${a.ticker}: ${fmtSignedTHB(a.plTHB)} (${fmtPctValue(a.plPct)})`).join("\n")}`
      : "ตอนนี้ยังไม่มีสินทรัพย์ที่เป็นบวกในพอร์ตครับ";
  }
  if (q.includes("earn") || q.includes("ดอก")) {
    const totalEarn = context.earn.reduce((sum, e) => sum + Number(e.accruedEarnedUSD || 0), 0);
    return `Earn ตอนนี้มี ${context.earn.length} รายการ ดอกเบี้ยสะสมประมาณ $${totalEarn.toFixed(4)}\n${context.earn.slice(0, 6).map(e => `- ${e.sym}: qty ${e.qty}, APY ${e.apy}%`).join("\n") || "ยังไม่มีรายการ Earn"}`;
  }
  return [
    "สรุปพอร์ตจากข้อมูลล่าสุด",
    `มูลค่ารวม: ${fmtTHB(t.valueTHB)}`,
    `ต้นทุนรวม: ${fmtTHB(t.costTHB)}`,
    `กำไร/ขาดทุน: ${fmtSignedTHB(t.plTHB)} (${fmtPctValue(t.plPct)})`,
    `จำนวนสินทรัพย์: ${t.assetCount} ตัว`,
    `DCA ใช้งานอยู่: ${context.dca.activeCount} รายการ`,
    "",
    "ถามต่อได้ เช่น “DCA รอบต่อไป”, “ตัวไหนติดลบ”, “Earn ได้เท่าไหร่”",
  ].join("\n");
}

async function openAiAnswer(env, question, context, history = []) {
  const messages = Array.isArray(history) ? history.slice(-8) : [];
  const prompt = [
    "ข้อมูลพอร์ตผู้ใช้แบบ JSON:",
    JSON.stringify(context),
    "",
    "ประวัติแชทล่าสุด:",
    JSON.stringify(messages),
    "",
    "คำถามผู้ใช้:",
    String(question || "").slice(0, 1200),
  ].join("\n");

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: env.OPENAI_MODEL || "gpt-4.1-mini",
      instructions: [
        "ถ้าผู้ใช้ถามเรื่อง LINE OA หรือแจ้งเตือน ให้บอกขั้นตอน: เพิ่มเพื่อน @166kcvav, เปิดเว็บและล็อกอิน Google, ไป Settings > LINE OA, กดสร้างรหัสผูก LINE, แล้วพิมพ์ใน LINE ว่า ผูก CODE",
        "คุณคือ SiamFolio AI ผู้ช่วยภาษาไทยสำหรับระบบ DCA Portfolio Tracker",
        "ตอบจากข้อมูล JSON ที่ให้มาเท่านั้น ถ้าไม่มีข้อมูลให้บอกว่าไม่พบข้อมูล",
        "ช่วยอธิบายพอร์ต, DCA schedule, Earn, ธุรกรรม, LINE alert และสิ่งที่ควรเช็กวันนี้",
        "อย่าอ้างว่าเป็นคำแนะนำการลงทุน ให้พูดว่าเป็นการช่วยอ่านข้อมูลและจัดลำดับสิ่งที่ควรตรวจ",
        "ตอบสั้น กระชับ เป็น bullet ได้ ไม่เกิน 8 บรรทัดถ้าไม่ได้ถูกขอให้ละเอียด",
      ].join("\n"),
      input: prompt,
      max_output_tokens: 700,
    }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error?.message || `OpenAI ${response.status}`);
  return data.output_text
    || (data.output || []).flatMap(item => item.content || []).map(c => c.text || "").join("").trim()
    || "ผมประมวลผลแล้ว แต่ไม่ได้รับข้อความตอบกลับจาก AI";
}

async function handleAiChat(req, env, user) {
  if (!env.DB) return error("D1 database not bound", 500);
  const body = await req.json().catch(() => ({}));
  const question = String(body.question || "").trim();
  if (!question) return error("Missing question", 400);

  const latest = await getLatestPortfolioData(env, user.id);
  const snapshot = await refreshSnapshotPrices(env, latest, user.id).catch(() => latest);
  const context = compactSnapshotForAi(snapshot);

  if (!env.OPENAI_API_KEY) {
    return json({ ok: true, mode: "local", answer: localAiAnswer(question, context), contextUpdatedAt: snapshot.pricesUpdatedAt || 0 });
  }

  try {
    const answer = await openAiAnswer(env, question, context, body.history);
    return json({ ok: true, mode: "openai", answer, contextUpdatedAt: snapshot.pricesUpdatedAt || 0 });
  } catch (e) {
    return json({ ok: true, mode: "local-fallback", answer: localAiAnswer(question, context), warning: e.message, contextUpdatedAt: snapshot.pricesUpdatedAt || 0 });
  }
}

function formatPortfolioSummary(snapshot, mode = "summary") {
  const { rows, totalValue, totalCost, totalPL, totalPct, gains, losses } = portfolioStats(snapshot);
  if (!rows.length) {
    return "SiamFolio\nยังไม่มีข้อมูลพอร์ตในระบบ ลองเปิดเว็บแล้วรอให้ sync ก่อนนะครับ";
  }

  if (mode === "gain") {
    return [
      "SiamFolio - สินทรัพย์บวก",
      gains.length ? gains.slice(0, 8).map(formatAssetLine).join("\n") : "ยังไม่มีสินทรัพย์ที่เป็นบวก",
    ].join("\n");
  }

  if (mode === "loss") {
    return [
      "SiamFolio - สินทรัพย์ติดลบ",
      losses.length ? losses.slice(0, 8).map(formatAssetLine).join("\n") : "ยังไม่มีสินทรัพย์ที่ติดลบ",
    ].join("\n");
  }

  const lines = [
    "SiamFolio Portfolio",
    `มูลค่าปัจจุบัน: ${fmtTHB(totalValue)}`,
    `กำไร/ขาดทุนรวม: ${fmtSignedTHB(totalPL)} (${fmtPctValue(totalPct)})`,
    `สินทรัพย์ทั้งหมด: ${rows.length} ตัว`,
    "",
    "บวกเด่น:",
    gains.length ? gains.slice(0, 3).map(formatAssetLine).join("\n") : "ไม่มี",
    "",
    "ติดลบ:",
    losses.length ? losses.slice(0, 3).map(formatAssetLine).join("\n") : "ไม่มี",
  ];
  return lines.join("\n").slice(0, 4800);
}

function flexText(text, extra = {}) {
  return { type: "text", text: String(text), ...extra };
}

function flexMetric(label, value, color) {
  return {
    type: "box",
    layout: "vertical",
    spacing: "xs",
    contents: [
      flexText(label, { size: "xs", color: "#8C7D6B", weight: "bold" }),
      flexText(value, { size: "xl", color, weight: "bold", wrap: true }),
    ],
  };
}

function flexAssetRow(row) {
  const positive = row.plTHB >= 0;
  return {
    type: "box",
    layout: "horizontal",
    spacing: "sm",
    contents: [
      flexText(row.ticker, { size: "sm", color: "#211C18", weight: "bold", flex: 2 }),
      flexText(fmtSignedTHB(row.plTHB), {
        size: "sm",
        color: positive ? "#26A269" : "#D94E4E",
        weight: "bold",
        align: "end",
        flex: 3,
      }),
      flexText(fmtPctValue(row.plPct), {
        size: "xs",
        color: "#8C7D6B",
        align: "end",
        flex: 2,
      }),
    ],
  };
}

function flexList(title, rows, emptyText, color) {
  return {
    type: "box",
    layout: "vertical",
    spacing: "sm",
    margin: "lg",
    contents: [
      flexText(title, { size: "sm", color, weight: "bold" }),
      ...(rows.length
        ? rows.slice(0, 3).map(flexAssetRow)
        : [flexText(emptyText, { size: "sm", color: "#8C7D6B" })]),
    ],
  };
}

function portfolioFlexMessage(snapshot) {
  const { rows, totalValue, totalPL, totalPct, gains, losses } = portfolioStats(snapshot);
  if (!rows.length) return formatPortfolioSummary(snapshot, "summary");

  const positive = totalPL >= 0;
  const accent = positive ? "#26A269" : "#D94E4E";
  const altText = `SiamFolio Portfolio ${fmtTHB(totalValue)} ${fmtSignedTHB(totalPL)} (${fmtPctValue(totalPct)})`;

  return {
    type: "flex",
    altText,
    contents: {
      type: "bubble",
      header: {
        type: "box",
        layout: "vertical",
        paddingAll: "18px",
        backgroundColor: "#191512",
        contents: [
          flexText("SIAMFOLIO", { size: "xs", color: "#E6C56A", weight: "bold" }),
          flexText("Portfolio Snapshot", { size: "xl", color: "#FFFFFF", weight: "bold", margin: "sm" }),
          flexText(new Date().toLocaleString("th-TH", { timeZone: "Asia/Bangkok" }), {
            size: "xs",
            color: "#C9B8A5",
            margin: "sm",
          }),
        ],
      },
      body: {
        type: "box",
        layout: "vertical",
        spacing: "md",
        paddingAll: "18px",
        contents: [
          flexMetric("มูลค่าพอร์ตปัจจุบัน", fmtTHB(totalValue), "#211C18"),
          {
            type: "box",
            layout: "vertical",
            spacing: "xs",
            paddingAll: "14px",
            backgroundColor: positive ? "#EAF8F0" : "#FDEEEE",
            cornerRadius: "12px",
            contents: [
              flexText("กำไร/ขาดทุนรวม", { size: "xs", color: "#8C7D6B", weight: "bold" }),
              flexText(`${fmtSignedTHB(totalPL)} (${fmtPctValue(totalPct)})`, {
                size: "lg",
                color: accent,
                weight: "bold",
                wrap: true,
              }),
            ],
          },
          {
            type: "box",
            layout: "horizontal",
            spacing: "md",
            contents: [
              flexMetric("สินทรัพย์", `${rows.length} ตัว`, "#211C18"),
              flexMetric("สถานะ", positive ? "กำไร" : "ติดลบ", accent),
            ],
          },
          { type: "separator", margin: "lg", color: "#E8DDCF" },
          flexList("บวกเด่น", gains, "ยังไม่มีสินทรัพย์ที่เป็นบวก", "#26A269"),
          flexList("ติดลบ", losses, "ยังไม่มีสินทรัพย์ที่ติดลบ", "#D94E4E"),
        ],
      },
      footer: {
        type: "box",
        layout: "vertical",
        spacing: "sm",
        contents: [
          {
            type: "button",
            style: "primary",
            color: "#191512",
            action: {
              type: "uri",
              label: "เปิด Dashboard",
              uri: "https://addy007x.github.io/dca-portfolio/",
            },
          },
          flexText("พิมพ์ บวก / ลบ / คำสั่ง เพื่อดูเพิ่ม", {
            size: "xs",
            color: "#8C7D6B",
            align: "center",
            margin: "sm",
          }),
        ],
      },
    },
  };
}

function lineCommand(text) {
  const t = String(text || "").trim().toLowerCase();
  if (!t) return null;
  if (/^(ผูก|link)\s*[a-z0-9]{4,12}$/i.test(t) || /^[a-z0-9]{6}$/i.test(t)) return "link";
  if (["help", "คำสั่ง", "ช่วยเหลือ"].includes(t)) return "help";
  if (t.includes("ลบ") || t.includes("ขาดทุน") || t.includes("แดง")) return "loss";
  if (t.includes("บวก") || t.includes("กำไร") || t.includes("เขียว")) return "gain";
  if (t.includes("พอร์ต") || t.includes("portfolio") || t.includes("สรุป") || t.includes("มูลค่า")) return "summary";
  return null;
}

function extractLineLinkCode(text) {
  const t = String(text || "").trim();
  const m = t.match(/^(?:ผูก|link)\s*([A-Za-z0-9]{4,12})$/i) || t.match(/^([A-Za-z0-9]{6})$/i);
  return m ? m[1].toUpperCase() : "";
}

async function linkLineTarget(env, target, text) {
  const code = extractLineLinkCode(text);
  if (!code) return null;

  const now = Date.now();
  const row = await env.DB.prepare(
    "SELECT * FROM line_link_codes WHERE code = ? AND expires_at > ?"
  ).bind(code, now).first().catch(() => null);
  if (!row) {
    return "รหัสผูกบัญชีไม่ถูกต้องหรือหมดอายุแล้ว\nให้เปิดเว็บ SiamFolio แล้วกดสร้างรหัสใหม่";
  }

  await env.DB.batch([
    env.DB.prepare(
      `INSERT INTO line_targets(id,kind,display_name,created_at,last_seen_at)
       VALUES(?,?,?,?,?)
       ON CONFLICT(id) DO UPDATE SET
         kind=excluded.kind,
         last_seen_at=excluded.last_seen_at`
    ).bind(target.id, target.kind, "", now, now),
    env.DB.prepare(
      `INSERT INTO line_account_links(line_target_id,user_id,linked_at)
       VALUES(?,?,?)
       ON CONFLICT(line_target_id) DO UPDATE SET
         user_id=excluded.user_id,
         linked_at=excluded.linked_at`
    ).bind(target.id, row.user_id, now),
    env.DB.prepare("DELETE FROM line_link_codes WHERE code = ?").bind(code),
  ]);

  return [
    "ผูก LINE กับ SiamFolio สำเร็จ ✅",
    row.name || row.email ? `บัญชี: ${row.name || row.email}` : "",
    "ต่อไปพิมพ์ 'พอร์ต' เพื่อดูพอร์ตของบัญชีนี้ได้เลย",
  ].filter(Boolean).join("\n");
}

async function lineCommandReply(env, text, targetId = "") {
  const command = lineCommand(text);
  if (command === "help") {
    return [
      "SiamFolio คำสั่ง",
      "พอร์ต / สรุป - ดูมูลค่าพอร์ตและกำไรขาดทุน",
      "บวก / กำไร - ดูสินทรัพย์ที่เป็นบวก",
      "ลบ / ขาดทุน - ดูสินทรัพย์ที่ติดลบ",
      "ผูก CODE - ผูก LINE กับบัญชี Google ของคุณ",
    ].join("\n");
  }
  if (command === "link") return null;
  if (!command) return null;
  const userId = await getLineLinkedUserId(env, targetId);
  if (!userId) {
    return "LINE นี้ยังไม่ได้ผูกกับบัญชี SiamFolio\nเปิดเว็บ > Settings > LINE OA > สร้างรหัสผูก LINE แล้วพิมพ์ 'ผูก CODE' มาที่นี่";
  }
  const snapshot = await refreshSnapshotPrices(env, await getLatestPortfolioData(env, userId), userId);
  if (command === "summary") {
    const flex = portfolioFlexMessage(snapshot);
    return {
      __lineReply: true,
      messages: lineMessages(flex),
      fallback: formatPortfolioSummary(snapshot, "summary"),
    };
  }
  return formatPortfolioSummary(snapshot, command);
}

async function handleLineWebhook(req, env) {
  if (!env.DB) return error("D1 database not bound", 500);
  const bodyText = await req.text();
  const valid = await verifyLineSignature(req, env, bodyText);
  if (!valid) return error("Invalid LINE signature", 401);

  const body = JSON.parse(bodyText || "{}");
  const now = Date.now();
  let saved = 0;
  const stmts = [];
  const replies = [];

  for (const event of (body.events || [])) {
    const target = getLineSource(event);
    if (!target) continue;
    saved += 1;
    stmts.push(env.DB.prepare(
      `INSERT INTO line_targets(id,kind,display_name,created_at,last_seen_at)
       VALUES(?,?,?,?,?)
       ON CONFLICT(id) DO UPDATE SET
         kind=excluded.kind,
         last_seen_at=excluded.last_seen_at`
    ).bind(target.id, target.kind, "", now, now));
    if (event.replyToken) {
      const text = event.message?.type === "text" ? event.message.text : "";
      replies.push((async () => {
        const linkedText = await linkLineTarget(env, target, text);
        const commandText = linkedText || await lineCommandReply(env, text, target.id);
        await replyLine(
          env,
          event.replyToken,
          commandText || "SiamFolio เชื่อม LINE OA แล้ว ✅\nพิมพ์ 'พอร์ต' เพื่อดูมูลค่าพอร์ต หรือ 'คำสั่ง' เพื่อดูคำสั่งทั้งหมด"
        );
      })());
    }
  }

  if (stmts.length > 0) await env.DB.batch(stmts);
  if (replies.length > 0) await Promise.all(replies);
  return json({ ok: true, saved });
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

function executeDcaInSnapshot(snapshot, dueDca, dateISO) {
  const dcaId = dueDca.id;
  const amount = Number(dueDca.amount || 0);
  const holdings = Array.isArray(snapshot.holdings) ? snapshot.holdings : [];
  const transactions = Array.isArray(snapshot.transactions) ? snapshot.transactions : [];
  const holding = holdings.find(h => h.ticker === dueDca.ticker);
  const price = Number(holding?.price || holding?.costAvg || amount || 1);
  const qty = price > 0 ? amount / price : 0;
  const fx = Number(snapshot.fx || 35.8);
  const tx = {
    id: `tx-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    ticker: dueDca.ticker,
    kind: "dca",
    date: dateISO,
    qty,
    pricePerUnit: price,
    valUSD: dueDca.ccy === "USD" ? amount : amount / fx,
    note: `DCA auto - ${dueDca.freq || "weekly"}`,
    ccy: dueDca.ccy || holding?.ccy || "USD",
    dcaId,
  };

  const nextHoldings = holding
    ? holdings.map(h => {
        if (h.id !== holding.id) return h;
        const oldQty = Number(h.qty || 0);
        const oldCost = Number(h.costAvg || price);
        const newQty = oldQty + qty;
        const costAvg = newQty > 0 ? ((oldQty * oldCost) + (qty * price)) / newQty : oldCost;
        return { ...h, qty: newQty, costAvg };
      })
    : holdings;

  const nextDca = (snapshot.dca || []).map(d => d.id === dcaId ? {
    ...d,
    executedCount: Number(d.executedCount || 0) + 1,
    totalSpent: Number(d.totalSpent || 0) + amount,
    nextDate: nextDcaDate(d.freq, dateISO),
  } : d);

  return {
    ...snapshot,
    holdings: nextHoldings,
    transactions: [tx, ...transactions],
    dca: nextDca,
  };
}

function hasDcaTransaction(snapshot, dca, dateISO) {
  const rows = Array.isArray(snapshot?.transactions) ? snapshot.transactions : [];
  return rows.some(t => {
    if (t.dcaId && dca.id && t.dcaId === dca.id && t.date === dateISO) return true;
    return t.kind === "dca" && t.ticker === dca.ticker && t.date === dateISO && Number(t.valUSD || 0) === Number(dca.amount || 0);
  });
}

function formatDcaExecutedLineMessage(due) {
  const lines = [
    "SiamFolio DCA executed",
    `Completed: ${due.length} item(s)`,
    "",
    ...due.slice(0, 12).map(d => {
      const amount = Number(d.amount || 0).toLocaleString("en-US");
      return `- ${d.ticker || "-"}: ${d.ccy || "USD"} ${amount}`;
    }),
  ];
  if (due.length > 12) lines.push(`...and ${due.length - 12} more`);
  return lines.join("\n");
}

async function handleUserPortfolioCron(env, clock) {
  const today = clock.date;
  const rows = await env.DB.prepare(
    "SELECT user_id,data FROM portfolio_snapshots ORDER BY updated_at DESC"
  ).all().catch(() => null);
  const snapshots = rows?.results || [];
  let sent = 0;

  for (const row of snapshots) {
    let snapshot = null;
    try {
      snapshot = JSON.parse(row.data || "{}");
    } catch (_) {
      continue;
    }

    const due = (snapshot.dca || []).map(normalizeDcaForCron).filter(d => isDcaDueAt(d, today, clock.time));
    if (!due.length) continue;

    const checks = await Promise.all(due.map(async d => {
      const scopedId = `${row.user_id}:${d.id || d.ticker || "dca"}`;
      const exists = await env.DB.prepare(
        "SELECT id FROM dca_log WHERE date = ? AND dca_id = ? AND status IN ('due','notified','executed')"
      ).bind(today, scopedId).first().catch(() => null);
      if (exists && hasDcaTransaction(snapshot, d, today)) return null;
      return { ...d, scopedId, repair: !!exists };
    }));
    const newDue = checks.filter(Boolean);
    if (!newDue.length) continue;

    let nextSnapshot = snapshot;
    for (const d of newDue) nextSnapshot = executeDcaInSnapshot(nextSnapshot, d, today);
    await env.DB.prepare(
      "UPDATE portfolio_snapshots SET data = ?, updated_at = ? WHERE user_id = ?"
    ).bind(JSON.stringify(nextSnapshot), Date.now(), row.user_id).run();

    let lineSent = false;
    const targets = await getLinkedLineTargets(env, row.user_id);
    try {
      if (targets.length) {
        await sendLinePush(env, formatDcaExecutedLineMessage(newDue), targets);
        lineSent = true;
        sent += targets.length;
      }
    } catch (e) {
      console.error("LINE user DCA push failed:", e.stack || e);
    }

    const createdAt = Date.now();
    const stmts = newDue.map(d => env.DB.prepare(
      "INSERT INTO dca_log(id,dca_id,date,ticker,amount,status,created_at) VALUES (?,?,?,?,?,?,?)"
    ).bind(
      `log-${createdAt}-${Math.random().toString(36).slice(2, 7)}`,
      d.scopedId,
      today,
      d.ticker,
      d.amount,
      "executed",
      createdAt
    ));
    if (stmts.length > 0) await env.DB.batch(stmts);
  }

  return sent;
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
  const linkedTargets = actor?.user ? await getLinkedLineTargets(env, actor.user.id) : [];
  const results = await sendLinePush(env, text, body.to || linkedTargets);
  return json({ ok: true, sent: results.length, results });
}

async function handleLineLinkCode(req, env) {
  if (!env.DB) return error("D1 database not bound", 500);
  const user = await getSessionUser(req, env);
  if (!user) return error("Unauthorized", 401);

  const now = Date.now();
  await env.DB.prepare("DELETE FROM line_link_codes WHERE user_id = ? OR expires_at <= ?")
    .bind(user.id, now)
    .run();

  let code = randomCode();
  for (let i = 0; i < 4; i++) {
    const exists = await env.DB.prepare("SELECT code FROM line_link_codes WHERE code = ?")
      .bind(code)
      .first();
    if (!exists) break;
    code = randomCode();
  }

  const expiresAt = now + 30 * 60 * 1000;
  await env.DB.prepare(
    `INSERT INTO line_link_codes(code,user_id,email,name,expires_at,created_at)
     VALUES(?,?,?,?,?,?)`
  ).bind(code, user.id, user.email || "", user.name || "", expiresAt, now).run();

  return json({ code, expiresAt, command: `ผูก ${code}` });
}

const BITGET_PRODUCT_TYPES = {
  "USDT-FUTURES": "usdt-futures",
  "USDC-FUTURES": "usdc-futures",
  "COIN-FUTURES": "coin-futures",
  "usdt-futures": "usdt-futures",
  "usdc-futures": "usdc-futures",
  "coin-futures": "coin-futures",
};

const BITGET_GRANULARITIES = new Set([
  "1m", "3m", "5m", "15m", "30m", "1H", "4H", "6H", "12H", "1D", "3D", "1W", "1M",
]);

function clampNumber(value, fallback, min, max) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

function normalizeBitgetSymbol(value) {
  const symbol = String(value || "BTCUSDT").trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (!symbol || symbol.length > 24) throw new Error("Invalid Bitget symbol");
  return symbol;
}

function normalizeBitgetProductType(value) {
  return BITGET_PRODUCT_TYPES[value] || BITGET_PRODUCT_TYPES[String(value || "").toUpperCase()] || "usdt-futures";
}

function normalizeBitgetGranularity(value) {
  const g = String(value || "1H").trim();
  if (!BITGET_GRANULARITIES.has(g)) throw new Error("Unsupported Bitget granularity");
  return g;
}

function normalizeBitgetCandles(rows) {
  return (Array.isArray(rows) ? rows : [])
    .map(row => ({
      time: Number(row[0]),
      open: Number(row[1]),
      high: Number(row[2]),
      low: Number(row[3]),
      close: Number(row[4]),
      baseVolume: Number(row[5] || 0),
      quoteVolume: Number(row[6] || 0),
    }))
    .filter(c => Number.isFinite(c.time) && Number.isFinite(c.close) && c.close > 0)
    .sort((a, b) => a.time - b.time);
}

async function fetchBitgetCandles(params) {
  const symbol = normalizeBitgetSymbol(params.symbol);
  const productType = normalizeBitgetProductType(params.productType);
  const granularity = normalizeBitgetGranularity(params.granularity);
  const limit = Math.round(clampNumber(params.limit, 200, 50, 1000));

  const endpoint = new URL("https://api.bitget.com/api/v2/mix/market/candles");
  endpoint.searchParams.set("symbol", symbol);
  endpoint.searchParams.set("productType", productType);
  endpoint.searchParams.set("granularity", granularity);
  endpoint.searchParams.set("limit", String(limit));

  const cache = caches.default;
  const cacheKey = new Request(endpoint.toString(), { method: "GET" });
  const cached = await cache.match(cacheKey);
  if (cached) {
    const payload = await cached.json();
    return { ...payload, cached: true };
  }

  const response = await fetch(endpoint, { headers: { "Accept": "application/json" } });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.code !== "00000") {
    throw new Error(data.msg || `Bitget candles failed (${response.status})`);
  }

  const payload = {
    ok: true,
    symbol,
    productType,
    granularity,
    limit,
    source: endpoint.toString(),
    candles: normalizeBitgetCandles(data.data),
    requestTime: data.requestTime || Date.now(),
    cached: false,
  };

  await cache.put(cacheKey, json(payload).clone());
  return payload;
}

function ema(values, period) {
  const out = new Array(values.length).fill(null);
  if (!values.length) return out;
  const k = 2 / (period + 1);
  let prev = values[0];
  out[0] = prev;
  for (let i = 1; i < values.length; i++) {
    prev = values[i] * k + prev * (1 - k);
    out[i] = prev;
  }
  return out;
}

function maxDrawdownPct(equityCurve) {
  let peak = equityCurve[0]?.equity || 0;
  let maxDd = 0;
  for (const point of equityCurve) {
    peak = Math.max(peak, point.equity);
    if (peak > 0) maxDd = Math.max(maxDd, ((peak - point.equity) / peak) * 100);
  }
  return maxDd;
}

function runBacktestEngine(input, candles) {
  if (!candles || candles.length < 30) throw new Error("Not enough candles for backtest");

  const strategy = String(input.strategy || "trend-dca");
  const initialCapital = clampNumber(input.initialCapital, 1000, 50, 1000000);
  const orderSize = clampNumber(input.orderSize, 25, 1, initialCapital);
  const maxLossPct = clampNumber(input.maxLossPct, 8, 1, 80);
  const feeRate = clampNumber(input.feeRate, 0.0006, 0, 0.01);
  const closes = candles.map(c => c.close);
  const ema9 = ema(closes, 9);
  const ema20 = ema(closes, 20);
  const ema21 = ema(closes, 21);
  const ema50 = ema(closes, 50);

  let cash = initialCapital;
  let qty = 0;
  let positionCost = 0;
  let halted = false;
  const trades = [];
  const equityCurve = [];

  function equityAt(price) {
    return cash + qty * price;
  }

  function buy(i, price, reason) {
    if (halted || cash < 1) return;
    const quote = Math.min(orderSize, cash);
    const fee = quote * feeRate;
    const bought = (quote - fee) / price;
    cash -= quote;
    qty += bought;
    positionCost += quote;
    trades.push({ side: "BUY", time: candles[i].time, price, quote, qty: bought, fee, reason });
  }

  function sellAll(i, price, reason) {
    if (qty <= 0) return;
    const soldQty = qty;
    const gross = soldQty * price;
    const fee = gross * feeRate;
    const pnl = gross - fee - positionCost;
    cash += gross - fee;
    qty = 0;
    positionCost = 0;
    trades.push({ side: "SELL", time: candles[i].time, price, quote: gross, qty: soldQty, fee, pnl, reason });
  }

  for (let i = 1; i < candles.length; i++) {
    const price = candles[i].close;
    const currentEquity = equityAt(price);
    const lossPct = ((initialCapital - currentEquity) / initialCapital) * 100;
    if (!halted && lossPct >= maxLossPct) {
      sellAll(i, price, "risk guard");
      halted = true;
    }

    if (!halted) {
      if (strategy === "ema-cross") {
        const crossedUp = ema9[i - 1] <= ema21[i - 1] && ema9[i] > ema21[i];
        const crossedDown = ema9[i - 1] >= ema21[i - 1] && ema9[i] < ema21[i];
        if (crossedUp && qty <= 0) buy(i, price, "EMA9 crossed above EMA21");
        if (crossedDown && qty > 0) sellAll(i, price, "EMA9 crossed below EMA21");
      } else if (strategy === "grid-rebalance") {
        const lastTrade = trades[trades.length - 1];
        const lastPrice = lastTrade?.price || candles[0].close;
        if (qty <= 0 || price <= lastPrice * 0.985) buy(i, price, "grid buy zone");
        if (qty > 0 && price >= lastPrice * 1.02) sellAll(i, price, "grid take profit");
      } else {
        const trendOk = ema20[i] > ema50[i] && price > ema50[i];
        if (trendOk && i % 12 === 0) buy(i, price, "trend DCA");
        if (!trendOk && qty > 0 && price < ema50[i]) sellAll(i, price, "trend broke EMA50");
      }
    }

    equityCurve.push({ time: candles[i].time, equity: equityAt(price), price });
  }

  const last = candles[candles.length - 1];
  const finalEquity = equityAt(last.close);
  const closedSells = trades.filter(t => t.side === "SELL");
  const wins = closedSells.filter(t => Number(t.pnl || 0) > 0).length;
  const sampleEvery = Math.max(1, Math.ceil(equityCurve.length / 180));

  return {
    ok: true,
    strategy,
    candles: candles.length,
    startedAt: new Date(candles[0].time).toISOString(),
    endedAt: new Date(last.time).toISOString(),
    metrics: {
      initialCapital,
      finalEquity,
      totalReturnPct: ((finalEquity - initialCapital) / initialCapital) * 100,
      maxDrawdownPct: maxDrawdownPct(equityCurve),
      winRatePct: closedSells.length ? (wins / closedSells.length) * 100 : 0,
      tradeCount: trades.length,
      buyCount: trades.filter(t => t.side === "BUY").length,
      sellCount: closedSells.length,
      lastPrice: last.close,
      openPositionQty: qty,
      haltedByRisk: halted,
      feeRate,
    },
    trades: trades.slice(-30),
    equityCurve: equityCurve.filter((_, i) => i % sampleEvery === 0),
  };
}

async function handleBitgetCandles(url) {
  try {
    const payload = await fetchBitgetCandles({
      symbol: url.searchParams.get("symbol"),
      productType: url.searchParams.get("productType"),
      granularity: url.searchParams.get("granularity"),
      limit: url.searchParams.get("limit"),
    });
    return json(payload);
  } catch (e) {
    return error(e.message || "Bitget candles failed", 502);
  }
}

async function handleBitgetBacktest(req) {
  try {
    const body = await req.json().catch(() => ({}));
    const market = await fetchBitgetCandles(body);
    const result = runBacktestEngine(body, market.candles);
    return json({
      ...result,
      symbol: market.symbol,
      productType: market.productType,
      granularity: market.granularity,
      candlesData: market.candles,
      cached: market.cached,
    });
  } catch (e) {
    return error(e.message || "Backtest failed", 502);
  }
}

async function handleTradfiCandles(url, env) {
  try {
    const payload = await fetchTradfiCandles({
      symbol: url.searchParams.get("symbol"),
      granularity: url.searchParams.get("granularity"),
      limit: url.searchParams.get("limit"),
    }, env);
    return json(payload);
  } catch (e) {
    return error(e.message || "TradFi candles failed", 502);
  }
}

// Router
async function handleRequest(req, env, ctx) {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS_HEADERS });
  const url = new URL(req.url);
  const path = url.pathname;

  if (path === "/api/prices/crypto") return handleCrypto(url, env);
  if (path === "/api/prices/stocks") return handleStocks(url, env);
  if (path === "/api/prices/fx") return handleFX(url, env);
  if (path === "/api/bitget/candles" && req.method === "GET") return handleBitgetCandles(url);
  if (path === "/api/bitget/backtest" && req.method === "POST") return handleBitgetBacktest(req);
  if (path === "/api/tradfi/candles" && req.method === "GET") return handleTradfiCandles(url, env);
  if (path === "/api/health") return json({ ok: true, version: "2.0", time: new Date().toISOString() });
  if (path === "/api/line/status" && req.method === "GET") return json(await lineStatus(env));
  if (path === "/api/line/webhook" && req.method === "POST") return handleLineWebhook(req, env);

  if (path === "/api/auth/config" && req.method === "GET") {
    return json({ googleClientId: env.GOOGLE_CLIENT_ID || "" });
  }
  if (path === "/api/auth/google" && req.method === "POST") return handleGoogleAuth(req, env);
  if (path === "/api/auth/me" && req.method === "GET") return handleMe(req, env);
  if (path === "/api/auth/logout" && req.method === "POST") return handleLogout(req, env);
  if (path === "/api/line/link-code" && req.method === "POST") return handleLineLinkCode(req, env);
  if (path === "/api/ai/chat" && req.method === "POST") {
    if (!env.DB) return error("D1 database not bound", 500);
    const user = await getSessionUser(req, env);
    if (!user) return error("Unauthorized", 401);
    return handleAiChat(req, env, user);
  }
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
  const now = bangkokNow();
  const today = now.date;
  const userLineSent = await handleUserPortfolioCron(env, now);
  const due = await env.DB.prepare(
    "SELECT * FROM dca_schedules WHERE paused = 0 AND nextDate <= ?"
  ).bind(today).all();
  const existing = await env.DB.prepare(
    "SELECT dca_id FROM dca_log WHERE date = ? AND status IN ('due','notified')"
  ).bind(today).all();
  const alreadyLogged = new Set((existing.results || []).map(r => r.dca_id));
  const newDue = (due.results || [])
    .map(normalizeDcaForCron)
    .filter(d => !alreadyLogged.has(d.id) && isDcaDueAt(d, today, now.time));

  let lineSent = false;
  const line = await lineStatus(env);
  if (newDue.length > 0 && line.enabled) {
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
  console.log(`[cron ${today}] Logged ${stmts.length} legacy due DCA(s); lineSent=${lineSent}; userLineSent=${userLineSent}`);
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
