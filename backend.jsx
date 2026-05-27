// SiamFolio Backend Client
// Offline-first: localStorage stays the source of truth.
// Backend is an optional sync target + reliable price proxy.
//
// Config lives in localStorage key 'siamfolio.backend' as { url, key }.

const BACKEND_KEY = "siamfolio.backend";

function getBackendConfig() {
  try {
    const raw = localStorage.getItem(BACKEND_KEY);
    if (!raw) return null;
    const cfg = JSON.parse(raw);
    if (!cfg.url || !cfg.key) return null;
    return cfg;
  } catch (_) { return null; }
}

function setBackendConfig(cfg) {
  if (cfg) localStorage.setItem(BACKEND_KEY, JSON.stringify(cfg));
  else localStorage.removeItem(BACKEND_KEY);
  // Force re-render
  window.dispatchEvent(new Event("siamfolio.backend.changed"));
}

function isBackendConfigured() {
  return !!getBackendConfig();
}

// ─────── HTTP helpers ───────
async function backendFetch(path, opts = {}) {
  const cfg = getBackendConfig();
  if (!cfg) throw new Error("Backend not configured");
  const url = cfg.url.replace(/\/$/, "") + path;
  const headers = { "X-Api-Key": cfg.key, ...(opts.headers || {}) };
  if (opts.body && !headers["Content-Type"]) headers["Content-Type"] = "application/json";
  const r = await fetch(url, { ...opts, headers });
  if (!r.ok) throw new Error(`Backend ${r.status}: ${await r.text().catch(() => "")}`);
  return r.json();
}

// ─────── Health check (no auth needed) ───────
async function pingBackend(url) {
  try {
    const u = url.replace(/\/$/, "") + "/api/health";
    const r = await fetch(u);
    if (!r.ok) return { ok: false, status: r.status };
    const data = await r.json();
    return { ok: true, ...data };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

async function testBackendAuth(url, key) {
  try {
    const u = url.replace(/\/$/, "") + "/api/portfolio";
    const r = await fetch(u, { headers: { "X-Api-Key": key } });
    return r.ok || r.status === 200;
  } catch (_) {
    return false;
  }
}

// ─────── Portfolio sync ───────
async function pullPortfolio() {
  return backendFetch("/api/portfolio");
}

async function pushPortfolio() {
  const s = window.getStore();
  const body = {
    holdings: s.holdings,
    transactions: s.transactions,
    dca: s.dca,
    earn: s.earn,
  };
  return backendFetch("/api/portfolio", { method: "PUT", body: JSON.stringify(body) });
}

async function fetchDueDCAs() {
  return backendFetch("/api/dca/due");
}

// ─────── Prices via backend (no CORS issues) ───────
async function backendPrices(kind, symbols) {
  const cfg = getBackendConfig();
  if (!cfg || !symbols || symbols.length === 0) return {};
  try {
    const url = cfg.url.replace(/\/$/, "") + `/api/prices/${kind}?symbols=${symbols.join(",")}`;
    const r = await fetch(url);
    if (!r.ok) return {};
    return await r.json();
  } catch (e) {
    console.warn(`Backend prices/${kind} failed:`, e.message);
    return {};
  }
}

async function backendFX(from = "USD", to = "THB") {
  const cfg = getBackendConfig();
  if (!cfg) return null;
  try {
    const url = cfg.url.replace(/\/$/, "") + `/api/prices/fx?from=${from}&to=${to}`;
    const r = await fetch(url);
    if (!r.ok) return null;
    const data = await r.json();
    return data?.rate || null;
  } catch (_) {
    return null;
  }
}

// ─────── Debounced auto-sync ───────
let _syncTimer = null;
let _lastSyncAt = 0;
function scheduleSync() {
  if (!isBackendConfigured()) return;
  clearTimeout(_syncTimer);
  _syncTimer = setTimeout(async () => {
    try {
      await pushPortfolio();
      _lastSyncAt = Date.now();
      window.dispatchEvent(new CustomEvent("siamfolio.sync", { detail: { ok: true, at: _lastSyncAt } }));
    } catch (e) {
      window.dispatchEvent(new CustomEvent("siamfolio.sync", { detail: { ok: false, error: e.message } }));
    }
  }, 1500);
}

function getLastSyncAt() { return _lastSyncAt; }

// React hook — true if backend is currently configured (re-renders on changes)
function useBackendStatus() {
  const [cfg, setCfg] = React.useState(getBackendConfig());
  React.useEffect(() => {
    const fn = () => setCfg(getBackendConfig());
    window.addEventListener("siamfolio.backend.changed", fn);
    window.addEventListener("storage", fn);
    return () => {
      window.removeEventListener("siamfolio.backend.changed", fn);
      window.removeEventListener("storage", fn);
    };
  }, []);
  return cfg;
}

Object.assign(window, {
  getBackendConfig, setBackendConfig, isBackendConfigured,
  pingBackend, testBackendAuth,
  pullPortfolio, pushPortfolio, fetchDueDCAs,
  backendPrices, backendFX,
  scheduleSync, getLastSyncAt, useBackendStatus,
});
