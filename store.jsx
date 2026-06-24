// SiamFolio Store — localStorage-backed reactive store
// Replaces window.MOCK with persistent, mutable state.
//
// Usage:
//   const store = useStore();               // reactive read
//   updateStore(s => ({ ...s, fx: 36.0 })); // anywhere
//   const { holdings, addHolding } = useHoldings();

const STORE_KEY = "siamfolio.v1";
const STORE_VERSION = 2;

// ─────── ID generator ───────
function makeId(prefix = "id") {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

// ─────── Date helpers ───────
function bangkokISO(ms = Date.now()) {
  return new Date(ms + 7 * 60 * 60 * 1000).toISOString().slice(0, 10);
}
function todayISO() {
  return bangkokISO();
}
function daysFromNow(n) {
  return bangkokISO(Date.now() + n * 86400000);
}
function addDaysISO(iso, n) {
  const d = new Date((iso || todayISO()) + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
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
  return addDaysISO(fromISO, days);
}

function normalizeDCAList(list) {
  const today = todayISO();
  return (list || []).map(d => {
    if ((d.executedCount || 0) === 0 && d.startDate && (!d.nextDate || d.nextDate > d.startDate)) {
      return { ...d, nextDate: d.startDate };
    }
    if (!d.nextDate) return { ...d, nextDate: d.startDate || today };
    return d;
  });
}

// ─────── Seed (first-run) ───────
function buildSeed() {
  const M = window.MOCK;
  const hold = M.HOLDINGS_MIXED.map(h => ({ ...h, id: makeId("h") }));
  const dca = []; // Users create their own DCA schedules
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
      livePrices: false,
      notifyDCA: false, // user must opt-in
      rebalanceProfile: "balanced",
      rebalanceTolerance: 5,
      rebalanceCapitalTHB: 0,
      rebalanceAssetTargets: {},
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
      if (parsed.version === STORE_VERSION) {
        return {
          ...parsed,
          dca: normalizeDCAList(parsed.dca),
          settings: { ...buildSeed().settings, ...(parsed.settings || {}) },
        };
      }
      // v1 → v2 migration: keep holdings/tx/earn, clear seeded DCAs
      if (parsed.version === 1) {
        const migrated = {
          ...parsed,
          version: STORE_VERSION,
          dca: [],
          settings: { ...buildSeed().settings, ...(parsed.settings || {}) },
        };
        saveStore(migrated);
        return migrated;
      }
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
  if (typeof window.scheduleCloudSync === "function") {
    try { window.scheduleCloudSync(); } catch (_) {}
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

function applyTxToHolding(h, tx) {
  const qty = Number(tx.qty || 0);
  const price = Number(tx.pricePerUnit || 0);
  const oldQty = Number(h.qty || 0);
  const oldCost = Number(h.costAvg || price || 0);
  const newQty = oldQty + qty;
  let newCost = oldCost;
  if (qty > 0) {
    newCost = ((oldQty * oldCost) + (qty * price)) / Math.max(newQty, 0.0001);
  }
  return { ...h, qty: Math.max(0, newQty), costAvg: newCost };
}

function reverseTxFromHolding(h, tx) {
  const qty = Number(tx.qty || 0);
  const price = Number(tx.pricePerUnit || 0);
  const oldQty = Number(h.qty || 0);
  const oldCost = Number(h.costAvg || price || 0);
  const newQty = oldQty - qty;
  let newCost = oldCost;
  if (qty > 0) {
    const remainingCost = (oldQty * oldCost) - (qty * price);
    newCost = newQty > 0 ? remainingCost / Math.max(newQty, 0.0001) : oldCost;
  }
  return { ...h, qty: Math.max(0, newQty), costAvg: newCost };
}

function txNativeValue(tx, fx = 35.8) {
  if (!tx) return 0;
  const valUSD = Number(tx.valUSD || 0);
  return tx.ccy === "THB" ? valUSD * fx : valUSD;
}

function adjustDcaAfterTxChange(dca, oldTx, newTx, fx = 35.8) {
  if (!dca) return dca;
  const oldMatches = oldTx?.kind === "dca" && oldTx.dcaId === dca.id;
  const newMatches = newTx?.kind === "dca" && newTx.dcaId === dca.id;
  if (!oldMatches && !newMatches) return dca;
  const countDelta = (newMatches ? 1 : 0) - (oldMatches ? 1 : 0);
  const spentDelta = (newMatches ? txNativeValue(newTx, fx) : 0) - (oldMatches ? txNativeValue(oldTx, fx) : 0);
  return {
    ...dca,
    executedCount: Math.max(0, Number(dca.executedCount || 0) + countDelta),
    totalSpent: Math.max(0, Number(dca.totalSpent || 0) + spentDelta),
  };
}

function addTransaction(tx) {
  updateStore(s => {
    const t = { ...tx, id: makeId("tx") };
    const next = { ...s, transactions: [t, ...s.transactions] };
    // Update holding qty/costAvg if buy/dca/sell
    const idx = next.holdings.findIndex(h => h.ticker === tx.ticker);
    if (idx >= 0) {
      next.holdings = next.holdings.map((x, i) => i === idx
        ? applyTxToHolding(x, tx)
        : x);
    }
    return next;
  });
}

function removeTransaction(id) {
  updateStore(s => {
    const old = s.transactions.find(t => t.id === id);
    if (!old) return s;
    return {
      ...s,
      holdings: s.holdings.map(h => h.ticker === old.ticker ? reverseTxFromHolding(h, old) : h),
      dca: s.dca.map(d => adjustDcaAfterTxChange(d, old, null, s.fx)),
      transactions: s.transactions.filter(t => t.id !== id),
    };
  });
}

function updateTransaction(id, patch) {
  updateStore(s => {
    const old = s.transactions.find(t => t.id === id);
    if (!old) return s;
    const nextTx = { ...old, ...patch, id };
    let holdings = s.holdings.map(h => h.ticker === old.ticker ? reverseTxFromHolding(h, old) : h);
    holdings = holdings.map(h => h.ticker === nextTx.ticker ? applyTxToHolding(h, nextTx) : h);
    return {
      ...s,
      holdings,
      dca: s.dca.map(d => adjustDcaAfterTxChange(d, old, nextTx, s.fx)),
      transactions: s.transactions.map(t => t.id === id ? nextTx : t),
    };
  });
}

function addDCA(d) {
  const startDate = d.startDate || todayISO();
  updateStore(s => ({
    ...s,
    dca: [...s.dca, {
      id: makeId("dca"),
      executedCount: 0,
      totalSpent: 0,
      paused: false,
      startDate,
      nextDate: d.nextDate || startDate,
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
    dca: s.dca.map(d => {
      if (d.id !== id) return d;
      const next = { ...d, ...patch };
      if (!("nextDate" in patch) && (("startDate" in patch) || ("freq" in patch)) && (d.executedCount || 0) === 0) {
        next.nextDate = next.startDate || todayISO();
      }
      return next;
    }),
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
      nextDate: computeNextDCA({ freq: x.freq, nextDate: null }, todayISO()),
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
    earn: [...s.earn, { ...e, id: makeId("e"), earnedToday: 0, accruedEarnedUSD: 0, accruedEarnedAt: Date.now() }],
  }));
}

function updateEarn(id, patch) {
  updateStore(s => {
    const now = Date.now();
    const earn = s.earn.map(e => {
      if (e.id !== id) return e;

      const last = Number(e.accruedEarnedAt) || now;
      const elapsedSeconds = Math.max(0, (now - last) / 1000);
      const holding = (s.holdings || []).find(h => h.ticker === e.sym);
      const isStable = ["USDT", "USDC", "BUSD", "DAI", "USD"].includes(e.sym);
      const price = Number(holding?.price) || (isStable ? 1 : 0);
      const earnedNative = Number(e.qty || 0) * (Number(e.apy || 0) / 100) * (elapsedSeconds / (365 * 24 * 60 * 60));
      const pendingUSD = price > 0 ? earnedNative * price : earnedNative;
      const accruedEarnedUSD = (Number(e.accruedEarnedUSD ?? e.earnedToday ?? 0) || 0) + pendingUSD;

      return { ...e, ...patch, accruedEarnedUSD, accruedEarnedAt: now };
    });
    return { ...s, earn };
  });
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
  addTransaction, removeTransaction, updateTransaction,
  addDCA, removeDCA, updateDCA, executeDCA,
  addEarn, updateEarn, removeEarn, dismissAlert,
  updateSettings, setLivePrices, setFX,
  resetToSeed, exportJSON, importJSON,
  dueDCAs, todayISO, daysBetween, makeId, normalizeDCAList,
});
