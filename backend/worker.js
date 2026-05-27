// SiamFolio Backend — Cloudflare Worker
//
// Single-user personal portfolio API:
//   GET  /api/prices/crypto?symbols=BTC,ETH         — CoinGecko proxy
//   GET  /api/prices/stocks?symbols=NVDA,AAPL.BK    — Yahoo proxy (CORS-fixed)
//   GET  /api/prices/fx?from=USD&to=THB             — Frankfurter proxy
//   GET  /api/portfolio                              — Full snapshot from D1
//   PUT  /api/portfolio                              — Replace snapshot
//   POST /api/holdings                               — Upsert holding
//   DELETE /api/holdings/:id
//   POST /api/transactions                           — Insert tx
//   DELETE /api/transactions/:id
//   POST /api/dca                                    — Upsert DCA
//   DELETE /api/dca/:id
//   GET  /api/dca/due                                — DCAs flagged 'due' by cron
//
// Auth: shared secret in X-Api-Key header. Set API_KEY env var on the Worker.
// CORS: allows any origin (single-user, low risk).
// Cron: daily 02:00 UTC = 09:00 ICT — flags due DCAs.

const COINGECKO_IDS = {
  BTC: "bitcoin", ETH: "ethereum", SOL: "solana", XAUT: "tether-gold",
  ADA: "cardano", XRP: "ripple", DOGE: "dogecoin", MATIC: "polygon-pos",
  BNB: "binancecoin", AVAX: "avalanche-2", LINK: "chainlink", DOT: "polkadot",
};

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, X-Api-Key",
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

function requireAuth(req, env) {
  const key = req.headers.get("X-Api-Key");
  if (!env.API_KEY) return null; // not configured — open mode
  if (!key || key !== env.API_KEY) return error("Unauthorized", 401);
  return null;
}

// ─────── Cache helpers (Workers KV optional, falls back to in-memory) ───────
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

// ─────── Price proxies ───────
async function handleCrypto(url, env) {
  const symbols = (url.searchParams.get("symbols") || "").split(",").filter(Boolean);
  const ids = symbols.map(s => COINGECKO_IDS[s.toUpperCase()]).filter(Boolean);
  if (ids.length === 0) return json({});
  const cacheKey = `cg:${ids.sort().join(",")}`;
  const cached = await cacheGet(env, cacheKey);
  if (cached) return json(cached);
  const r = await fetch(
    `https://api.coingecko.com/api/v3/simple/price?ids=${ids.join(",")}&vs_currencies=usd&include_24hr_change=true`
  );
  if (!r.ok) return error("CoinGecko upstream error", 502);
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

// ─────── D1 portfolio CRUD ───────
async function getPortfolio(env) {
  const [holdings, transactions, dca, earn, dcaLog] = await Promise.all([
    env.DB.prepare("SELECT * FROM holdings ORDER BY rowid").all(),
    env.DB.prepare("SELECT * FROM transactions ORDER BY date DESC").all(),
    env.DB.prepare("SELECT * FROM dca_schedules ORDER BY nextDate").all(),
    env.DB.prepare("SELECT * FROM earn_positions ORDER BY rowid").all(),
    env.DB.prepare("SELECT * FROM dca_log WHERE status IN ('due','notified') ORDER BY created_at DESC LIMIT 20").all(),
  ]);
  // Decode spark JSON
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
  // Wipe + insert. D1 batch handles transaction.
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

// ─────── Router ───────
async function handleRequest(req, env, ctx) {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS_HEADERS });
  const url = new URL(req.url);
  const path = url.pathname;

  // Public price endpoints (no auth required — they're proxies)
  if (path === "/api/prices/crypto") return handleCrypto(url, env);
  if (path === "/api/prices/stocks") return handleStocks(url, env);
  if (path === "/api/prices/fx") return handleFX(url, env);
  if (path === "/api/health") return json({ ok: true, version: "1.0", time: new Date().toISOString() });

  // Authenticated endpoints
  const authErr = requireAuth(req, env);
  if (authErr) return authErr;

  if (!env.DB) return error("D1 database not bound", 500);

  if (path === "/api/portfolio" && req.method === "GET") return getPortfolio(env);
  if (path === "/api/portfolio" && req.method === "PUT") return putPortfolio(req, env);
  if (path === "/api/dca/due" && req.method === "GET") return getDueDCAs(env);

  return error("Not found: " + path, 404);
}

// ─────── Cron handler ───────
// Runs daily. Scans DCA schedules; for each due/overdue + not paused, log a 'due' entry.
// Does NOT auto-execute trades (no broker integration) — just creates reminder records
// that the frontend reads on next visit.
async function handleCron(env) {
  if (!env.DB) return;
  const today = new Date().toISOString().slice(0, 10);
  const due = await env.DB.prepare(
    "SELECT * FROM dca_schedules WHERE paused = 0 AND nextDate <= ?"
  ).bind(today).all();
  const stmts = [];
  for (const d of (due.results || [])) {
    const logId = `log-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    stmts.push(env.DB.prepare(
      "INSERT INTO dca_log(id,dca_id,date,ticker,amount,status,created_at) VALUES (?,?,?,?,?,?,?)"
    ).bind(logId, d.id, today, d.ticker, d.amount, "due", Date.now()));
  }
  if (stmts.length > 0) await env.DB.batch(stmts);
  console.log(`[cron ${today}] Logged ${stmts.length} due DCA(s)`);
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
