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
  if (t.startsWith("ผูก ") || t.startsWith("link ")) return "link";
  if (["help", "คำสั่ง", "ช่วยเหลือ"].includes(t)) return "help";
  if (t.includes("ลบ") || t.includes("ขาดทุน") || t.includes("แดง")) return "loss";
  if (t.includes("บวก") || t.includes("กำไร") || t.includes("เขียว")) return "gain";
  if (t.includes("พอร์ต") || t.includes("portfolio") || t.includes("สรุป") || t.includes("มูลค่า")) return "summary";
  return null;
}

function extractLineLinkCode(text) {
  const t = String(text || "").trim();
  const m = t.match(/^(?:ผูก|link)\s+([A-Za-z0-9]{4,12})/i);
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
  const snapshot = await getLatestPortfolioData(env, userId);
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

async function handleUserPortfolioCron(env, today) {
  const rows = await env.DB.prepare(
    "SELECT user_id,data FROM portfolio_snapshots ORDER BY updated_at DESC"
  ).all().catch(() => null);
  const snapshots = rows?.results || [];
  let sent = 0;

  for (const row of snapshots) {
    const targets = await getLinkedLineTargets(env, row.user_id);
    if (!targets.length) continue;

    let snapshot = null;
    try {
      snapshot = JSON.parse(row.data || "{}");
    } catch (_) {
      continue;
    }

    const due = (snapshot.dca || []).filter(d => !d.paused && d.nextDate && d.nextDate <= today);
    if (!due.length) continue;

    const checks = await Promise.all(due.map(async d => {
      const scopedId = `${row.user_id}:${d.id || d.ticker || "dca"}`;
      const exists = await env.DB.prepare(
        "SELECT id FROM dca_log WHERE date = ? AND dca_id = ? AND status IN ('due','notified')"
      ).bind(today, scopedId).first().catch(() => null);
      return exists ? null : { ...d, scopedId };
    }));
    const newDue = checks.filter(Boolean);
    if (!newDue.length) continue;

    let lineSent = false;
    try {
      await sendLinePush(env, formatDcaLineMessage(newDue), targets);
      lineSent = true;
      sent += targets.length;
    } catch (e) {
      console.error("LINE user DCA push failed:", e.stack || e);
    }

    const now = Date.now();
    const stmts = newDue.map(d => env.DB.prepare(
      "INSERT INTO dca_log(id,dca_id,date,ticker,amount,status,created_at) VALUES (?,?,?,?,?,?,?)"
    ).bind(
      `log-${now}-${Math.random().toString(36).slice(2, 7)}`,
      d.scopedId,
      today,
      d.ticker,
      d.amount,
      lineSent ? "notified" : "due",
      now
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

  const expiresAt = now + 10 * 60 * 1000;
  await env.DB.prepare(
    `INSERT INTO line_link_codes(code,user_id,email,name,expires_at,created_at)
     VALUES(?,?,?,?,?,?)`
  ).bind(code, user.id, user.email || "", user.name || "", expiresAt, now).run();

  return json({ code, expiresAt, command: `ผูก ${code}` });
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
  if (path === "/api/line/status" && req.method === "GET") return json(await lineStatus(env));
  if (path === "/api/line/webhook" && req.method === "POST") return handleLineWebhook(req, env);

  if (path === "/api/auth/config" && req.method === "GET") {
    return json({ googleClientId: env.GOOGLE_CLIENT_ID || "" });
  }
  if (path === "/api/auth/google" && req.method === "POST") return handleGoogleAuth(req, env);
  if (path === "/api/auth/me" && req.method === "GET") return handleMe(req, env);
  if (path === "/api/auth/logout" && req.method === "POST") return handleLogout(req, env);
  if (path === "/api/line/link-code" && req.method === "POST") return handleLineLinkCode(req, env);
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
  const userLineSent = await handleUserPortfolioCron(env, today);
  const due = await env.DB.prepare(
    "SELECT * FROM dca_schedules WHERE paused = 0 AND nextDate <= ?"
  ).bind(today).all();
  const existing = await env.DB.prepare(
    "SELECT dca_id FROM dca_log WHERE date = ? AND status IN ('due','notified')"
  ).bind(today).all();
  const alreadyLogged = new Set((existing.results || []).map(r => r.dca_id));
  const newDue = (due.results || []).filter(d => !alreadyLogged.has(d.id));

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
