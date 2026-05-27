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

const CORS_PROXY = "https://corsproxy.io/?url=";

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

// ─────── US Stocks (Yahoo via CORS proxy) ───────
async function fetchUSStockPrices(tickers) {
  if (!tickers || tickers.length === 0) return {};
  const cacheKey = "yf:" + tickers.sort().join(",");
  const c = getCached(cacheKey, 60 * 1000);
  if (c) return c;
  try {
    const yahoo = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${tickers.join(",")}`;
    const url = CORS_PROXY + encodeURIComponent(yahoo);
    const res = await fetch(url);
    if (!res.ok) throw new Error("Yahoo " + res.status);
    const data = await res.json();
    const out = {};
    for (const q of data?.quoteResponse?.result || []) {
      out[q.symbol] = {
        price: q.regularMarketPrice,
        chg1d: q.regularMarketChangePercent ?? 0,
        source: "yahoo",
      };
    }
    setCached(cacheKey, out);
    return out;
  } catch (e) {
    console.warn("Yahoo fetch failed:", e.message);
    return {};
  }
}

// ─────── Thai Stocks (Yahoo with .BK suffix) ───────
async function fetchThaiStockPrices(tickers) {
  if (!tickers || tickers.length === 0) return {};
  const yfSyms = tickers.map(t => t + ".BK");
  const result = await fetchUSStockPrices(yfSyms); // same Yahoo endpoint
  // Strip .BK suffix in output keys
  const out = {};
  for (const t of tickers) {
    const r = result[t + ".BK"];
    if (r) out[t] = r;
  }
  return out;
}

// ─────── Orchestrator: fetch all prices for a portfolio ───────
async function refreshAllPrices(holdings) {
  const byClass = { us: [], th: [], crypto: [], gold: [] };
  for (const h of holdings) byClass[h.classKey]?.push(h.ticker);

  const results = await Promise.allSettled([
    fetchCryptoPrices([...byClass.crypto, ...byClass.gold]),
    fetchUSStockPrices(byClass.us),
    fetchThaiStockPrices(byClass.th),
    fetchFXRate(),
  ]);

  const [crypto, us, th, fx] = results.map(r => r.status === "fulfilled" ? r.value : null);

  // Combine — newer source overrides older
  const merged = { ...crypto, ...us, ...th };
  const priceMap = {};
  const chgMap = {};
  for (const [t, info] of Object.entries(merged || {})) {
    if (info && typeof info.price === "number") {
      priceMap[t] = info.price;
      chgMap[t] = info.chg1d;
    }
  }
  return { priceMap, chgMap, fx, sources: { crypto: !!crypto, us: !!us, th: !!th, fx: !!fx } };
}

// ─────── Auto-refresh hook ───────
// Uses a ref to track holdings to avoid re-creating refresh fn on every store update
// (which would otherwise loop because updateStore changes holdings -> changes ref -> refires effect)
function useLivePrices(holdings, intervalMs = 60000) {
  const holdingsRef = React.useRef(holdings);
  holdingsRef.current = holdings;

  const [status, setStatus] = React.useState({ loading: false, lastUpdate: 0, error: null, sources: {} });

  const refresh = React.useCallback(async () => {
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
    refresh();
    const id = setInterval(refresh, intervalMs);
    return () => clearInterval(id);
  }, [refresh, intervalMs]);

  // Re-fetch when holdings count changes (e.g. new holding added)
  const lenRef = React.useRef(holdings.length);
  React.useEffect(() => {
    if (holdings.length !== lenRef.current) {
      lenRef.current = holdings.length;
      refresh();
    }
  }, [holdings.length, refresh]);

  return { ...status, refresh };
}

Object.assign(window, {
  fetchCryptoPrices, fetchFXRate, fetchUSStockPrices, fetchThaiStockPrices,
  refreshAllPrices, useLivePrices,
});
