// SiamFolio Store — localStorage-backed reactive store
// Replaces window.MOCK with persistent, mutable state.
//
// Usage:
//   const store = useStore();               // reactive read
//   updateStore(s => ({ ...s, fx: 36.0 })); // anywhere
//   const { holdings, addHolding } = useHoldings();

const STORE_KEY = "siamfolio.v1";
const STORE_VERSION = 1;

// ─────── ID generator ───────
function makeId(prefix = "id") {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

// ─────── Date helpers ───────
function todayISO() {
  return new Date().toISOString().slice(0, 10);
}
function daysFromNow(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}
function daysBetween(aISO, bISO) {
  const a = new Date(aISO + "T00:00:00Z").getTime();
  const b = new Date(bISO + "T00:00:00Z").getTime();
  return Math.round((b - a) / 86400000);
}

// Compute next DCA execution date based on freq + last execution
function computeNextDCA(dca, fromISO = todayISO()) {
  const freq = dca.freq;
  const days = { daily: 1, weekly: 7, biweekly: 14, monthly: 30, สัปดาห์: 7, เดือน: 30 }[freq] || 7;
  // If next is already set and in the future, keep it
  if (dca.nextDate && dca.nextDate >= fromISO) return dca.nextDate;
  return daysFromNow(days);
}

// ─────── Seed (first-run) ───────
function buildSeed() {
  const M = window.MOCK;
  const hold = M.HOLDINGS_MIXED.map(h => ({ ...h, id: makeId("h") }));
  const dca = M.DCA_SCHEDULES.map((d, i) => {
    // Parse "อีก N วัน" into days
    const m = String(d.nextIn).match(/(\d+)/);
    const inDays = m ? parseInt(m[1], 10) : 7;
    return {
      id: makeId("dca"),
      ticker: d.ticker,
      classKey: d.classKey,
      ccy: d.ccy,
      amount: d.amount,
      freq: d.freq === "สัปดาห์" ? "weekly" : d.freq === "เดือน" ? "monthly" : "weekly",
      startDate: daysFromNow(-(d.executed * (d.freq === "เดือน" ? 30 : 7))),
      nextDate: daysFromNow(inDays),
      executedCount: d.executed,
      totalSpent: d.total,
      paused: false,
    };
  });
  const earn = M.EARN_POSITIONS.map(e => ({ ...e, id: makeId("e") }));
  const tx = M.TX_NVDA.map(t => ({ ...t, id: makeId("tx"), ticker: "NVDA", ccy: "USD" }));
  return {
    version: STORE_VERSION,
    holdings: hold,
    transactions: tx,
    dca,
    earn,
    rebalanceAlerts: M.REBALANCE_ALERTS.map(a => ({ ...a, id: makeId("a") })),
    benchmarks: M.BENCHMARKS,
    fx: M.FX,
    fxUpdatedAt: 0,
    pricesUpdatedAt: 0,
    settings: {
      ccy: "THB",
      theme: "light",
      density: "comfortable",
      accent: "mint",
      notifyDCA: false, // user must opt-in
      seeded: true,
    },
  };
}

// ─────── Load/Save ───────
function loadStore() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.version === STORE_VERSION) return parsed;
    }
  } catch (e) {
    console.warn("Store load failed, seeding fresh:", e);
  }
  const seed = buildSeed();
  saveStore(seed);
  return seed;
}

function saveStore(s) {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(s));
  } catch (e) {
    console.error("Store save failed:", e);
  }
}

// ─────── Pub/sub ───────
const _state = { current: null, listeners: new Set() };

function _ensureLoaded() {
  if (!_state.current) _state.current = loadStore();
  return _state.current;
}

function getStore() {
  return _ensureLoaded();
}

function updateStore(updater) {
  _ensureLoaded();
  const next = typeof updater === "function" ? updater(_state.current) : updater;
  _state.current = next;
  saveStore(next);
  _state.listeners.forEach(fn => {
    try { fn(next); } catch (e) { console.error(e); }
  });
  // Auto-sync to backend if configured (debounced inside)
  if (typeof window.scheduleSync === "function") {
    try { window.scheduleSync(); } catch (_) {}
  }
}

// React hook — subscribes to all changes
function useStore() {
  const [s, setS] = React.useState(() => _ensureLoaded());
  React.useEffect(() => {
    const fn = (next) => setS(next);
    _state.listeners.add(fn);
    return () => _state.listeners.delete(fn);
  }, []);
  return s;
}

// ─────── Action helpers ───────
function addHolding(h) {
  updateStore(s => ({
    ...s,
    holdings: [...s.holdings, { ...h, id: makeId("h") }],
  }));
}

function removeHolding(id) {
  updateStore(s => ({
    ...s,
    holdings: s.holdings.filter(h => h.id !== id),
    transactions: s.transactions.filter(t => {
      const h = s.holdings.find(x => x.id === id);
      return !h || t.ticker !== h.ticker;
    }),
  }));
}

function updateHolding(id, patch) {
  updateStore(s => ({
    ...s,
    holdings: s.holdings.map(h => h.id === id ? { ...h, ...patch } : h),
  }));
}

