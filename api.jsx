// SiamFolio API — Real-time price feeds
// Free, no-API-key sources only:
//   - CoinGecko (crypto + tether-gold)
//   - Frankfurter (FX rates)
//   - Yahoo Finance via corsproxy.io (US stocks; best-effort)
// Thai stocks have no free CORS-friendly source — manual entry only.

const COINGECKO_IDS = {
  BTC: "bitcoin",
  ETH: "ethereum",
  SOL: "solana",
  XAUT: "tether-gold",
  ADA: "cardano",
  XRP: "ripple",
  DOGE: "dogecoin",
  MATIC: "polygon-pos",
  BNB: "binancecoin",
  AVAX: "avalanche-2",
};

// CORS proxy fallback list. The free CORS-proxy landscape is unreliable
// (rate-limits per-IP, paid tiers, occasional 5xx). We try a few then fall back.
// Note: most users will hit at most a few requests/minute so per-IP limits
// usually don't apply in the browser.
const CORS_PROXIES = [
  (u) => `https://api.codetabs.com/v1/proxy/?quest=${encodeURIComponent(u)}`,
  (u) => `https://api.cors.lol/?url=${encodeURIComponent(u)}`,
  (u) => `https://corsproxy.io/?${encodeURIComponent(u)}`,
];

async function fetchWithCorsProxy(url) {
  // Try direct (some endpoints have CORS headers; cheap to try)
  try {
    const r = await fetch(url, { redirect: "follow" });
    if (r.ok) return r;
  } catch (_) { /* CORS or net error */ }
  // Try each proxy
  for (const make of CORS_PROXIES) {
    try {
      const r = await fetch(make(url), { redirect: "follow" });
      if (r.ok) return r;
    } catch (_) { /* try next */ }
  }
  throw new Error("All CORS proxies failed: " + url);
}

// Simple in-memory cache to avoid hammering APIs
const cache = new Map();
function getCached(key, ttlMs) {
  const c = cache.get(key);
  if (c && Date.now() - c.t < ttlMs) return c.v;
  return null;
}
function setCached(key, v) {
  cache.set(key, { v, t: Date.now() });
}

// ─────── Crypto (CoinGecko) ───────
async function fetchCryptoPrices(tickers) {
  if (!tickers || tickers.length === 0) return {};
  const ids = tickers.map(t => COINGECKO_IDS[t]).filter(Boolean);
  if (ids.length === 0) return {};
  const cacheKey = "cg:" + ids.sort().join(",");
  const c = getCached(cacheKey, 30000);
  if (c) return c;

  const url = `https://api.coingecko.com/api/v3/simple/price?ids=${ids.join(",")}&vs_currencies=usd&include_24hr_change=true`;
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error("CoinGecko " + res.status);
    const data = await res.json();
    const out = {};
    for (const [t, gid] of Object.entries(COINGECKO_IDS)) {
      if (data[gid]) {
        out[t] = {
          price: data[gid].usd,
          chg1d: data[gid].usd_24h_change ?? 0,
          source: "coingecko",
        };
      }
    }
    setCached(cacheKey, out);
    return out;
  } catch (e) {
    console.warn("CoinGecko fetch failed:", e.message);
    return {};
  }
}

// ─────── FX (Frankfurter) ───────
async function fetchFXRate() {
  const cacheKey = "fx:usd-thb";
  const c = getCached(cacheKey, 5 * 60 * 1000);
  if (c) return c;
  try {
    const res = await fetch("https://api.frankfurter.app/latest?from=USD&to=THB");
    if (!res.ok) throw new Error("Frankfurter " + res.status);
    const data = await res.json();
    const rate = data?.rates?.THB;
    if (typeof rate !== "number") throw new Error("No THB rate");
    setCached(cacheKey, rate);
    return rate;
  } catch (e) {
    console.warn("FX fetch failed:", e.message);
    return null;
  }
}

