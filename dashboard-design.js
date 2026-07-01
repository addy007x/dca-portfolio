(() => {
  const THB = new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency: "THB",
    maximumFractionDigits: 0
  });
  const USD = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2
  });
  const number = new Intl.NumberFormat("en-US");

  const shortTHB = value => THB.format(value).replace("THB", "").trim();
  const compactTHB = value => {
    const amount = Number(value || 0);
    const abs = Math.abs(amount);
    const clean = raw => raw.replace(/\.0$/, "").replace(/(\.\d)0$/, "$1");
    if (abs >= 1_000_000) return `${clean((amount / 1_000_000).toFixed(2))}M THB`;
    if (abs >= 1_000) return `${clean((amount / 1_000).toFixed(1))}K THB`;
    return `${number.format(Math.round(amount))} THB`;
  };
  const signedCompactTHB = value => `${Number(value || 0) >= 0 ? "+" : "-"}${compactTHB(Math.abs(value))}`;
  const storageKeys = {
    transactions: "siamfolio.dashboard.transactions.v1",
    categories: "siamfolio.dashboard.categories.v1",
    portfolio: "siamfolio.v1",
    layout: "siamfolio.dashboard.layout.v1",
    pendingPortfolioTransactions: "siamfolio.pendingTransactions.v1",
    authSession: "siamfolio.googleSession",
    legacyBackend: "siamfolio.backend",
    databaseMode: "siamfolio.databaseMode"
  };

  const assets = [
    { symbol: "BTC", name: "Bitcoin", color: "#d8b45f", share: 25, value: 299955, pnl: 22875, pct: 8.25 },
    { symbol: "TRX", name: "TRON", color: "#8fd6c2", share: 8, value: 95985, pnl: 2915, pct: 3.12 },
    { symbol: "XAUT", name: "Tether Gold", color: "#f2d48a", share: 10, value: 119982, pnl: 4615, pct: 4.01 },
    { symbol: "TSM", name: "Taiwan Semiconductor", color: "#7bb7ff", share: 15, value: 179973, pnl: 10554, pct: 6.21 },
    { symbol: "NVDA", name: "NVIDIA", color: "#c9a56a", share: 15, value: 179973, pnl: 12382, pct: 7.38 },
    { symbol: "GOOGL", name: "Alphabet", color: "#6ee7a5", share: 20, value: 239964, pnl: 11491, pct: 5.05 },
    { symbol: "LLY", name: "Eli Lilly", color: "#a78bfa", share: 7, value: 83988, pnl: 2264, pct: 2.77 }
  ];

  const defaultCategories = {
    income: [
      { id: "salary", name: "เงินเดือน", icon: "briefcase-business", removable: false },
      { id: "bonus", name: "โบนัส", icon: "badge-dollar-sign", removable: false },
      { id: "side", name: "รายได้เสริม", icon: "sparkles", removable: false },
      { id: "invest", name: "ลงทุน", icon: "chart-no-axes-combined", removable: false },
      { id: "other-income", name: "อื่น ๆ", icon: "ellipsis", removable: false }
    ],
    expense: [
      { id: "food", name: "อาหาร", icon: "utensils", removable: false },
      { id: "travel", name: "เดินทาง", icon: "car", removable: false },
      { id: "card", name: "บัตรเครดิต", icon: "credit-card", removable: false },
      { id: "shopping", name: "ช้อปปิ้ง", icon: "shopping-bag", removable: false },
      { id: "other-expense", name: "อื่น ๆ", icon: "ellipsis", removable: false }
    ]
  };

  const seedTransactions = [
    { id: "seed-income-1", type: "income", date: "2026-06-27", categoryId: "salary", note: "เงินเดือนรายเดือน", amount: 30000 },
    { id: "seed-income-2", type: "income", date: "2026-06-27", categoryId: "invest", note: "เงินปันผล NVDA", amount: 5000 },
    { id: "seed-income-3", type: "income", date: "2026-06-27", categoryId: "side", note: "โปรเจกต์เสริม", amount: 3200 },
    { id: "seed-income-4", type: "income", date: "2026-06-26", categoryId: "invest", note: "เงินปันผล SCHD", amount: 4500 },
    { id: "seed-income-5", type: "income", date: "2026-06-26", categoryId: "side", note: "รายได้จากงานฟรีแลนซ์", amount: 2300 },
    { id: "seed-expense-1", type: "expense", date: "2026-06-27", categoryId: "food", note: "อาหารเย็น", amount: 250 },
    { id: "seed-expense-2", type: "expense", date: "2026-06-27", categoryId: "travel", note: "เชื้อเพลิง", amount: 500 },
    { id: "seed-expense-3", type: "expense", date: "2026-06-27", categoryId: "card", note: "บัตรเครดิต", amount: 700 },
    { id: "seed-expense-4", type: "expense", date: "2026-06-26", categoryId: "other-expense", note: "สุขภาพ", amount: 1200 },
    { id: "seed-expense-5", type: "expense", date: "2026-06-26", categoryId: "shopping", note: "ค่าสมัครสมาชิก", amount: 2500 }
  ];

  const goals = [
    { icon: "home", name: "บ้านในฝัน", target: "เป้าหมาย THB 3,000,000", current: "THB 1,350,000 / THB 3,000,000", pct: 45 },
    { icon: "shield-plus", name: "เงินสำรองฉุกเฉิน", target: "เป้าหมาย THB 300,000", current: "THB 240,000 / THB 300,000", pct: 80 },
    { icon: "chart-no-axes-combined", name: "พอร์ต 1 ล้านบาท", target: "เป้าหมาย THB 1,000,000", current: "THB 620,000 / THB 1,000,000", pct: 62 }
  ];

  const dividends = [
    ["SCHD", 150, "S", "#d8b45f"],
    ["VOO", 20.35, "V", "#7bb7ff"],
    ["O", 35.24, "O", "#8fd6c2"],
    ["JNJ", 18.6, "J", "#f2d48a"],
    ["MSFT", 15.4, "M", "#a78bfa"]
  ];

  const expenseMix = [
    ["อาหาร", 35, "#d8b45f"],
    ["การท่องเที่ยว", 23, "#f2d48a"],
    ["ช้อปปิ้ง", 18, "#c9a56a"],
    ["การลงทุน", 10, "#7bb7ff"],
    ["เงินออม", 8, "#6ee7a5"],
    ["อื่น ๆ", 6, "#a78bfa"]
  ];

  const chartColors = {
    grid: "rgba(216,180,95,.13)",
    text: "#a9a092",
    good: "#6ee7a5",
    bad: "#f28f7f",
    gold: "#d8b45f",
    goldBright: "#f2d48a"
  };

  let categories = loadCategories();
  let transactions = loadTransactions();
  let modalMode = "income";
  let selectedCategoryId = categories.income[0].id;
  let activeAssetFilter = "all";
  let editingTransactionId = null;
  let reportFilter = "all";
  let selectedAssetTxTicker = "";
  const monthBaseline = [
    { key: "2026-01", label: "ม.ค. 2026", income: 38000, expense: 15500 },
    { key: "2026-02", label: "ก.พ. 2026", income: 40000, expense: 19800 },
    { key: "2026-03", label: "มี.ค. 2026", income: 40000, expense: 22000 },
    { key: "2026-04", label: "เม.ย. 2026", income: 45000, expense: 20000 },
    { key: "2026-05", label: "พ.ค. 2026", income: 50000, expense: 23000 },
    { key: "2026-06", label: "มิ.ย. 2026", income: 0, expense: 0 }
  ];

  const assetColors = {
    crypto: "#d8b45f",
    us: "#7bb7ff",
    th: "#6ee7a5",
    gold: "#f2d48a",
    fund: "#a78bfa"
  };

  function normalizeAssetType(asset = {}) {
    const rawType = String(asset.classKey || asset.type || asset.category || "").toLowerCase();
    const symbol = String(asset.ticker || asset.symbol || "").toUpperCase();
    if (rawType.includes("crypto") || ["BTC", "TRX", "ETH", "SOL", "BNB", "XRP", "ADA"].includes(symbol)) return "crypto";
    if (rawType.includes("gold") || ["XAUT", "GOLD"].includes(symbol)) return "gold";
    return "stocks";
  }

  function assetIconName(asset = {}) {
    const symbol = String(asset.ticker || asset.symbol || "").toUpperCase();
    const type = asset.type || normalizeAssetType(asset);
    if (symbol === "BTC") return "bitcoin";
    if (type === "crypto") return "coins";
    if (type === "gold") return "gem";
    if (["TSM", "NVDA", "GOOGL", "LLY"].includes(symbol)) return "chart-line";
    return "landmark";
  }

  const cryptoLogoBase = "https://cdn.jsdelivr.net/gh/spothq/cryptocurrency-icons@master/svg/color/";
  const cryptoLogoMap = {
    BTC: `${cryptoLogoBase}btc.svg`,
    ETH: `${cryptoLogoBase}eth.svg`,
    SOL: `${cryptoLogoBase}sol.svg`,
    ADA: `${cryptoLogoBase}ada.svg`,
    XRP: `${cryptoLogoBase}xrp.svg`,
    DOGE: `${cryptoLogoBase}doge.svg`,
    MATIC: `${cryptoLogoBase}matic.svg`,
    BNB: `${cryptoLogoBase}bnb.svg`,
    AVAX: `${cryptoLogoBase}avax.svg`,
    LINK: `${cryptoLogoBase}link.svg`,
    DOT: `${cryptoLogoBase}dot.svg`,
    TRX: `${cryptoLogoBase}trx.svg`,
    LTC: `${cryptoLogoBase}ltc.svg`,
    UNI: `${cryptoLogoBase}uni.svg`,
    ATOM: `${cryptoLogoBase}atom.svg`,
    NEAR: `${cryptoLogoBase}near.svg`,
    FIL: `${cryptoLogoBase}fil.svg`,
    XAUT: "https://coin-images.coingecko.com/coins/images/10481/small/logo.png"
  };

  function assetLogoUrl(asset = {}) {
    const symbol = String(asset.ticker || asset.symbol || "").toUpperCase();
    const type = asset.type || normalizeAssetType(asset);
    if (!symbol || symbol === "-") return "";
    if (type === "crypto" || type === "gold") {
      return cryptoLogoMap[symbol] || `${cryptoLogoBase}${symbol.toLowerCase()}.svg`;
    }
    return `https://assets.parqet.com/logos/symbol/${symbol.replace(/\.[A-Z]+$/i, "")}`;
  }

  function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    }[char]));
  }

  function cloneDefaultCategories() {
    return JSON.parse(JSON.stringify(defaultCategories));
  }

  function loadCategories() {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKeys.categories));
      if (saved?.income?.length && saved?.expense?.length) return saved;
    } catch (error) {
      console.warn("Cannot load categories", error);
    }
    return cloneDefaultCategories();
  }

  function saveCategories() {
    localStorage.setItem(storageKeys.categories, JSON.stringify(categories));
  }

  function loadTransactions() {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKeys.transactions));
      if (Array.isArray(saved)) return saved;
    } catch (error) {
      console.warn("Cannot load transactions", error);
    }
    return [...seedTransactions];
  }

  function saveTransactions() {
    localStorage.setItem(storageKeys.transactions, JSON.stringify(transactions));
  }

  function loadPortfolioStore() {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKeys.portfolio));
      if (saved && Array.isArray(saved.holdings)) return saved;
    } catch (error) {
      console.warn("Cannot load portfolio store", error);
    }
    return null;
  }

  function savePortfolioStore(store) {
    const value = JSON.stringify(store);
    localStorage.setItem(storageKeys.portfolio, value);
    try {
      window.dispatchEvent(new StorageEvent("storage", {
        key: storageKeys.portfolio,
        oldValue: null,
        newValue: value,
        storageArea: localStorage,
        url: window.location.href
      }));
    } catch (error) {
      console.warn("Cannot dispatch storage event", error);
    }
    window.dispatchEvent(new CustomEvent("siamfolio:portfolio-updated", { detail: store }));
    window.dispatchEvent(new CustomEvent("siamfolio.sync", { detail: { ok: true, local: true, source: "dashboard-design" } }));
  }

  function enqueuePortfolioTransaction(tx) {
    try {
      const pending = JSON.parse(localStorage.getItem(storageKeys.pendingPortfolioTransactions) || "[]");
      const list = Array.isArray(pending) ? pending : [];
      if (!list.some(item => item.id === tx.id)) {
        localStorage.setItem(storageKeys.pendingPortfolioTransactions, JSON.stringify([tx, ...list].slice(0, 100)));
      }
    } catch (error) {
      console.warn("Cannot queue portfolio transaction", error);
      localStorage.setItem(storageKeys.pendingPortfolioTransactions, JSON.stringify([tx]));
    }
  }

  function assetValueTHB(asset, fx) {
    const value = Number(asset.qty || 0) * Number(asset.price || 0);
    return asset.ccy === "THB" ? value : value * fx;
  }

  function assetPnlTHB(asset, fx) {
    const pnl = Number(asset.qty || 0) * (Number(asset.price || 0) - Number(asset.costAvg || 0));
    return asset.ccy === "THB" ? pnl : pnl * fx;
  }

  function getHeldAssets() {
    const store = loadPortfolioStore();
    const fx = Number(store?.fx || 35.8);
    const holdings = (store?.holdings || [])
      .filter(asset => Number(asset.qty || 0) > 0)
      .map(asset => {
        const value = assetValueTHB(asset, fx);
        const pnl = assetPnlTHB(asset, fx);
        const cost = Math.max(1, Number(asset.qty || 0) * Number(asset.costAvg || 0) * (asset.ccy === "THB" ? 1 : fx));
        const type = normalizeAssetType(asset);
        return {
          symbol: asset.ticker || asset.symbol || "-",
          name: asset.name || asset.ticker || "Asset",
          color: assetColors[asset.classKey] || assetColors[asset.type] || assetColors[type] || "#d8b45f",
          type,
          icon: assetIconName({ ...asset, type }),
          logoUrl: asset.logoUrl || asset.iconUrl || asset.image || assetLogoUrl({ ...asset, type }),
          qty: Number(asset.qty || 0),
          value,
          pnl,
          pct: (pnl / cost) * 100
        };
      })
      .sort((a, b) => b.value - a.value);

    if (holdings.length) return holdings;
    return assets.map(asset => {
      const type = normalizeAssetType(asset);
      return { ...asset, type, icon: assetIconName({ ...asset, type }), logoUrl: assetLogoUrl({ ...asset, type }) };
    });
  }

  function getPortfolioStatsFromStore() {
    const store = loadPortfolioStore();
    const fx = Number(store?.fx || 35.8);
    const holdings = (store?.holdings || []).filter(asset => Number(asset.qty || 0) > 0);
    const totals = holdings.reduce((sum, asset) => {
      const qty = Number(asset.qty || 0);
      const rate = asset.ccy === "THB" ? 1 : fx;
      const value = qty * Number(asset.price || 0) * rate;
      const cost = qty * Number(asset.costAvg || 0) * rate;
      return {
        value: sum.value + value,
        cost: sum.cost + cost,
        pnl: sum.pnl + (value - cost)
      };
    }, { value: 0, cost: 0, pnl: 0 });

    return {
      ...totals,
      count: holdings.length,
      pnlPct: totals.cost > 0 ? (totals.pnl / totals.cost) * 100 : 0
    };
  }

  function getRawPortfolioHoldings() {
    const store = loadPortfolioStore();
    const holdings = (store?.holdings || [])
      .filter(asset => Number(asset.qty || 0) > 0)
      .map(asset => {
        const type = normalizeAssetType(asset);
        return {
          ...asset,
          ticker: asset.ticker || asset.symbol || "-",
          name: asset.name || asset.ticker || asset.symbol || "Asset",
          type,
          color: assetColors[asset.classKey] || assetColors[asset.type] || assetColors[type] || "#d8b45f",
          icon: assetIconName({ ...asset, type }),
          logoUrl: asset.logoUrl || asset.iconUrl || asset.image || assetLogoUrl({ ...asset, type }),
          qty: Number(asset.qty || 0),
          price: Number(asset.price || asset.costAvg || 0),
          costAvg: Number(asset.costAvg || asset.price || 0),
          ccy: asset.ccy || "USD"
        };
      })
      .sort((a, b) => String(a.ticker).localeCompare(String(b.ticker)));

    return { store, holdings };
  }

  function applyDashboardPortfolioTx(holding, tx) {
    const qty = Number(tx.qty || 0);
    const price = Number(tx.pricePerUnit || 0);
    const oldQty = Number(holding.qty || 0);
    const oldCost = Number(holding.costAvg || price || 0);
    const newQty = oldQty + qty;
    let newCost = oldCost;
    if (qty > 0) {
      newCost = ((oldQty * oldCost) + (qty * price)) / Math.max(newQty, 0.0001);
    }
    return { ...holding, qty: Math.max(0, newQty), costAvg: newCost };
  }

  function makePortfolioTransactionId() {
    return `tx-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  }

  function loadDashboardAuthSession() {
    try {
      const raw = localStorage.getItem(storageKeys.authSession) || sessionStorage.getItem(storageKeys.authSession);
      const session = JSON.parse(raw || "null");
      if (session?.token && (!session.expiresAt || session.expiresAt > Date.now())) return session;
    } catch (_) {}
    return null;
  }

  function getDashboardAuthApiUrl() {
    return (window.AUTH_CONFIG?.apiUrl || "").replace(/\/$/, "");
  }

  async function dashboardAuthFetch(path, options = {}) {
    const apiUrl = getDashboardAuthApiUrl();
    const session = loadDashboardAuthSession();
    if (!apiUrl || !session?.token) return null;
    const headers = { ...(options.headers || {}), Authorization: `Bearer ${session.token}` };
    if (options.body && !headers["Content-Type"]) headers["Content-Type"] = "application/json";
    const response = await fetch(apiUrl + path, { ...options, headers });
    if (!response.ok) throw new Error(await response.text().catch(() => `HTTP ${response.status}`));
    return response.json();
  }

  function loadLegacyBackendConfig() {
    try {
      if (localStorage.getItem(storageKeys.databaseMode) !== "cloud") return null;
      const cfg = JSON.parse(localStorage.getItem(storageKeys.legacyBackend) || "null");
      if (cfg?.url && cfg?.key) return { url: cfg.url.replace(/\/$/, ""), key: cfg.key };
    } catch (_) {}
    return null;
  }

  async function legacyBackendFetch(path, options = {}) {
    const cfg = loadLegacyBackendConfig();
    if (!cfg) return null;
    const headers = { "X-Api-Key": cfg.key, ...(options.headers || {}) };
    if (options.body && !headers["Content-Type"]) headers["Content-Type"] = "application/json";
    const response = await fetch(cfg.url + path, { ...options, headers });
    if (!response.ok) throw new Error(await response.text().catch(() => `HTTP ${response.status}`));
    return response.json();
  }

  function mergePortfolioTxIntoSnapshot(snapshot, tx) {
    const base = snapshot && typeof snapshot === "object" ? snapshot : {};
    const transactions = Array.isArray(base.transactions) ? base.transactions : [];
    if (transactions.some(item => item.id === tx.id)) return base;
    return {
      ...base,
      transactions: [tx, ...transactions],
      holdings: (Array.isArray(base.holdings) ? base.holdings : []).map(holding => (
        (holding.ticker || holding.symbol) === tx.ticker
          ? applyDashboardPortfolioTx(holding, tx)
          : holding
      ))
    };
  }

  async function pushPortfolioTransactionRemote(tx, fallbackStore) {
    const pushOne = async (fetcher) => {
      const remote = await fetcher("/api/portfolio", { method: "GET" });
      const source = remote && Object.keys(remote).length ? remote : fallbackStore;
      const merged = mergePortfolioTxIntoSnapshot(source, tx);
      await fetcher("/api/portfolio", { method: "PUT", body: JSON.stringify(merged) });
    };

    let pushed = false;
    if (loadDashboardAuthSession() && getDashboardAuthApiUrl()) {
      await pushOne(dashboardAuthFetch);
      pushed = true;
    }
    if (loadLegacyBackendConfig()) {
      await pushOne(legacyBackendFetch);
      pushed = true;
    }
    return pushed;
  }

  function formatDate(dateString) {
    if (!dateString) return "";
    const [year, month, day] = dateString.split("-");
    return `${day}/${month}/${year}`;
  }

  function todayISO() {
    const now = new Date();
    const offset = now.getTimezoneOffset() * 60000;
    return new Date(now.getTime() - offset).toISOString().slice(0, 10);
  }

  function getCategory(type, categoryId) {
    const list = categories[type] || [];
    return list.find(category => category.id === categoryId) || list[list.length - 1] || { name: "อื่น ๆ", icon: "ellipsis" };
  }

  function totalByType(type) {
    return transactions
      .filter(item => item.type === type)
      .reduce((sum, item) => sum + Number(item.amount || 0), 0);
  }

  function summarizeCategories(type) {
    const summary = new Map();
    transactions.filter(item => item.type === type).forEach(item => {
      const category = getCategory(type, item.categoryId);
      summary.set(category.name, (summary.get(category.name) || 0) + Number(item.amount || 0));
    });
    return Array.from(summary.entries()).sort((a, b) => b[1] - a[1]).slice(0, 4);
  }

  function updateClock() {
    const now = new Date();
    const text = now.toLocaleTimeString("th-TH", {
      timeZone: "Asia/Bangkok",
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit"
    });
    const clock = document.getElementById("clockText");
    if (clock) clock.textContent = text;
  }

  function getMonthlyRows() {
    const rows = monthBaseline.map(item => ({ ...item }));
    transactions.forEach(item => {
      const key = item.date?.slice(0, 7);
      const row = rows.find(entry => entry.key === key);
      if (!row) return;
      row[item.type] += Number(item.amount || 0);
    });
    return rows.map(row => ({ ...row, balance: row.income - row.expense })).reverse();
  }

  function renderMonthlyAnalytics() {
    const target = document.getElementById("monthlyAnalytics");
    if (!target) return;
    const rows = getMonthlyRows();
    const incomeTotal = rows.reduce((sum, row) => sum + row.income, 0);
    const expenseTotal = rows.reduce((sum, row) => sum + row.expense, 0);
    const currentBalance = rows[0]?.balance || 0;
    const maxIncome = Math.max(...rows.map(row => row.income), 1);
    const maxExpense = Math.max(...rows.map(row => row.expense), 1);
    const maxBalance = Math.max(...rows.map(row => Math.max(row.balance, 0)), 1);

    const cell = (type, amount, max, color) => `
      <div class="monthly-cell ${type}">
        <b>${shortTHB(amount)}</b>
        <span class="monthly-bar" style="--dot:${color}"><i style="--w:${Math.max(4, Math.round((Math.max(amount, 0) / max) * 100))}%"></i></span>
      </div>
    `;

    target.innerHTML = `
      <section class="monthly-kpis">
        <article class="monthly-kpi" style="--dot:var(--good)">
          <span>รายรับรวม</span>
          <strong>${shortTHB(incomeTotal)}</strong>
          <small>เฉลี่ยต่อเดือน ${shortTHB(incomeTotal / 6)}</small>
        </article>
        <article class="monthly-kpi" style="--dot:#ff6b6b">
          <span>รายจ่ายรวม</span>
          <strong>${shortTHB(expenseTotal)}</strong>
          <small>เฉลี่ยต่อเดือน ${shortTHB(expenseTotal / 6)}</small>
        </article>
        <article class="monthly-kpi" style="--dot:var(--gold-2)">
          <span>เงินคงเหลือปัจจุบัน</span>
          <strong>${shortTHB(currentBalance)}</strong>
          <small>เดือนล่าสุดจากข้อมูลบันทึก</small>
        </article>
      </section>
      <section class="monthly-table">
        <div class="monthly-row header">
          <span>เดือน</span>
          <span>รายรับ</span>
          <span>รายจ่าย</span>
          <span>เงินคงเหลือ</span>
        </div>
        ${rows.map(row => `
          <div class="monthly-row">
            <span class="monthly-month">${row.label}</span>
            ${cell("income", row.income, maxIncome, "var(--good)")}
            ${cell("expense", row.expense, maxExpense, "#ff6b6b")}
            ${cell("balance", row.balance, maxBalance, "var(--gold-2)")}
          </div>
        `).join("")}
      </section>
      <section class="monthly-row total">
        <span class="monthly-month">รวม 6 เดือน</span>
        <span class="monthly-cell income"><b>${shortTHB(incomeTotal)}</b></span>
        <span class="monthly-cell expense"><b>${shortTHB(expenseTotal)}</b></span>
        <span class="monthly-cell balance"><b>${shortTHB(currentBalance)}</b></span>
      </section>
    `;
  }

  function renderPortfolioLegend() {
    const target = document.getElementById("portfolioLegend");
    if (!target) return;
    const rows = getHeldAssets();
    const total = rows.reduce((sum, asset) => sum + Number(asset.value || 0), 0);
    target.innerHTML = rows.map(asset => {
      const share = total > 0 ? (Number(asset.value || 0) / total) * 100 : Number(asset.share || 0);
      return `
      <div class="allocation-row" style="--dot:${asset.color}">
        <span></span>
        <b>${escapeHTML(asset.symbol)}</b>
        <i><b style="width:${Math.min(100, share)}%"></b></i>
        <em>${share.toFixed(0)}%</em>
      </div>
    `;
    }).join("");
  }

  function renderAssets() {
    const target = document.getElementById("assetTable");
    if (!target) return;
    const allAssets = getHeldAssets();
    const heldAssets = activeAssetFilter === "all"
      ? allAssets
      : allAssets.filter(asset => asset.type === activeAssetFilter);
    const subtitle = document.querySelector(".asset-table-panel .panel-head p");
    if (subtitle) subtitle.textContent = `${allAssets.length} สินทรัพย์ที่ถืออยู่ · แสดง ${heldAssets.length} รายการ`;
    if (!heldAssets.length) {
      target.innerHTML = `
        <div class="asset-empty">
          <i data-lucide="search-x"></i>
          <b>ไม่พบสินทรัพย์ในหมวดนี้</b>
          <span>ลองเลือกหมวดอื่น หรือเพิ่มสินทรัพย์ในพอร์ตของคุณ</span>
        </div>
      `;
      if (window.lucide) window.lucide.createIcons();
      return;
    }
    const typeLabels = { crypto: "คริปโต", stocks: "หุ้น", gold: "ทอง" };
    target.innerHTML = heldAssets.map(asset => `
      <div class="asset-row asset-type-${asset.type}" style="--dot:${asset.color}">
        <span class="asset-icon">
          ${asset.logoUrl ? `<img src="${escapeHTML(asset.logoUrl)}" alt="${escapeHTML(asset.symbol)}" loading="lazy" onerror="this.hidden=true;this.nextElementSibling.hidden=false;">` : ""}
          <i data-lucide="${asset.icon || "landmark"}" ${asset.logoUrl ? "hidden" : ""}></i>
        </span>
        <div><strong>${escapeHTML(asset.name)}</strong><small>${escapeHTML(asset.symbol)} · ${typeLabels[asset.type] || "สินทรัพย์"}${asset.qty ? ` · ${number.format(asset.qty)} หน่วย` : ""}</small></div>
        <b>${shortTHB(asset.value)}</b>
        <em class="${asset.pnl >= 0 ? "income" : "expense"}">${asset.pnl >= 0 ? "+" : ""}${shortTHB(asset.pnl)}</em>
        <strong class="gain ${asset.pnl >= 0 ? "" : "loss"}">${asset.pnl >= 0 ? "+" : ""}${asset.pct.toFixed(2)}%</strong>
      </div>
    `).join("");
    if (window.lucide) window.lucide.createIcons();
  }

  function bindAssetFilters() {
    const buttons = document.querySelectorAll(".asset-table-panel .filter-pills button");
    if (!buttons.length) return;
    const filters = ["all", "crypto", "stocks", "gold"];
    buttons.forEach((button, index) => {
      button.dataset.assetFilter = filters[index] || "all";
      button.addEventListener("click", () => {
        activeAssetFilter = button.dataset.assetFilter;
        buttons.forEach(item => item.classList.toggle("active", item === button));
        renderAssets();
      });
    });
  }

  function renderRecent(id, type) {
    const target = document.getElementById(id);
    if (!target) return;
    const rows = transactions
      .filter(item => item.type === type)
      .sort((a, b) => `${b.date}${b.id}`.localeCompare(`${a.date}${a.id}`))
      .slice(0, 5);

    target.innerHTML = rows.map(item => `
      <div class="recent-item">
        <span>${formatDate(item.date)}</span>
        <b>${item.note || getCategory(type, item.categoryId).name}</b>
        <em class="${type}">${type === "income" ? "+" : "-"}${shortTHB(item.amount)}</em>
      </div>
    `).join("");
  }

  function renderReportRows() {
    const target = document.getElementById("reportList");
    if (!target) return;
    const incomeTotal = totalByType("income");
    const expenseTotal = totalByType("expense");
    const incomeEl = document.getElementById("reportIncomeTotal");
    const expenseEl = document.getElementById("reportExpenseTotal");
    const balanceEl = document.getElementById("reportBalanceTotal");
    if (incomeEl) incomeEl.textContent = shortTHB(incomeTotal);
    if (expenseEl) expenseEl.textContent = shortTHB(expenseTotal);
    if (balanceEl) balanceEl.textContent = shortTHB(incomeTotal - expenseTotal);

    const rows = transactions
      .filter(item => reportFilter === "all" || item.type === reportFilter)
      .sort((a, b) => `${b.date}${b.id}`.localeCompare(`${a.date}${a.id}`));

    if (!rows.length) {
      target.innerHTML = `
        <div class="report-empty">
          <i data-lucide="inbox"></i>
          <b>ยังไม่มีรายการในรายงานนี้</b>
          <span>เพิ่มรายรับหรือรายจ่าย แล้วข้อมูลจะแสดงที่นี่</span>
        </div>
      `;
      refreshModalIcons();
      return;
    }

    target.innerHTML = rows.map(item => {
      const category = getCategory(item.type, item.categoryId);
      return `
        <article class="report-row ${item.type}">
          <span class="report-type"><i data-lucide="${item.type === "income" ? "arrow-down-left" : "arrow-up-right"}"></i></span>
          <div>
            <strong>${escapeHTML(item.note || category.name)}</strong>
            <small>${formatDate(item.date)} · ${escapeHTML(category.name)} · ${item.type === "income" ? "รายรับ" : "รายจ่าย"}</small>
          </div>
          <b>${item.type === "income" ? "+" : "-"}${shortTHB(item.amount)}</b>
          <div class="report-actions">
            <button type="button" data-edit-transaction="${escapeHTML(item.id)}" title="แก้ไข"><i data-lucide="pencil"></i></button>
            <button type="button" data-delete-transaction="${escapeHTML(item.id)}" title="ลบ"><i data-lucide="trash-2"></i></button>
          </div>
        </article>
      `;
    }).join("");
    refreshModalIcons();
  }

  function openReportModal() {
    const overlay = document.getElementById("reportOverlay");
    if (!overlay) return;
    overlay.hidden = false;
    renderReportRows();
  }

  function closeReportModal() {
    const overlay = document.getElementById("reportOverlay");
    if (overlay) overlay.hidden = true;
  }

  function editTransaction(transactionId) {
    const item = transactions.find(entry => entry.id === transactionId);
    if (!item) return showToast("ไม่พบรายการที่ต้องการแก้ไข");
    closeReportModal();
    openEntryModal(item.type, item.id);
  }

  function deleteTransaction(transactionId) {
    const item = transactions.find(entry => entry.id === transactionId);
    if (!item) return showToast("ไม่พบรายการที่ต้องการลบ");
    if (!window.confirm(`ลบรายการ "${item.note || getCategory(item.type, item.categoryId).name}" ใช่ไหม?`)) return;
    transactions = transactions.filter(entry => entry.id !== transactionId);
    saveTransactions();
    renderDashboardData();
    renderReportRows();
    showToast("ลบรายการแล้ว");
  }

  function renderAssetTxAssets() {
    const target = document.getElementById("assetTxAssetList");
    if (!target) return;
    const { holdings } = getRawPortfolioHoldings();
    if (!holdings.length) {
      selectedAssetTxTicker = "";
      target.innerHTML = `
        <div class="asset-tx-empty">
          <i data-lucide="wallet-cards"></i>
          <b>ยังไม่มีสินทรัพย์ที่ถืออยู่</b>
          <span>เพิ่มสินทรัพย์ในหน้าพอร์ตก่อน แล้วกลับมาบันทึกธุรกรรมจากเมนูนี้</span>
        </div>
      `;
      document.getElementById("assetTxSubmit")?.setAttribute("disabled", "disabled");
      refreshModalIcons();
      return;
    }

    if (!holdings.some(asset => asset.ticker === selectedAssetTxTicker)) {
      selectedAssetTxTicker = holdings[0].ticker;
    }

    document.getElementById("assetTxSubmit")?.removeAttribute("disabled");
    target.innerHTML = holdings.map(asset => `
      <button class="asset-tx-option${asset.ticker === selectedAssetTxTicker ? " active" : ""}" type="button" data-asset-ticker="${escapeHTML(asset.ticker)}" style="--dot:${asset.color}">
        <span class="asset-icon">
          ${asset.logoUrl ? `<img src="${escapeHTML(asset.logoUrl)}" alt="${escapeHTML(asset.ticker)}" loading="lazy" onerror="this.hidden=true;this.nextElementSibling.hidden=false;">` : ""}
          <i data-lucide="${asset.icon || "landmark"}" ${asset.logoUrl ? "hidden" : ""}></i>
        </span>
        <span>
          <b>${escapeHTML(asset.ticker)}</b>
          <small>${escapeHTML(asset.name)} · ถือ ${number.format(asset.qty)} หน่วย</small>
        </span>
        <em>${asset.ccy === "THB" ? shortTHB(asset.price) : USD.format(asset.price)}</em>
      </button>
    `).join("");
    refreshModalIcons();
  }

  function getSelectedAssetTxHolding() {
    const { holdings } = getRawPortfolioHoldings();
    return holdings.find(asset => asset.ticker === selectedAssetTxTicker) || holdings[0] || null;
  }

  function syncAssetTxFieldsFromAsset() {
    const asset = getSelectedAssetTxHolding();
    const price = document.getElementById("assetTxPrice");
    const ccy = document.getElementById("assetTxCcy");
    const mark = document.getElementById("assetTxCurrencyMark");
    if (!asset) return updateAssetTxTotal();
    if (price && (!price.value || Number(price.value) <= 0)) price.value = asset.price ? String(asset.price) : "";
    if (ccy) ccy.value = asset.ccy === "THB" ? "THB" : "USD";
    if (mark) mark.textContent = asset.ccy === "THB" ? "฿" : "$";
    updateAssetTxTotal();
  }

  function updateAssetTxTotal() {
    const qty = Number(document.getElementById("assetTxQty")?.value || 0);
    const price = Number(document.getElementById("assetTxPrice")?.value || 0);
    const ccy = document.getElementById("assetTxCcy")?.value || "USD";
    const mark = document.getElementById("assetTxCurrencyMark");
    const output = document.getElementById("assetTxTotal");
    if (mark) mark.textContent = ccy === "THB" ? "฿" : "$";
    if (output) output.textContent = ccy === "THB" ? shortTHB(qty * price) : USD.format(qty * price);
  }

  function openAssetTransactionModal() {
    const overlay = document.getElementById("assetTxOverlay");
    if (!overlay) return;
    const form = document.getElementById("assetTxForm");
    form?.reset();
    const date = document.getElementById("assetTxDate");
    if (date) date.value = todayISO();
    const { holdings } = getRawPortfolioHoldings();
    selectedAssetTxTicker = selectedAssetTxTicker || holdings[0]?.ticker || "";
    renderAssetTxAssets();
    syncAssetTxFieldsFromAsset();
    overlay.hidden = false;
    setTimeout(() => document.getElementById("assetTxQty")?.focus(), 60);
  }

  function closeAssetTransactionModal() {
    const overlay = document.getElementById("assetTxOverlay");
    if (overlay) overlay.hidden = true;
  }

  async function submitAssetTransaction(event) {
    event.preventDefault();
    const submit = document.getElementById("assetTxSubmit");
    const store = loadPortfolioStore();
    const asset = getSelectedAssetTxHolding();
    if (!store || !asset) return showToast("ยังไม่มีสินทรัพย์ในพอร์ตให้บันทึก");

    const kind = document.getElementById("assetTxKind")?.value || "buy";
    const date = document.getElementById("assetTxDate")?.value;
    const qtyAbs = Number(document.getElementById("assetTxQty")?.value || 0);
    const price = Number(document.getElementById("assetTxPrice")?.value || 0);
    const ccy = document.getElementById("assetTxCcy")?.value || asset.ccy || "USD";
    const note = document.getElementById("assetTxNote")?.value.trim();
    const fx = Number(store.fx || 35.8);

    if (!date) return showToast("กรุณาเลือกวันที่");
    if (!qtyAbs || qtyAbs <= 0) return showToast("กรุณาใส่จำนวนหน่วย");
    if (!price || price <= 0) return showToast("กรุณาใส่ราคาต่อหน่วย");
    if (kind === "sell" && qtyAbs > Number(asset.qty || 0)) return showToast("จำนวนขายมากกว่าที่ถืออยู่");

    const signedQty = kind === "sell" ? -Math.abs(qtyAbs) : Math.abs(qtyAbs);
    const gross = qtyAbs * price;
    const tx = {
      id: makePortfolioTransactionId(),
      ticker: asset.ticker,
      kind,
      date,
      qty: signedQty,
      pricePerUnit: price,
      valUSD: ccy === "THB" ? gross / fx : gross,
      ccy,
      note: note || `${kind === "sell" ? "ขาย" : "ซื้อ"} ${asset.ticker}`
    };

    if (submit) {
      submit.disabled = true;
      submit.innerHTML = `<i data-lucide="loader-2"></i>กำลังบันทึก...`;
      refreshModalIcons();
    }

    let nextStore = store;
    let remotePushed = false;
    try {
      if (typeof window.addTransaction === "function") {
        window.addTransaction(tx);
        nextStore = loadPortfolioStore() || store;
      } else {
        enqueuePortfolioTransaction(tx);
        nextStore = mergePortfolioTxIntoSnapshot(store, tx);
        savePortfolioStore(nextStore);
      }
      remotePushed = await pushPortfolioTransactionRemote(tx, nextStore);
    } catch (error) {
      console.warn("Remote portfolio transaction save failed", error);
      showToast("บันทึกในเครื่องแล้ว แต่ส่งขึ้นระบบหลักไม่สำเร็จ");
    } finally {
      if (submit) {
        submit.disabled = false;
        submit.innerHTML = `<i data-lucide="save"></i>บันทึกธุรกรรมพอร์ต`;
        refreshModalIcons();
      }
    }
    renderPortfolioLegend();
    renderAssets();
    renderPortfolioKpis();
    closeAssetTransactionModal();
    showToast(remotePushed ? `บันทึก ${asset.ticker} เข้า cloud แล้ว` : `บันทึกธุรกรรม ${asset.ticker} แล้ว`);
  }

  function renderGoals() {
    const target = document.getElementById("goalList");
    if (!target) return;
    target.innerHTML = goals.map(goal => `
      <article class="goal-card">
        <span><i data-lucide="${goal.icon}"></i></span>
        <div>
          <header><b>${goal.name}</b><em>${goal.pct}%</em></header>
          <p>${goal.target}</p>
          <i><b style="width:${goal.pct}%"></b></i>
          <small>${goal.current}</small>
        </div>
      </article>
    `).join("");
  }

  function renderDividends() {
    const target = document.getElementById("dividendList");
    if (!target) return;
    target.innerHTML = dividends.map(([ticker, amount, mark, color]) => `
      <div class="dividend-row">
        <span class="stock-badge" style="--dot:${color}">${mark}</span>
        <b>${ticker}</b>
        <em>${USD.format(amount)}</em>
      </div>
    `).join("");
  }

  function renderExpenseLegend() {
    const target = document.getElementById("expenseLegend");
    if (!target) return;
    target.innerHTML = expenseMix.map(([label, pct, color]) => `
      <div class="expense-bar-row" style="--dot:${color}">
        <header><span></span><b>${label}</b><em>${pct}%</em></header>
        <i><b style="width:${pct}%"></b></i>
      </div>
    `).join("");
  }

  function renderCashFlow() {
    const incomeTotal = totalByType("income");
    const expenseTotal = totalByType("expense");
    const remain = incomeTotal - expenseTotal;
    const target = document.querySelector(".cash-flow-layout");
    const rowTemplate = (type) => {
      const rows = summarizeCategories(type);
      if (!rows.length) return `<div><span>ยังไม่มีข้อมูล</span><b>0</b></div>`;
      return rows.map(([name, amount]) => `<div><span>${name}</span><b>${number.format(amount)}</b></div>`).join("");
    };

    if (target) {
      target.innerHTML = `
        <section class="cash-ledger income-ledger">
          <div class="ledger-title">
            <p>รายรับรวม</p>
            <strong>THB ${number.format(incomeTotal)}</strong>
            <small>เพิ่มขึ้น 12.5% จากเดือนก่อน</small>
          </div>
          <div class="ledger-lines">${rowTemplate("income")}</div>
          <div class="ledger-total"><span>รวม</span><strong>${number.format(incomeTotal)}</strong></div>
        </section>

        <section class="cash-ledger expense-ledger">
          <div class="ledger-title">
            <p>รายจ่ายรวม</p>
            <strong>THB ${number.format(expenseTotal)}</strong>
            <small>ลดลง 3.25% จากเดือนก่อน</small>
          </div>
          <div class="ledger-lines">${rowTemplate("expense")}</div>
          <div class="ledger-total"><span>รวม</span><strong>${number.format(expenseTotal)}</strong></div>
        </section>

        <section class="cash-balance-strip">
          <span>เงินคงเหลือ</span>
          <strong>THB ${number.format(remain)}</strong>
        </section>
      `;
    }

    const cards = document.querySelectorAll(".summary-grid .stat-card");
    if (cards[3]) cards[3].querySelector("strong").textContent = `${(incomeTotal / 1000).toFixed(1)}K THB`;
    if (cards[4]) cards[4].querySelector("strong").textContent = `${(expenseTotal / 1000).toFixed(1)}K THB`;
  }

  function renderPortfolioKpis() {
    const cards = document.querySelectorAll(".summary-grid .stat-card");
    const portfolioCard = cards[0];
    const pnlCard = cards[1];
    const stats = getPortfolioStatsFromStore();
    const isGain = stats.pnl >= 0;

    if (portfolioCard) {
      const value = portfolioCard.querySelector("strong");
      const detail = portfolioCard.querySelector("small");
      if (value) value.textContent = compactTHB(stats.value);
      if (detail) {
        detail.classList.remove("up", "down");
        detail.textContent = stats.count
          ? `${stats.count} สินทรัพย์ในพอร์ต`
          : "ยังไม่มีสินทรัพย์ในพอร์ต";
      }
    }

    if (pnlCard) {
      const value = pnlCard.querySelector("strong");
      const detail = pnlCard.querySelector("small");
      const icon = pnlCard.querySelector(".stat-icon i");
      if (value) {
        value.textContent = signedCompactTHB(stats.pnl);
        value.classList.toggle("profit", isGain);
        value.classList.toggle("loss", !isGain);
      }
      if (detail) {
        detail.classList.toggle("up", isGain);
        detail.classList.toggle("down", !isGain);
        detail.textContent = stats.cost > 0
          ? `${isGain ? "+" : "-"}${Math.abs(stats.pnlPct).toFixed(2)}% จากต้นทุนรวม`
          : "รอต้นทุนจากพอร์ต";
      }
      if (icon) icon.setAttribute("data-lucide", isGain ? "trending-up" : "trending-down");
    }
  }

  function renderCategoryGrid() {
    const target = document.getElementById("categoryGrid");
    if (!target) return;
    const list = categories[modalMode] || [];
    target.innerHTML = list.map(category => `
      <button class="category-option${category.id === selectedCategoryId ? " active" : ""}" type="button" data-category-id="${category.id}">
        <i data-lucide="${category.icon || "tag"}"></i>
        <span>${category.name}</span>
      </button>
    `).join("");
  }

  function renderCategoryList() {
    const target = document.getElementById("categoryList");
    if (!target) return;
    const list = categories[modalMode] || [];
    target.innerHTML = list.map(category => `
      <span class="category-chip">
        ${category.name}
        <button type="button" data-delete-category="${category.id}" ${category.removable === false ? "disabled title=\"หมวดหมู่หลักลบไม่ได้\"" : "title=\"ลบหมวดหมู่\""}>
          <i data-lucide="x"></i>
        </button>
      </span>
    `).join("");
  }

  function refreshModalIcons() {
    if (window.lucide) window.lucide.createIcons();
  }

  function openEntryModal(type, transactionId = null) {
    modalMode = type;
    editingTransactionId = transactionId;
    const editingItem = transactionId ? transactions.find(item => item.id === transactionId) : null;
    selectedCategoryId = editingItem?.categoryId || (categories[type] || [])[0]?.id || "";
    const overlay = document.getElementById("entryOverlay");
    const modal = document.getElementById("entryModal");
    const title = document.getElementById("entryModalTitle");
    const subtitle = document.getElementById("entryModalSubtitle");
    const amount = document.getElementById("entryAmount");
    const date = document.getElementById("entryDate");
    const note = document.getElementById("entryNote");
    const submit = document.getElementById("entrySubmit");
    const headIcon = modal?.querySelector(".entry-head-icon i");

    modal?.classList.toggle("expense-mode", type === "expense");
    if (title) title.textContent = editingItem
      ? (type === "income" ? "แก้ไขรายการรายรับ" : "แก้ไขรายการรายจ่าย")
      : (type === "income" ? "เพิ่มรายการรายรับ" : "เพิ่มรายการรายจ่าย");
    if (subtitle) subtitle.textContent = editingItem
      ? "ปรับรายละเอียดรายการที่บันทึกไว้"
      : (type === "income" ? "บันทึกรายรับของคุณ" : "บันทึกรายจ่ายของคุณ");
    if (submit) submit.innerHTML = `<i data-lucide="save"></i>${editingItem ? "บันทึกการแก้ไข" : (type === "income" ? "บันทึกรายรับ" : "บันทึกรายจ่าย")}`;
    if (headIcon) headIcon.setAttribute("data-lucide", type === "income" ? "wallet-cards" : "credit-card");
    if (amount) amount.value = editingItem ? String(editingItem.amount || "") : "";
    if (date) date.value = editingItem?.date || todayISO();
    if (note) note.value = editingItem?.note || "";

    renderCategoryGrid();
    if (overlay) overlay.hidden = false;
    refreshModalIcons();
    setTimeout(() => amount?.focus(), 60);
  }

  function closeEntryModal() {
    const overlay = document.getElementById("entryOverlay");
    if (overlay) overlay.hidden = true;
    editingTransactionId = null;
  }

  function addCategory() {
    const input = document.getElementById("categoryName");
    const name = input?.value.trim();
    if (!name) return showToast("กรุณาใส่ชื่อหมวดหมู่");
    const exists = categories[modalMode].some(category => category.name.toLowerCase() === name.toLowerCase());
    if (exists) return showToast("มีหมวดหมู่นี้แล้ว");

    const category = {
      id: `${modalMode}-${Date.now()}`,
      name,
      icon: "tag",
      removable: true
    };
    categories[modalMode].push(category);
    selectedCategoryId = category.id;
    saveCategories();
    if (input) input.value = "";
    renderCategoryGrid();
    renderCategoryList();
    refreshModalIcons();
    showToast("เพิ่มหมวดหมู่แล้ว");
  }

  function deleteCategory(categoryId) {
    const list = categories[modalMode] || [];
    const category = list.find(item => item.id === categoryId);
    if (!category || category.removable === false) return;
    if (list.length <= 1) return showToast("ต้องมีอย่างน้อย 1 หมวดหมู่");
    categories[modalMode] = list.filter(item => item.id !== categoryId);
    const fallback = categories[modalMode][0]?.id;
    transactions = transactions.map(item => (
      item.type === modalMode && item.categoryId === categoryId
        ? { ...item, categoryId: fallback }
        : item
    ));
    selectedCategoryId = fallback;
    saveCategories();
    saveTransactions();
    renderCategoryGrid();
    renderCategoryList();
    renderDashboardData();
    refreshModalIcons();
    showToast("ลบหมวดหมู่แล้ว");
  }

  function submitEntry(event) {
    event.preventDefault();
    const wasEditing = Boolean(editingTransactionId);
    const amount = Number(document.getElementById("entryAmount")?.value || 0);
    const date = document.getElementById("entryDate")?.value;
    const note = document.getElementById("entryNote")?.value.trim();
    if (!amount || amount <= 0) return showToast("กรุณาใส่จำนวนเงิน");
    if (!date) return showToast("กรุณาเลือกวันที่");
    if (!selectedCategoryId) return showToast("กรุณาเลือกหมวดหมู่");

    const nextItem = {
      id: editingTransactionId || `${modalMode}-${Date.now()}`,
      type: modalMode,
      date,
      categoryId: selectedCategoryId,
      note: note || getCategory(modalMode, selectedCategoryId).name,
      amount
    };
    if (editingTransactionId) {
      transactions = transactions.map(item => item.id === editingTransactionId ? nextItem : item);
    } else {
      transactions.unshift(nextItem);
    }
    saveTransactions();
    renderDashboardData();
    renderReportRows();
    closeEntryModal();
    showToast(wasEditing ? "บันทึกการแก้ไขแล้ว" : (modalMode === "income" ? "บันทึกรายรับแล้ว" : "บันทึกรายจ่ายแล้ว"));
  }

  function renderDashboardData() {
    const cashPanelTitle = document.querySelector(".income-expense-panel .panel-head h2");
    const cashPanelSubtitle = document.querySelector(".income-expense-panel .panel-head p");
    if (cashPanelTitle) cashPanelTitle.textContent = "สรุปรายรับ-รายจ่าย";
    if (cashPanelSubtitle) cashPanelSubtitle.textContent = "กระแสเงินสดและเงินคงเหลือรายเดือน";
    renderPortfolioKpis();
    renderCashFlow();
    renderRecent("recentIncome", "income");
    renderRecent("recentExpense", "expense");
    renderMonthlyAnalytics();
    if (window.lucide) window.lucide.createIcons();
  }

  function loadPanelLayout() {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKeys.layout));
      if (saved && typeof saved === "object") {
        return {
          order: Array.isArray(saved.order) ? saved.order : [],
          collapsed: saved.collapsed && typeof saved.collapsed === "object" ? saved.collapsed : {},
          size: saved.size && typeof saved.size === "object" ? saved.size : {}
        };
      }
    } catch (error) {
      console.warn("Cannot load panel layout", error);
    }
    return { order: [], collapsed: {}, size: {} };
  }

  function savePanelLayout(layout) {
    localStorage.setItem(storageKeys.layout, JSON.stringify(layout));
  }

  function getPanelId(panel, index) {
    if (panel.classList.contains("income-expense-panel")) return "cashflow";
    if (panel.classList.contains("portfolio-panel")) return "portfolio";
    if (panel.classList.contains("goals-panel")) return "goals";
    if (panel.classList.contains("asset-table-panel")) return "assets";
    if (panel.classList.contains("trend-panel")) return "monthly";
    if (panel.classList.contains("expense-breakdown")) return "expense-mix";
    if (panel.classList.contains("dividend-panel")) return "dividend";
    if (panel.querySelector("#recentIncome")) return "latest-income";
    if (panel.querySelector("#recentExpense")) return "latest-expense";
    return `panel-${index}`;
  }

  function getPanelLayoutState() {
    const grid = document.querySelector(".content-grid");
    const layout = loadPanelLayout();
    if (!grid) return layout;
    layout.order = Array.from(grid.querySelectorAll(":scope > .panel")).map(panel => panel.dataset.panelId);
    layout.collapsed ||= {};
    layout.size ||= {};
    return layout;
  }

  function applyPanelState(panel, layout) {
    const id = panel.dataset.panelId;
    const size = layout.size?.[id] || "normal";
    panel.classList.toggle("is-collapsed", Boolean(layout.collapsed?.[id]));
    panel.classList.remove("panel-size-compact", "panel-size-normal", "panel-size-wide", "panel-size-full");
    panel.classList.add(`panel-size-${size}`);
    const collapseIcon = panel.querySelector('[data-panel-action="collapse"] i');
    const sizeButton = panel.querySelector('[data-panel-action="size"] span');
    if (collapseIcon) collapseIcon.setAttribute("data-lucide", panel.classList.contains("is-collapsed") ? "chevron-down" : "chevron-up");
    if (sizeButton) {
      const label = { compact: "เล็ก", normal: "กลาง", wide: "กว้าง", full: "เต็ม" }[size] || "กลาง";
      sizeButton.textContent = label;
    }
  }

  function applyPanelOrder(grid, panels, layout) {
    if (!layout.order?.length) return;
    const byId = new Map(panels.map(panel => [panel.dataset.panelId, panel]));
    layout.order.forEach(id => {
      const panel = byId.get(id);
      if (panel) grid.appendChild(panel);
    });
    panels.forEach(panel => {
      if (!layout.order.includes(panel.dataset.panelId)) grid.appendChild(panel);
    });
  }

  function cyclePanelSize(current) {
    const sizes = ["normal", "wide", "full", "compact"];
    return sizes[(sizes.indexOf(current) + 1) % sizes.length] || "normal";
  }

  function enhancePanels() {
    const grid = document.querySelector(".content-grid");
    if (!grid) return;
    let layout = loadPanelLayout();
    const panels = Array.from(grid.querySelectorAll(":scope > .panel"));

    panels.forEach((panel, index) => {
      panel.dataset.panelId = getPanelId(panel, index);
      const head = panel.querySelector(".panel-head");
      if (!head || head.querySelector(".panel-tools")) return;
      head.setAttribute("draggable", "true");
      head.title = "ลากเพื่อย้ายกรอบ";
      const tools = document.createElement("div");
      tools.className = "panel-tools";
      tools.innerHTML = `
        <button class="panel-tool" type="button" data-panel-action="collapse" title="พับ/ขยายกรอบ"><i data-lucide="chevron-up"></i></button>
        <button class="panel-tool" type="button" data-panel-action="size" title="เปลี่ยนขนาดกรอบ"><i data-lucide="maximize-2"></i><span>กลาง</span></button>
      `;
      head.appendChild(tools);
    });

    const resetButton = document.createElement("button");
    resetButton.className = "layout-reset";
    resetButton.type = "button";
    resetButton.innerHTML = `<i data-lucide="rotate-ccw"></i><span>รีเซ็ตเลย์เอาต์</span>`;
    resetButton.addEventListener("click", () => {
      localStorage.removeItem(storageKeys.layout);
      showToast("รีเซ็ตเลย์เอาต์แล้ว");
      window.setTimeout(() => window.location.reload(), 250);
    });
    const topnav = document.querySelector(".topnav");
    if (topnav && !topnav.querySelector(".layout-reset")) topnav.appendChild(resetButton);

    const panelList = Array.from(grid.querySelectorAll(":scope > .panel"));
    applyPanelOrder(grid, panelList, layout);
    Array.from(grid.querySelectorAll(":scope > .panel")).forEach(panel => applyPanelState(panel, layout));
    grid.classList.add("layout-editing");

    grid.addEventListener("click", event => {
      const button = event.target.closest("[data-panel-action]");
      if (!button) return;
      const panel = button.closest(".panel");
      if (!panel) return;
      const id = panel.dataset.panelId;
      layout = getPanelLayoutState();
      if (button.dataset.panelAction === "collapse") {
        layout.collapsed ||= {};
        layout.collapsed[id] = !layout.collapsed?.[id];
        showToast(layout.collapsed[id] ? "พับกรอบแล้ว" : "ขยายกรอบแล้ว");
      }
      if (button.dataset.panelAction === "size") {
        layout.size ||= {};
        layout.size[id] = cyclePanelSize(layout.size?.[id] || "normal");
        const label = { compact: "เล็ก", normal: "กลาง", wide: "กว้าง", full: "เต็ม" }[layout.size[id]] || "กลาง";
        showToast(`เปลี่ยนขนาดเป็น ${label}`);
      }
      savePanelLayout(layout);
      applyPanelState(panel, layout);
      if (window.lucide) window.lucide.createIcons();
    });

    let draggedPanel = null;
    grid.addEventListener("dragstart", event => {
      const head = event.target.closest(".panel-head");
      const isControl = event.target.closest("button, a, select, input, textarea");
      if (!head || isControl) return;
      draggedPanel = head.closest(".panel");
      if (!draggedPanel) return;
      draggedPanel.classList.add("is-dragging");
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/plain", draggedPanel.dataset.panelId);
    });

    grid.addEventListener("dragover", event => {
      if (!draggedPanel) return;
      event.preventDefault();
      const target = event.target.closest(".content-grid > .panel");
      document.querySelectorAll(".content-grid > .panel.drag-over").forEach(panel => panel.classList.remove("drag-over"));
      if (!target || target === draggedPanel) return;
      target.classList.add("drag-over");
      const rect = target.getBoundingClientRect();
      const after = event.clientY > rect.top + rect.height / 2;
      grid.insertBefore(draggedPanel, after ? target.nextSibling : target);
    });

    grid.addEventListener("drop", event => {
      if (!draggedPanel) return;
      event.preventDefault();
      layout = getPanelLayoutState();
      savePanelLayout(layout);
      showToast("บันทึกตำแหน่งกรอบแล้ว");
    });

    grid.addEventListener("dragend", () => {
      if (draggedPanel) draggedPanel.classList.remove("is-dragging");
      draggedPanel = null;
      document.querySelectorAll(".content-grid > .panel.drag-over").forEach(panel => panel.classList.remove("drag-over"));
    });
  }

  function showToast(message) {
    const toast = document.getElementById("toast");
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add("show");
    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(() => toast.classList.remove("show"), 1800);
  }

  function bindActions() {
    document.querySelectorAll("[data-action]").forEach(button => {
      button.addEventListener("click", () => {
        const action = button.dataset.action;
        showToast(`กำลังเปิด ${action}`);
      });
    });

    document.querySelectorAll(".side-menu a").forEach(item => {
      item.addEventListener("click", event => {
        event.preventDefault();
        document.querySelectorAll(".side-menu a").forEach(link => link.classList.remove("active"));
        item.classList.add("active");
        const href = item.getAttribute("href");
        if (href === "#income") return openEntryModal("income");
        if (href === "#expense") return openEntryModal("expense");
        if (href === "#portfolio") return openAssetTransactionModal();
        if (href === "#report") return openReportModal();
        showToast(`เลือก ${item.dataset.section || item.textContent.trim()}`);
      });
    });

    document.getElementById("entryClose")?.addEventListener("click", closeEntryModal);
    document.getElementById("entryCancel")?.addEventListener("click", closeEntryModal);
    document.getElementById("entryForm")?.addEventListener("submit", submitEntry);
    document.getElementById("categoryGrid")?.addEventListener("click", event => {
      const button = event.target.closest("[data-category-id]");
      if (!button) return;
      selectedCategoryId = button.dataset.categoryId;
      renderCategoryGrid();
      refreshModalIcons();
    });
    document.getElementById("entryOverlay")?.addEventListener("click", event => {
      if (event.target.id === "entryOverlay") closeEntryModal();
    });
    document.getElementById("reportClose")?.addEventListener("click", closeReportModal);
    document.getElementById("reportOverlay")?.addEventListener("click", event => {
      if (event.target.id === "reportOverlay") closeReportModal();
    });
    document.getElementById("assetTxClose")?.addEventListener("click", closeAssetTransactionModal);
    document.getElementById("assetTxCancel")?.addEventListener("click", closeAssetTransactionModal);
    document.getElementById("assetTxForm")?.addEventListener("submit", submitAssetTransaction);
    document.getElementById("assetTxOverlay")?.addEventListener("click", event => {
      if (event.target.id === "assetTxOverlay") closeAssetTransactionModal();
    });
    document.getElementById("assetTxAssetList")?.addEventListener("click", event => {
      const button = event.target.closest("[data-asset-ticker]");
      if (!button) return;
      selectedAssetTxTicker = button.dataset.assetTicker;
      document.getElementById("assetTxPrice").value = "";
      renderAssetTxAssets();
      syncAssetTxFieldsFromAsset();
    });
    ["assetTxQty", "assetTxPrice", "assetTxCcy"].forEach(id => {
      document.getElementById(id)?.addEventListener("input", updateAssetTxTotal);
      document.getElementById(id)?.addEventListener("change", updateAssetTxTotal);
    });
    document.querySelectorAll("[data-report-filter]").forEach(button => {
      button.addEventListener("click", () => {
        reportFilter = button.dataset.reportFilter || "all";
        document.querySelectorAll("[data-report-filter]").forEach(item => item.classList.toggle("active", item === button));
        renderReportRows();
      });
    });
    document.getElementById("reportList")?.addEventListener("click", event => {
      const editButton = event.target.closest("[data-edit-transaction]");
      if (editButton) return editTransaction(editButton.dataset.editTransaction);
      const deleteButton = event.target.closest("[data-delete-transaction]");
      if (deleteButton) return deleteTransaction(deleteButton.dataset.deleteTransaction);
    });
    document.addEventListener("keydown", event => {
      if (event.key === "Escape") {
        closeEntryModal();
        closeReportModal();
        closeAssetTransactionModal();
      }
    });
  }

  function init() {
    updateClock();
    window.setInterval(updateClock, 1000);
    renderPortfolioLegend();
    bindAssetFilters();
    renderAssets();
    renderGoals();
    renderDividends();
    renderExpenseLegend();
    renderDashboardData();
    bindActions();
    if (window.lucide) window.lucide.createIcons();
    if (["#income", "#expense", "#portfolio", "#report"].includes(window.location.hash)) {
      document.querySelectorAll(".side-menu a").forEach(link => {
        link.classList.toggle("active", link.getAttribute("href") === window.location.hash);
      });
      if (window.location.hash === "#report") {
        window.setTimeout(openReportModal, 120);
        return;
      }
      if (window.location.hash === "#portfolio") {
        window.setTimeout(openAssetTransactionModal, 120);
        return;
      }
      const type = window.location.hash === "#income" ? "income" : "expense";
      window.setTimeout(() => openEntryModal(type), 120);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