function addTransaction(tx) {
  updateStore(s => {
    const t = { ...tx, id: makeId("tx") };
    const next = { ...s, transactions: [t, ...s.transactions] };
    // Update holding qty/costAvg if buy/dca/sell
    const idx = next.holdings.findIndex(h => h.ticker === tx.ticker);
    if (idx >= 0) {
      const h = next.holdings[idx];
      const newQty = h.qty + tx.qty; // tx.qty signed
      let newCost = h.costAvg;
      if (tx.qty > 0) {
        // weighted average
        newCost = ((h.qty * h.costAvg) + (tx.qty * tx.pricePerUnit)) / Math.max(newQty, 0.0001);
      }
      next.holdings = next.holdings.map((x, i) => i === idx
        ? { ...x, qty: Math.max(0, newQty), costAvg: newCost }
        : x);
    }
    return next;
  });
}

function removeTransaction(id) {
  updateStore(s => ({ ...s, transactions: s.transactions.filter(t => t.id !== id) }));
}

function addDCA(d) {
  updateStore(s => ({
    ...s,
    dca: [...s.dca, {
      id: makeId("dca"),
      executedCount: 0,
      totalSpent: 0,
      paused: false,
      startDate: todayISO(),
      nextDate: computeNextDCA({ freq: d.freq, nextDate: null }),
      ...d,
    }],
  }));
}

function removeDCA(id) {
  updateStore(s => ({ ...s, dca: s.dca.filter(d => d.id !== id) }));
}

function updateDCA(id, patch) {
  updateStore(s => ({
    ...s,
    dca: s.dca.map(d => d.id === id ? { ...d, ...patch } : d),
  }));
}

// Mark DCA as executed (user confirmed reminder)
function executeDCA(id) {
  updateStore(s => {
    const d = s.dca.find(x => x.id === id);
    if (!d) return s;
    const next = { ...s };
    next.dca = s.dca.map(x => x.id === id ? {
      ...x,
      executedCount: x.executedCount + 1,
      totalSpent: x.totalSpent + x.amount,
      nextDate: computeNextDCA({ freq: x.freq, nextDate: null }, daysFromNow(1)),
    } : x);
    // Also create a transaction
    const holding = s.holdings.find(h => h.ticker === d.ticker);
    const price = holding ? holding.price : d.amount; // fallback
    const qty = d.amount / price;
    const tx = {
      id: makeId("tx"),
      ticker: d.ticker,
      kind: "dca",
      date: todayISO(),
      qty,
      pricePerUnit: price,
      valUSD: d.ccy === "USD" ? d.amount : d.amount / (s.fx || 35.8),
      note: `DCA อัตโนมัติ — ${d.freq}`,
      ccy: d.ccy,
      dcaId: id,
    };
    next.transactions = [tx, ...s.transactions];
    // Update holding
    if (holding) {
      const newQty = holding.qty + qty;
      const newCost = ((holding.qty * holding.costAvg) + (qty * price)) / Math.max(newQty, 0.0001);
      next.holdings = s.holdings.map(h => h.id === holding.id
        ? { ...h, qty: newQty, costAvg: newCost }
        : h);
    }
    return next;
  });
}

function dismissAlert(id) {
  updateStore(s => ({ ...s, rebalanceAlerts: s.rebalanceAlerts.filter(a => a.id !== id) }));
}

function addEarn(e) {
  updateStore(s => ({
    ...s,
    earn: [...s.earn, { ...e, id: makeId("e"), earnedToday: 0 }],
  }));
}

function updateEarn(id, patch) {
  updateStore(s => ({
    ...s,
    earn: s.earn.map(e => e.id === id ? { ...e, ...patch } : e),
  }));
}

function removeEarn(id) {
  updateStore(s => ({ ...s, earn: s.earn.filter(e => e.id !== id) }));
}

function updateSettings(patch) {
  updateStore(s => ({ ...s, settings: { ...s.settings, ...patch } }));
}

function setLivePrices(priceMap) {
  updateStore(s => ({
    ...s,
    holdings: s.holdings.map(h => {
      const p = priceMap[h.ticker];
      if (p == null) return h;
      const oldPrice = h.price;
      const chg1d = oldPrice > 0 ? ((p - oldPrice) / oldPrice) * 100 : h.chg1d;
      // append to sparkline (keep last 8)
      const spark = [...(h.spark || []).slice(-7), p];
      return { ...h, price: p, chg1d: Number.isFinite(chg1d) ? chg1d : h.chg1d, spark };
    }),
    pricesUpdatedAt: Date.now(),
  }));
}

function setFX(rate) {
  updateStore(s => ({ ...s, fx: rate, fxUpdatedAt: Date.now() }));
}

function resetToSeed() {
  const seed = buildSeed();
  updateStore(seed);
}

function exportJSON() {
  return JSON.stringify(_ensureLoaded(), null, 2);
}

function importJSON(text) {
  try {
    const obj = JSON.parse(text);
    if (!obj || typeof obj !== "object") throw new Error("Invalid format");
    // Backfill missing keys from seed for safety
    const seed = buildSeed();
    const merged = { ...seed, ...obj, version: STORE_VERSION };
    updateStore(merged);
    return true;
  } catch (e) {
    console.error("Import failed:", e);
    return false;
  }
}

// Find DCAs due today or overdue (used for reminders)
function dueDCAs() {
  const today = todayISO();
  return _ensureLoaded().dca.filter(d => !d.paused && d.nextDate && d.nextDate <= today);
}

// Expose
Object.assign(window, {
  useStore, getStore, updateStore,
  addHolding, removeHolding, updateHolding,
  addTransaction, removeTransaction,
  addDCA, removeDCA, updateDCA, executeDCA,
  addEarn, updateEarn, removeEarn, dismissAlert,
  updateSettings, setLivePrices, setFX,
  resetToSeed, exportJSON, importJSON,
  dueDCAs, todayISO, daysBetween, makeId,
});