// ─────── Stocks (Yahoo Finance v8 chart endpoint) ───────
// Free, no key. Fetches each ticker separately (small N, runs in parallel).
async function fetchYahooQuote(symbol) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=2d`;
  try {
    const res = await fetchWithCorsProxy(url);
    const data = await res.json();
    const meta = data?.chart?.result?.[0]?.meta;
    if (!meta || typeof meta.regularMarketPrice !== "number") return null;
    const price = meta.regularMarketPrice;
    const prevClose = meta.chartPreviousClose || meta.previousClose || price;
    const chg1d = prevClose > 0 ? ((price - prevClose) / prevClose) * 100 : 0;
    return { price, chg1d, source: "yahoo" };
  } catch (e) {
    console.warn(`Yahoo ${symbol} failed:`, e.message);
    return null;
  }
}

async function fetchUSStockPrices(tickers) {
  if (!tickers || tickers.length === 0) return {};
  const cacheKey = "yf:" + tickers.sort().join(",");
  const c = getCached(cacheKey, 60 * 1000);
  if (c) return c;
  const results = await Promise.all(tickers.map(t => fetchYahooQuote(t)));
  const out = {};
  tickers.forEach((t, i) => { if (results[i]) out[t] = results[i]; });
  setCached(cacheKey, out);
  return out;
}

// ─────── Thai Stocks (Yahoo with .BK suffix) ───────
async function fetchThaiStockPrices(tickers) {
  if (!tickers || tickers.length === 0) return {};
  const results = await Promise.all(tickers.map(async t => {
    const q = await fetchYahooQuote(t + ".BK");
    return q ? { ticker: t, ...q } : null;
  }));
  const out = {};
  for (const r of results) if (r) out[r.ticker] = { price: r.price, chg1d: r.chg1d, source: r.source };
  return out;
}

// ─────── Orchestrator: fetch all prices for a portfolio ───────
// If backend is configured, route through the Worker (no CORS gambling).
// Otherwise hit the public APIs directly.
async function refreshAllPrices(holdings) {
  const byClass = { us: [], th: [], crypto: [], gold: [] };
  for (const h of holdings) byClass[h.classKey]?.push(h.ticker);

  const useBackend = typeof window.isBackendConfigured === "function" && window.isBackendConfigured();

  let crypto, us, th, fx;

  if (useBackend) {
    // Backend handles all sources server-side
    const cryptoSyms = [...byClass.crypto, ...byClass.gold];
    const stockSyms = [...byClass.us, ...byClass.th.map(t => t + ".BK")];
    const [cryptoRes, stockRes, fxRes] = await Promise.allSettled([
      cryptoSyms.length ? window.backendPrices("crypto", cryptoSyms) : Promise.resolve({}),
      stockSyms.length ? window.backendPrices("stocks", stockSyms) : Promise.resolve({}),
      window.backendFX("USD", "THB"),
    ]);
    crypto = cryptoRes.status === "fulfilled" ? cryptoRes.value : {};
    // Split US vs TH from stockRes — strip .BK suffix
    const stocks = stockRes.status === "fulfilled" ? stockRes.value : {};
    us = {};
    th = {};
    for (const [sym, info] of Object.entries(stocks)) {
      if (sym.endsWith(".BK")) th[sym.replace(".BK", "")] = info;
      else us[sym] = info;
    }
    fx = fxRes.status === "fulfilled" ? fxRes.value : null;
  } else {
    // Direct public APIs (Phase A behavior)
    const results = await Promise.allSettled([
      fetchCryptoPrices([...byClass.crypto, ...byClass.gold]),
      fetchUSStockPrices(byClass.us),
      fetchThaiStockPrices(byClass.th),
      fetchFXRate(),
    ]);
    [crypto, us, th, fx] = results.map(r => r.status === "fulfilled" ? r.value : null);
  }

  // Combine
  const merged = { ...(crypto || {}), ...(us || {}), ...(th || {}) };
  const priceMap = {};
  const chgMap = {};
  for (const [t, info] of Object.entries(merged)) {
    if (info && typeof info.price === "number") {
      priceMap[t] = info.price;
      chgMap[t] = info.chg1d;
    }
  }
  return {
    priceMap, chgMap, fx,
    sources: {
      crypto: !!crypto && Object.keys(crypto).length > 0,
      us: !!us && Object.keys(us).length > 0,
      th: !!th && Object.keys(th).length > 0,
      fx: !!fx,
      backend: useBackend,
    },
  };
}

// ─────── Auto-refresh hook ───────
// Uses a ref to track holdings to avoid re-creating refresh fn on every store update
// (which would otherwise loop because updateStore changes holdings -> changes ref -> refires effect)
function useLivePrices(holdings, intervalMs = 60000) {
  const holdingsRef = React.useRef(holdings);
  holdingsRef.current = holdings;

  const [status, setStatus] = React.useState({ loading: false, lastUpdate: 0, error: null, sources: {} });
  const livePrices = window.getStore?.().settings?.livePrices === true;

  const refresh = React.useCallback(async () => {
    if (window.getStore?.().settings?.livePrices !== true) {
      setStatus({ loading: false, lastUpdate: 0, error: null, sources: { manual: true } });
      return;
    }
    const h = holdingsRef.current;
    if (!h || h.length === 0) return;
    setStatus(s => ({ ...s, loading: true, error: null }));
    try {
      const { priceMap, chgMap, fx, sources } = await refreshAllPrices(h);
      if (Object.keys(priceMap).length > 0) {
        window.updateStore(s => ({
          ...s,
          holdings: s.holdings.map(hh => {
            const newPrice = priceMap[hh.ticker];
            if (newPrice == null) return hh;
            const newChg = chgMap[hh.ticker];
            const spark = [...(hh.spark || []).slice(-7), newPrice];
            return {
              ...hh,
              price: newPrice,
              chg1d: typeof newChg === "number" ? newChg : hh.chg1d,
              spark,
            };
          }),
          pricesUpdatedAt: Date.now(),
        }));
      }
      if (fx) window.setFX(fx);
      setStatus({ loading: false, lastUpdate: Date.now(), error: null, sources });
    } catch (e) {
      setStatus(s => ({ ...s, loading: false, error: e.message }));
    }
  }, []); // stable identity

  // Initial fetch + interval
  React.useEffect(() => {
    if (!livePrices) {
      setStatus({ loading: false, lastUpdate: 0, error: null, sources: { manual: true } });
      return;
    }
    refresh();
    const id = setInterval(refresh, intervalMs);
    return () => clearInterval(id);
  }, [refresh, intervalMs, livePrices]);

  // Re-fetch when holdings count changes (e.g. new holding added)
  const lenRef = React.useRef(holdings.length);
  React.useEffect(() => {
    if (!livePrices) return;
    if (holdings.length !== lenRef.current) {
      lenRef.current = holdings.length;
      refresh();
    }
  }, [holdings.length, refresh, livePrices]);

  return { ...status, refresh };
}

Object.assign(window, {
  fetchCryptoPrices, fetchFXRate, fetchUSStockPrices, fetchThaiStockPrices,
  refreshAllPrices, useLivePrices,
});
