(() => {
  "use strict";

  // ───────────────────────── helpers ─────────────────────────
  const nf = new Intl.NumberFormat("th-TH", { maximumFractionDigits: 0 });
  const nf2 = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2, minimumFractionDigits: 2 });
  const money = (v) => `฿${nf.format(Math.round(Number(v) || 0))}`;
  const signedMoney = (v) => `${Number(v) >= 0 ? "+" : "-"}${money(Math.abs(Number(v) || 0))}`;
  const usd = (v) => `$${nf2.format(Number(v) || 0)}`;
  const pct1 = (v) => `${Number(v) >= 0 ? "+" : ""}${(Number(v) || 0).toFixed(2)}%`;
  const todayISO = () => new Date().toISOString().slice(0, 10);
  const monthKey = (iso) => String(iso || "").slice(0, 7);
  const monthLabel = (key) => {
    const names = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
    const [y, m] = String(key).split("-");
    return `${names[Number(m) - 1] || m} ${y}`;
  };
  const uid = (p) => `${p}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
  const $ = (id) => document.getElementById(id);
  const on = (el, ev, fn) => el && el.addEventListener(ev, fn);
  const escapeHTML = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[c]));

  const PALETTE = ["#FFD479", "#35C2C6", "#6FA8FF", "#35D28A", "#A78BFA", "#F2A93C", "#FF6D9E", "#8fd6c2"];
  const colorFor = (i) => PALETTE[i % PALETTE.length];

  // ───────────────────────── storage ─────────────────────────
  const keys = {
    transactions: "siamfolio.dashboard.transactions.v1",
    categories: "siamfolio.dashboard.categories.v1",
    goals: "siamfolio.dashboard.goals.v1",
    holdings: "siamfolio.dashboard.holdings.v1",
    dividends: "siamfolio.dashboard.dividends.v1",
    settings: "siamfolio.dashboard.appSettings.v1",
    auth: "siamfolio.googleSession",
  };
  function load(key, fallback) {
    try {
      const saved = JSON.parse(localStorage.getItem(key));
      if (saved !== null && saved !== undefined) return saved;
    } catch (_) {}
    return fallback;
  }
  function save(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (_) {}
  }

  const defaultCategories = {
    income: [
      { id: "salary", name: "เงินเดือน" },
      { id: "bonus", name: "โบนัส" },
      { id: "side", name: "รายได้เสริม" },
      { id: "invest", name: "ปันผล" },
      { id: "other-income", name: "อื่น ๆ" },
    ],
    expense: [
      { id: "food", name: "อาหาร" },
      { id: "travel", name: "เดินทาง" },
      { id: "card", name: "บัตรเครดิต" },
      { id: "shopping", name: "ช้อปปิ้ง" },
      { id: "other-expense", name: "อื่น ๆ" },
    ],
  };

  // Seed transactions are generated relative to "today" so a fresh install always
  // shows the current month populated, regardless of when the page is first opened.
  function dateOffset(monthsAgo, day) {
    const now = new Date();
    const d = new Date();
    d.setDate(1); // avoid month-length overflow when shifting months
    d.setMonth(d.getMonth() - monthsAgo);
    const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
    // For the current month, never seed a date in the future.
    const cap = monthsAgo === 0 ? Math.min(day, now.getDate()) : day;
    d.setDate(Math.min(cap, lastDay));
    return d.toISOString().slice(0, 10);
  }
  function buildSeedTransactions() {
    const rows = [
      { type: "income", m: 0, d: 27, categoryId: "salary", note: "เงินเดือนประจำเดือน", amount: 30000 },
      { type: "income", m: 0, d: 27, categoryId: "bonus", note: "โบนัสกลางปี", amount: 5000 },
      { type: "income", m: 0, d: 26, categoryId: "invest", note: "เงินปันผล NVDA", amount: 4500 },
      { type: "income", m: 0, d: 20, categoryId: "side", note: "งานฟรีแลนซ์", amount: 5500 },
      { type: "expense", m: 0, d: 27, categoryId: "food", note: "อาหารเย็น", amount: 2500 },
      { type: "expense", m: 0, d: 18, categoryId: "travel", note: "ค่าน้ำมัน", amount: 2500 },
      { type: "expense", m: 0, d: 10, categoryId: "card", note: "บัตรเครดิต", amount: 5000 },
      { type: "expense", m: 0, d: 25, categoryId: "shopping", note: "ช้อปปิ้งออนไลน์", amount: 3200 },
      { type: "expense", m: 0, d: 5, categoryId: "other-expense", note: "ค่าใช้จ่ายเบ็ดเตล็ด", amount: 1250 },
      { type: "income", m: 1, d: 27, categoryId: "salary", note: "เงินเดือนประจำเดือน", amount: 30000 },
      { type: "income", m: 1, d: 15, categoryId: "invest", note: "เงินปันผล", amount: 4000 },
      { type: "expense", m: 1, d: 20, categoryId: "food", note: "อาหาร", amount: 7200 },
      { type: "expense", m: 1, d: 12, categoryId: "card", note: "บัตรเครดิต", amount: 4800 },
      { type: "expense", m: 1, d: 8, categoryId: "travel", note: "เดินทาง", amount: 2100 },
      { type: "income", m: 2, d: 27, categoryId: "salary", note: "เงินเดือนประจำเดือน", amount: 30000 },
      { type: "expense", m: 2, d: 18, categoryId: "food", note: "อาหาร", amount: 6800 },
      { type: "expense", m: 2, d: 9, categoryId: "card", note: "บัตรเครดิต", amount: 5100 },
      { type: "income", m: 3, d: 27, categoryId: "salary", note: "เงินเดือนประจำเดือน", amount: 28000 },
      { type: "expense", m: 3, d: 15, categoryId: "food", note: "อาหาร", amount: 7000 },
      { type: "income", m: 4, d: 27, categoryId: "salary", note: "เงินเดือนประจำเดือน", amount: 28000 },
      { type: "expense", m: 4, d: 14, categoryId: "shopping", note: "ช้อปปิ้ง", amount: 8100 },
      { type: "income", m: 5, d: 27, categoryId: "salary", note: "เงินเดือนประจำเดือน", amount: 27000 },
      { type: "expense", m: 5, d: 10, categoryId: "food", note: "อาหาร", amount: 6300 },
    ];
    return rows.map((r, i) => ({ id: `seed-${i + 1}`, type: r.type, date: dateOffset(r.m, r.d), categoryId: r.categoryId, note: r.note, amount: r.amount }));
  }
  const seedTransactions = buildSeedTransactions();

  const seedHoldings = [
    { symbol: "BTC", name: "Bitcoin", type: "crypto", qty: 0.182, costAvg: 1850000, price: 2190500 },
    { symbol: "TSM", name: "TSMC", type: "stocks", qty: 40, costAvg: 5450, price: 6120 },
    { symbol: "GOOGL", name: "Alphabet", type: "stocks", qty: 30, costAvg: 6900, price: 6450 },
    { symbol: "NVDA", name: "NVIDIA", type: "stocks", qty: 22, costAvg: 4320, price: 5380 },
    { symbol: "LLY", name: "Eli Lilly", type: "stocks", qty: 8, costAvg: 10750, price: 11240 },
    { symbol: "XAUT", name: "Tether Gold", type: "stocks", qty: 0.62, costAvg: 115600, price: 118300 },
    { symbol: "TRX", name: "Tron", type: "crypto", qty: 12400, costAvg: 4.54, price: 4.82 },
  ];

  const seedGoals = [
    { id: "goal-1", name: "กองทุนฉุกเฉิน", target: 100000, current: 62000, tag: "ออม" },
    { id: "goal-2", name: "ดาวน์คอนโด", target: 500000, current: 180000, tag: "บ้าน" },
    { id: "goal-3", name: "ทริปญี่ปุ่น", target: 60000, current: 45000, tag: "เที่ยว" },
  ];

  const seedDividends = [
    { id: "div-1", symbol: "NVDA", amount: 86.4 },
    { id: "div-2", symbol: "TSM", amount: 58.1 },
    { id: "div-3", symbol: "GOOGL", amount: 41.35 },
    { id: "div-4", symbol: "LLY", amount: 33.94 },
    { id: "div-5", symbol: "XAUT", amount: 19.8 },
  ];

  const defaultSettings = {
    appName: "SiamFolio",
    subtitle: "แดชบอร์ดการเงินและพอร์ตลงทุน",
    userName: "APISIT TIAKHAM",
    userEmail: "HONGAME5678@GMAIL.COM",
    theme: "dark",
    logoImage: "",
    avatarImage: "",
  };

  const GOAL_TAGS = ["บ้าน", "รถ", "เที่ยว", "เรียน", "ออม", "สุขภาพ", "ธุรกิจ", "อื่นๆ"];

  // ───────────────────────── state ─────────────────────────
  const state = {
    transactions: load(keys.transactions, seedTransactions),
    categories: load(keys.categories, defaultCategories),
    goals: load(keys.goals, seedGoals),
    holdings: load(keys.holdings, seedHoldings),
    dividends: load(keys.dividends, seedDividends),
    settings: { ...defaultSettings, ...load(keys.settings, {}) },
    fx: 36.5,
    modalMode: "income",
    selectedCategoryId: "",
    editingTransactionId: null,
    editingGoalId: null,
    selectedGoalTag: GOAL_TAGS[0],
    selectedAssetSymbol: "",
    assetFilter: "all",
    reportFilter: "all",
    selectedMonth: "",
    auth: load(keys.auth, null),
  };

  function persist(which) {
    if (which === "transactions" || !which) save(keys.transactions, state.transactions);
    if (which === "categories" || !which) save(keys.categories, state.categories);
    if (which === "goals" || !which) save(keys.goals, state.goals);
    if (which === "holdings" || !which) save(keys.holdings, state.holdings);
    if (which === "dividends" || !which) save(keys.dividends, state.dividends);
    if (which === "settings" || !which) save(keys.settings, state.settings);
    scheduleCloudPush();
  }

  // ───────────────────────── toast ─────────────────────────
  let toastTimer = null;
  function showToast(msg) {
    const el = $("toast");
    if (!el) return;
    el.textContent = msg;
    el.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove("show"), 2600);
  }

  // ───────────────────────── derived data ─────────────────────────
  function monthsAvailable() {
    const set = new Set(state.transactions.map((t) => monthKey(t.date)));
    set.add(monthKey(todayISO()));
    return Array.from(set).sort().reverse();
  }
  function txForMonth(key) {
    return state.transactions.filter((t) => monthKey(t.date) === key);
  }
  function sumBy(list, type) {
    return list.filter((t) => t.type === type).reduce((s, t) => s + (Number(t.amount) || 0), 0);
  }
  function prevMonthKey(key) {
    const [y, m] = key.split("-").map(Number);
    const d = new Date(y, m - 2, 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  }
  function pctChange(cur, prev) {
    if (!prev) return null;
    return ((cur - prev) / prev) * 100;
  }
  function portfolioValue() {
    return state.holdings.reduce((s, h) => s + h.qty * h.price, 0);
  }
  function portfolioCost() {
    return state.holdings.reduce((s, h) => s + h.qty * h.costAvg, 0);
  }
  function dividendTotalUSD() {
    return state.dividends.reduce((s, d) => s + (Number(d.amount) || 0), 0);
  }

  // ───────────────────────── rendering: header/sidebar ─────────────────────────
  function applySettings() {
    const s = state.settings;
    document.body.dataset.theme = s.theme === "light" ? "light" : "dark";
    document.title = `${s.appName} Dashboard`;
    $("brandMark").innerHTML = s.logoImage ? `<img src="${escapeHTML(s.logoImage)}" alt="">` : "SF";
    $("brandName").textContent = s.appName;
    $("brandSub").textContent = s.subtitle;
    $("profileAvatar").innerHTML = s.avatarImage ? `<img src="${escapeHTML(s.avatarImage)}" alt="">` : (s.userName || "?").slice(0, 2).toUpperCase();
    $("profileName").textContent = s.userName;
    $("profileEmail").textContent = s.userEmail;
  }

  // ───────────────────────── rendering: KPIs ─────────────────────────
  function renderKPIs() {
    const value = portfolioValue();
    const cost = portfolioCost();
    const pnl = value - cost;
    const curKey = monthsAvailable()[0];
    const prevKey = prevMonthKey(curKey);
    const income = sumBy(txForMonth(curKey), "income");
    const expense = sumBy(txForMonth(curKey), "expense");
    const prevIncome = sumBy(txForMonth(prevKey), "income");
    const prevExpense = sumBy(txForMonth(prevKey), "expense");
    const incomeDelta = pctChange(income, prevIncome);
    const expenseDelta = pctChange(expense, prevExpense);

    $("kpiPortfolioValue").textContent = money(value);
    $("kpiPortfolioDelta").textContent = cost > 0 ? `${signedMoney(pnl).startsWith("-") ? "" : ""}${pct1(((value - cost) / Math.max(cost, 1)) * 100)} ต้นทุน` : "ยังไม่มีต้นทุนอ้างอิง";
    $("kpiPnl").textContent = signedMoney(pnl);
    $("kpiPnl").style.color = pnl >= 0 ? "var(--green)" : "var(--red)";
    $("kpiPnlDelta").textContent = cost > 0 ? pct1((pnl / cost) * 100) : "—";
    $("kpiPnlDelta").className = `kpi-delta ${pnl >= 0 ? "up" : "down"}`;
    $("kpiDividend").textContent = usd(dividendTotalUSD());
    $("kpiIncome").textContent = money(income);
    $("kpiIncomeDelta").textContent = incomeDelta === null ? "—" : `${pct1(incomeDelta)} จากเดือนก่อน`;
    $("kpiIncomeDelta").className = `kpi-delta ${incomeDelta === null ? "flat" : incomeDelta >= 0 ? "up" : "down"}`;
    $("kpiExpense").textContent = money(expense);
    $("kpiExpenseDelta").textContent = expenseDelta === null ? "—" : `${pct1(expenseDelta)} จากเดือนก่อน`;
    $("kpiExpenseDelta").className = `kpi-delta ${expenseDelta === null ? "flat" : expenseDelta <= 0 ? "up" : "down"}`;
  }

  // ───────────────────────── rendering: cashflow ─────────────────────────
  function renderMonthSelect() {
    const months = monthsAvailable();
    if (!state.selectedMonth || !months.includes(state.selectedMonth)) state.selectedMonth = months[0];
    $("monthSelect").innerHTML = months.map((m) => `<option value="${m}"${m === state.selectedMonth ? " selected" : ""}>${monthLabel(m)}</option>`).join("");
  }
  function renderCashflow() {
    const key = state.selectedMonth || monthsAvailable()[0];
    const prevKey = prevMonthKey(key);
    const rows = txForMonth(key);
    const income = sumBy(rows, "income");
    const expense = sumBy(rows, "expense");
    const balance = income - expense;
    const prevIncome = sumBy(txForMonth(prevKey), "income");
    const prevExpense = sumBy(txForMonth(prevKey), "expense");
    const incomeDelta = pctChange(income, prevIncome);
    const expenseDelta = pctChange(expense, prevExpense);

    $("incomeTotal").textContent = money(income);
    $("incomeDelta").textContent = incomeDelta === null ? "ไม่มีข้อมูลเดือนก่อน" : `${incomeDelta >= 0 ? "เพิ่มขึ้น" : "ลดลง"} ${Math.abs(incomeDelta).toFixed(1)}% จากเดือนก่อน`;
    $("expenseTotal").textContent = money(expense);
    $("expenseDelta").textContent = expenseDelta === null ? "ไม่มีข้อมูลเดือนก่อน" : `${expenseDelta >= 0 ? "เพิ่มขึ้น" : "ลดลง"} ${Math.abs(expenseDelta).toFixed(1)}% จากเดือนก่อน`;
    $("balanceVal").textContent = money(balance);
    const balPct = income > 0 ? Math.round((balance / income) * 100) : 0;
    $("balancePct").textContent = `${balPct}%`;
    $("balanceRing").style.background = `conic-gradient(#FFD479 ${Math.max(0, Math.min(100, balPct))}%, rgba(255,255,255,.1) 0)`;

    const groupLines = (type) => {
      const cats = state.categories[type] || [];
      const totals = cats.map((c) => ({ name: c.name, amount: rows.filter((r) => r.type === type && r.categoryId === c.id).reduce((s, r) => s + r.amount, 0) }))
        .filter((c) => c.amount > 0)
        .sort((a, b) => b.amount - a.amount);
      return totals;
    };
    const incomeLines = groupLines("income");
    const expenseLines = groupLines("expense");
    $("incomeLines").innerHTML = incomeLines.length
      ? incomeLines.map((l) => `<div class="line"><span>${escapeHTML(l.name)}</span><b>${nf.format(l.amount)}</b></div>`).join("")
      : `<div class="ledger-empty">ยังไม่มีรายรับเดือนนี้</div>`;
    $("expenseLines").innerHTML = expenseLines.length
      ? expenseLines.map((l) => `<div class="line"><span>${escapeHTML(l.name)}</span><b>${nf.format(l.amount)}</b></div>`).join("")
      : `<div class="ledger-empty">ยังไม่มีรายจ่ายเดือนนี้</div>`;
  }

  // ───────────────────────── rendering: portfolio allocation ─────────────────────────
  function renderPortfolioLegend() {
    const total = portfolioValue();
    const rows = [...state.holdings].sort((a, b) => b.qty * b.price - a.qty * a.price);
    $("portfolioLegend").innerHTML = rows.length
      ? rows.map((h, i) => {
          const val = h.qty * h.price;
          const p = total > 0 ? Math.round((val / total) * 100) : 0;
          return `<div class="bar-row"><div class="name"><span class="dot" style="background:${colorFor(i)}"></span>${escapeHTML(h.symbol)}</div><div class="bar-track"><div class="bar-fill" style="width:${p}%;background:${colorFor(i)}"></div></div><div class="pct">${p}%</div></div>`;
        }).join("")
      : `<div class="asset-empty">ยังไม่มีสินทรัพย์ในพอร์ต</div>`;
  }

  // ───────────────────────── rendering: goals ─────────────────────────
  function renderGoals() {
    $("goalList").innerHTML = state.goals.length
      ? state.goals.map((g) => {
          const pct = g.target > 0 ? Math.min(100, Math.round((g.current / g.target) * 100)) : 0;
          return `<div class="goal-card"><div class="goal-top"><span>${escapeHTML(g.name)}</span><span style="color:var(--gold)">${pct}%</span></div><div class="bar-track"><div class="bar-fill" style="width:${pct}%;background:var(--gold)"></div></div><div style="font-size:11px;color:var(--muted);font-weight:700;">${money(g.current)} จาก ${money(g.target)}</div></div>`;
        }).join("")
      : `<div class="asset-empty">ยังไม่มีเป้าหมาย กด "จัดการ" เพื่อเพิ่ม</div>`;
  }

  // ───────────────────────── rendering: assets ─────────────────────────
  function renderAssetTable() {
    const rows = state.holdings.filter((h) => state.assetFilter === "all" || h.type === state.assetFilter);
    $("assetSub").textContent = state.holdings.length ? state.holdings.map((h) => h.symbol).join(", ") : "ยังไม่มีสินทรัพย์";
    $("assetTable").innerHTML = rows.length
      ? rows.map((h, i) => {
          const val = h.qty * h.price;
          const gainPct = h.costAvg > 0 ? ((h.price - h.costAvg) / h.costAvg) * 100 : 0;
          return `<button type="button" class="asset-row" data-symbol="${escapeHTML(h.symbol)}">
            <span class="asset-icon" style="background:color-mix(in srgb, ${colorFor(i)}, transparent 76%);border:1px solid color-mix(in srgb, ${colorFor(i)}, transparent 45%);color:${colorFor(i)}">${escapeHTML(h.symbol.slice(0, 4))}</span>
            <span><span class="asset-name" style="display:block;">${escapeHTML(h.name)}</span><span class="asset-meta">${h.type === "crypto" ? "คริปโต" : "หุ้น/ทองคำ"} · ${h.qty}</span></span>
            <span class="asset-val">${money(val)}</span>
            <span class="asset-price">${money(h.price)}</span>
            <span class="asset-gain" style="color:${gainPct >= 0 ? "var(--green)" : "var(--red)"}">${pct1(gainPct)}</span>
          </button>`;
        }).join("")
      : `<div class="asset-empty">ยังไม่มีสินทรัพย์ — กด "+ ธุรกรรม" เพื่อเพิ่ม</div>`;
    document.querySelectorAll(".asset-row").forEach((row) => on(row, "click", () => openAssetTx(row.dataset.symbol)));
  }

  // ───────────────────────── rendering: monthly analytics ─────────────────────────
  function renderMonthly() {
    const months = monthsAvailable().slice(0, 6).reverse();
    const data = months.map((key) => ({
      key,
      income: sumBy(txForMonth(key), "income"),
      expense: sumBy(txForMonth(key), "expense"),
    }));
    const max = Math.max(1, ...data.map((d) => Math.max(d.income, d.expense)));
    $("monthlyAnalytics").innerHTML = data.map((d) => `
      <div class="monthly-row">
        <div class="m-label">${monthLabel(d.key).replace(/ \d{4}$/, "")}</div>
        <div class="m-bars">
          <div class="m-bar-line"><div class="m-track"><div class="m-fill" style="width:${Math.round((d.income / max) * 100)}%;background:var(--green)"></div></div><div class="m-num" style="color:var(--green)">${nf.format(d.income)}</div></div>
          <div class="m-bar-line"><div class="m-track"><div class="m-fill" style="width:${Math.round((d.expense / max) * 100)}%;background:var(--red)"></div></div><div class="m-num" style="color:var(--red)">${nf.format(d.expense)}</div></div>
        </div>
      </div>`).join("");
  }

  // ───────────────────────── rendering: expense breakdown ─────────────────────────
  function renderExpenseLegend() {
    const key = state.selectedMonth || monthsAvailable()[0];
    const rows = txForMonth(key).filter((t) => t.type === "expense");
    const total = rows.reduce((s, t) => s + t.amount, 0);
    const cats = (state.categories.expense || []).map((c) => ({ name: c.name, amount: rows.filter((r) => r.categoryId === c.id).reduce((s, r) => s + r.amount, 0) }))
      .filter((c) => c.amount > 0).sort((a, b) => b.amount - a.amount);
    $("expenseLegend").innerHTML = cats.length
      ? cats.map((c, i) => {
          const p = total > 0 ? Math.round((c.amount / total) * 100) : 0;
          return `<div class="bar-row"><div class="name"><span class="dot" style="background:${colorFor(i)}"></span>${escapeHTML(c.name)}</div><div class="bar-track"><div class="bar-fill" style="width:${p}%;background:${colorFor(i)}"></div></div><div class="pct">${money(c.amount)}</div></div>`;
        }).join("")
      : `<div class="asset-empty">ยังไม่มีรายจ่ายเดือนนี้</div>`;
  }

  // ───────────────────────── rendering: dividends / recent ─────────────────────────
  function renderDividends() {
    $("dividendList").innerHTML = state.dividends.length
      ? state.dividends.map((d, i) => `<div class="dividend-row"><div class="d-name"><span class="dot" style="width:8px;height:8px;border-radius:3px;background:${colorFor(i)}"></span>${escapeHTML(d.symbol)}</div><div style="font-size:12px;font-weight:800;color:var(--muted);">${usd(d.amount)}</div></div>`).join("")
      : `<div class="asset-empty">ยังไม่มีรายการปันผล</div>`;
    $("dividendTotal").textContent = usd(dividendTotalUSD());
  }
  function renderRecent() {
    const income = [...state.transactions].filter((t) => t.type === "income").sort((a, b) => b.date.localeCompare(a.date)).slice(0, 6);
    const expense = [...state.transactions].filter((t) => t.type === "expense").sort((a, b) => b.date.localeCompare(a.date)).slice(0, 6);
    const rowHTML = (t, cls) => `<div class="recent-row"><span><span class="r-label" style="display:block;">${escapeHTML(t.note || "-")}</span><span class="r-date">${t.date}</span></span><span class="r-amt" style="color:var(--${cls})">${cls === "green" ? "+" : "-"}${nf.format(t.amount)}</span></div>`;
    $("recentIncome").innerHTML = income.length ? income.map((t) => rowHTML(t, "green")).join("") : `<div class="asset-empty">ยังไม่มีรายการ</div>`;
    $("recentExpense").innerHTML = expense.length ? expense.map((t) => rowHTML(t, "red")).join("") : `<div class="asset-empty">ยังไม่มีรายการ</div>`;
  }

  function renderAll() {
    applySettings();
    renderKPIs();
    renderMonthSelect();
    renderCashflow();
    renderPortfolioLegend();
    renderGoals();
    renderAssetTable();
    renderMonthly();
    renderExpenseLegend();
    renderDividends();
    renderRecent();
  }

  // ───────────────────────── entry modal (income/expense) ─────────────────────────
  function openEntry(mode, editId) {
    state.modalMode = mode;
    state.editingTransactionId = editId || null;
    const modal = $("entryModal");
    modal.classList.toggle("expense-mode", mode === "expense");
    $("entryIcon").textContent = mode === "income" ? "฿" : "−";
    $("entryTitle").textContent = editId ? "แก้ไขรายการ" : mode === "income" ? "เพิ่มรายการรายรับ" : "เพิ่มรายการรายจ่าย";
    $("entrySubtitle").textContent = mode === "income" ? "บันทึกรายรับของคุณ" : "บันทึกรายจ่ายของคุณ";
    $("entrySubmit").textContent = editId ? "บันทึกการแก้ไข" : mode === "income" ? "บันทึกรายรับ" : "บันทึกรายจ่าย";

    const existing = editId ? state.transactions.find((t) => t.id === editId) : null;
    $("entryAmount").value = existing ? existing.amount : "";
    $("entryDate").value = existing ? existing.date : todayISO();
    $("entryNote").value = existing ? existing.note : "";
    state.selectedCategoryId = existing ? existing.categoryId : (state.categories[mode][0] || {}).id;
    renderCategoryGrid();
    $("entryOverlay").hidden = false;
  }
  function closeEntry() {
    $("entryOverlay").hidden = true;
    state.editingTransactionId = null;
  }
  function renderCategoryGrid() {
    const cats = state.categories[state.modalMode] || [];
    $("categoryGrid").innerHTML = cats.map((c) => `<button type="button" class="category-chip${c.id === state.selectedCategoryId ? " active" : ""}" data-cat="${c.id}">${escapeHTML(c.name)}</button>`).join("");
    document.querySelectorAll("#categoryGrid .category-chip").forEach((chip) => on(chip, "click", () => {
      state.selectedCategoryId = chip.dataset.cat;
      renderCategoryGrid();
    }));
  }
  function submitEntry(e) {
    e.preventDefault();
    const amount = Number($("entryAmount").value);
    if (!amount || amount <= 0) return showToast("กรอกจำนวนเงินให้ถูกต้อง");
    const date = $("entryDate").value || todayISO();
    const note = $("entryNote").value.trim();
    if (state.editingTransactionId) {
      const tx = state.transactions.find((t) => t.id === state.editingTransactionId);
      if (tx) Object.assign(tx, { amount, date, note, categoryId: state.selectedCategoryId, type: state.modalMode });
    } else {
      state.transactions.unshift({ id: uid("tx"), type: state.modalMode, date, categoryId: state.selectedCategoryId, note, amount });
    }
    persist("transactions");
    renderAll();
    closeEntry();
    showToast("บันทึกรายการแล้ว");
  }

  // ───────────────────────── asset tx modal ─────────────────────────
  function openAssetTx(symbol) {
    state.selectedAssetSymbol = symbol || "";
    renderAssetTxPicker();
    const h = state.holdings.find((x) => x.symbol === symbol);
    $("assetTxSymbol").value = h ? h.symbol : "";
    $("assetTxType").value = h ? h.type : "stocks";
    $("assetTxDate").value = todayISO();
    $("assetTxQty").value = "";
    $("assetTxPrice").value = h ? h.price : "";
    updateAssetTxTotal();
    $("assetTxOverlay").hidden = false;
  }
  function closeAssetTx() { $("assetTxOverlay").hidden = true; }
  function renderAssetTxPicker() {
    $("assetTxPicker").innerHTML = state.holdings.map((h) => `<button type="button" class="category-chip${h.symbol === state.selectedAssetSymbol ? " active" : ""}" data-sym="${escapeHTML(h.symbol)}">${escapeHTML(h.symbol)}</button>`).join("")
      || `<div class="ledger-empty">ยังไม่มีสินทรัพย์ — พิมพ์สัญลักษณ์ใหม่ด้านล่าง</div>`;
    document.querySelectorAll("#assetTxPicker .category-chip").forEach((chip) => on(chip, "click", () => {
      const h = state.holdings.find((x) => x.symbol === chip.dataset.sym);
      state.selectedAssetSymbol = chip.dataset.sym;
      $("assetTxSymbol").value = h.symbol;
      $("assetTxType").value = h.type;
      $("assetTxPrice").value = h.price;
      renderAssetTxPicker();
      updateAssetTxTotal();
    }));
  }
  function updateAssetTxTotal() {
    const qty = Number($("assetTxQty").value) || 0;
    const price = Number($("assetTxPrice").value) || 0;
    $("assetTxTotal").textContent = money(qty * price);
  }
  function submitAssetTx(e) {
    e.preventDefault();
    const symbol = $("assetTxSymbol").value.trim().toUpperCase();
    if (!symbol) return showToast("กรอกสัญลักษณ์สินทรัพย์");
    const type = $("assetTxType").value;
    const kind = $("assetTxKind").value;
    const qty = Number($("assetTxQty").value);
    const price = Number($("assetTxPrice").value);
    if (!qty || qty <= 0 || !price || price <= 0) return showToast("กรอกจำนวนและราคาให้ถูกต้อง");
    const signedQty = kind === "sell" ? -qty : qty;
    let h = state.holdings.find((x) => x.symbol === symbol);
    if (!h) {
      if (kind === "sell") return showToast("ไม่พบสินทรัพย์นี้ในพอร์ต");
      h = { symbol, name: symbol, type, qty: 0, costAvg: price, price };
      state.holdings.push(h);
    }
    const oldQty = h.qty;
    const newQty = Math.max(0, oldQty + signedQty);
    if (kind === "buy") {
      h.costAvg = ((oldQty * h.costAvg) + (qty * price)) / Math.max(newQty, 0.00000001);
    }
    h.qty = newQty;
    h.price = price;
    if (h.qty <= 0) state.holdings = state.holdings.filter((x) => x !== h);
    persist("holdings");
    renderAll();
    closeAssetTx();
    showToast("บันทึกธุรกรรมแล้ว");
  }

  // ───────────────────────── goal modal ─────────────────────────
  function openGoalManager() {
    state.editingGoalId = null;
    renderGoalManagerList();
    resetGoalForm();
    $("goalOverlay").hidden = false;
  }
  function closeGoalManager() { $("goalOverlay").hidden = true; }
  function renderGoalManagerList() {
    $("goalManagerList").innerHTML = state.goals.length
      ? state.goals.map((g) => `<div class="manager-item"><span>${escapeHTML(g.name)}</span><button type="button" data-edit="${g.id}">แก้ไข</button></div>`).join("")
      : `<div class="ledger-empty">ยังไม่มีเป้าหมาย</div>`;
    document.querySelectorAll("#goalManagerList [data-edit]").forEach((btn) => on(btn, "click", () => fillGoalForm(btn.dataset.edit)));
  }
  function renderGoalIconGrid() {
    $("goalIconGrid").innerHTML = GOAL_TAGS.map((t) => `<button type="button" class="icon-opt${t === state.selectedGoalTag ? " active" : ""}" data-tag="${t}" style="font-size:11px;">${t}</button>`).join("");
    document.querySelectorAll("#goalIconGrid .icon-opt").forEach((btn) => on(btn, "click", () => { state.selectedGoalTag = btn.dataset.tag; renderGoalIconGrid(); }));
  }
  function resetGoalForm() {
    state.editingGoalId = null;
    $("goalName").value = "";
    $("goalTarget").value = "";
    $("goalCurrent").value = "";
    state.selectedGoalTag = GOAL_TAGS[0];
    renderGoalIconGrid();
  }
  function fillGoalForm(id) {
    const g = state.goals.find((x) => x.id === id);
    if (!g) return;
    state.editingGoalId = id;
    $("goalName").value = g.name;
    $("goalTarget").value = g.target;
    $("goalCurrent").value = g.current;
    state.selectedGoalTag = g.tag || GOAL_TAGS[0];
    renderGoalIconGrid();
  }
  function submitGoal(e) {
    e.preventDefault();
    const name = $("goalName").value.trim();
    const target = Number($("goalTarget").value);
    const current = Number($("goalCurrent").value) || 0;
    if (!name || !target || target <= 0) return showToast("กรอกชื่อและยอดเป้าหมายให้ถูกต้อง");
    if (state.editingGoalId) {
      const g = state.goals.find((x) => x.id === state.editingGoalId);
      if (g) Object.assign(g, { name, target, current, tag: state.selectedGoalTag });
    } else {
      state.goals.push({ id: uid("goal"), name, target, current, tag: state.selectedGoalTag });
    }
    persist("goals");
    renderGoals();
    renderGoalManagerList();
    resetGoalForm();
    showToast("บันทึกเป้าหมายแล้ว");
  }
  function deleteGoal() {
    if (!state.editingGoalId) return showToast("เลือกเป้าหมายที่ต้องการลบก่อน");
    state.goals = state.goals.filter((g) => g.id !== state.editingGoalId);
    persist("goals");
    renderGoals();
    renderGoalManagerList();
    resetGoalForm();
    showToast("ลบเป้าหมายแล้ว");
  }

  // ───────────────────────── report modal ─────────────────────────
  function openReport() {
    renderReport();
    $("reportOverlay").hidden = false;
  }
  function renderReport() {
    const list = [...state.transactions].filter((t) => state.reportFilter === "all" || t.type === state.reportFilter).sort((a, b) => b.date.localeCompare(a.date));
    const income = sumBy(state.transactions, "income");
    const expense = sumBy(state.transactions, "expense");
    $("reportIncomeTotal").textContent = money(income);
    $("reportExpenseTotal").textContent = money(expense);
    $("reportBalanceTotal").textContent = money(income - expense);
    $("reportList").innerHTML = list.length
      ? list.map((t) => `<div class="report-row"><div><div style="font-weight:800;font-size:12.5px;">${escapeHTML(t.note || "-")}</div><div class="rr-cat">${t.date} · ${escapeHTML((state.categories[t.type] || []).find((c) => c.id === t.categoryId)?.name || "-")}</div></div><div class="rr-amt ${t.type}">${t.type === "income" ? "+" : "-"}${nf.format(t.amount)}</div><button type="button" data-del="${t.id}" title="ลบ">✕</button></div>`).join("")
      : `<div class="ledger-empty">ไม่มีรายการ</div>`;
    document.querySelectorAll("#reportList [data-del]").forEach((btn) => on(btn, "click", () => {
      state.transactions = state.transactions.filter((t) => t.id !== btn.dataset.del);
      persist("transactions");
      renderAll();
      renderReport();
      showToast("ลบรายการแล้ว");
    }));
  }

  // ───────────────────────── settings modal ─────────────────────────
  let settingsDraft = null;
  function openSettings() {
    settingsDraft = { ...state.settings };
    $("settingsAppName").value = settingsDraft.appName;
    $("settingsSubtitle").value = settingsDraft.subtitle;
    $("settingsUserName").value = settingsDraft.userName;
    $("settingsUserEmail").value = settingsDraft.userEmail;
    document.querySelectorAll('input[name="settingsTheme"]').forEach((r) => { r.checked = r.value === settingsDraft.theme; });
    document.querySelectorAll(".theme-opt").forEach((el) => el.classList.toggle("selected", el.dataset.themeOpt === settingsDraft.theme));
    renderSettingsPreview();
    $("settingsOverlay").hidden = false;
  }
  function closeSettings() { $("settingsOverlay").hidden = true; }
  function renderSettingsPreview() {
    const s = settingsDraft || state.settings;
    $("settingsPreviewLogo").innerHTML = s.logoImage ? `<img src="${escapeHTML(s.logoImage)}" alt="">` : "SF";
    $("settingsPreviewName").textContent = s.appName;
    $("settingsPreviewSubtitle").textContent = s.subtitle;
    $("settingsPreviewAvatar").innerHTML = s.avatarImage ? `<img src="${escapeHTML(s.avatarImage)}" alt="">` : "";
  }
  function readImage(input, field) {
    const file = input.files && input.files[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) return showToast("เลือกไฟล์รูปภาพเท่านั้น");
    if (file.size > 2_000_000) return showToast("รูปต้องไม่เกิน 2MB");
    const reader = new FileReader();
    reader.onload = () => { settingsDraft[field] = String(reader.result || ""); renderSettingsPreview(); };
    reader.readAsDataURL(file);
  }
  function submitSettings(e) {
    e.preventDefault();
    settingsDraft.appName = $("settingsAppName").value.trim() || defaultSettings.appName;
    settingsDraft.subtitle = $("settingsSubtitle").value.trim() || defaultSettings.subtitle;
    settingsDraft.userName = $("settingsUserName").value.trim() || defaultSettings.userName;
    settingsDraft.userEmail = $("settingsUserEmail").value.trim() || defaultSettings.userEmail;
    settingsDraft.theme = (document.querySelector('input[name="settingsTheme"]:checked') || {}).value || "dark";
    state.settings = { ...settingsDraft };
    persist("settings");
    applySettings();
    closeSettings();
    showToast("บันทึกตั้งค่าแล้ว");
  }

  // ───────────────────────── modal shared wiring ─────────────────────────
  function wireModals() {
    on($("entryClose"), "click", closeEntry);
    on($("entryCancel"), "click", closeEntry);
    on($("entryForm"), "submit", submitEntry);
    on($("entryOverlay"), "click", (e) => { if (e.target.id === "entryOverlay") closeEntry(); });

    on($("assetTxClose"), "click", closeAssetTx);
    on($("assetTxCancel"), "click", closeAssetTx);
    on($("assetTxForm"), "submit", submitAssetTx);
    on($("assetTxQty"), "input", updateAssetTxTotal);
    on($("assetTxPrice"), "input", updateAssetTxTotal);
    on($("assetTxOverlay"), "click", (e) => { if (e.target.id === "assetTxOverlay") closeAssetTx(); });

    on($("goalClose"), "click", closeGoalManager);
    on($("goalCancel"), "click", closeGoalManager);
    on($("goalForm"), "submit", submitGoal);
    on($("goalNewBtn"), "click", resetGoalForm);
    on($("goalDeleteBtn"), "click", deleteGoal);
    on($("goalOverlay"), "click", (e) => { if (e.target.id === "goalOverlay") closeGoalManager(); });

    on($("reportClose"), "click", () => { $("reportOverlay").hidden = true; });
    on($("reportOverlay"), "click", (e) => { if (e.target.id === "reportOverlay") $("reportOverlay").hidden = true; });
    document.querySelectorAll("#reportFilters button").forEach((btn) => on(btn, "click", () => {
      document.querySelectorAll("#reportFilters button").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      state.reportFilter = btn.dataset.filter;
      renderReport();
    }));

    on($("settingsClose"), "click", closeSettings);
    on($("settingsCancel"), "click", closeSettings);
    on($("settingsForm"), "submit", submitSettings);
    on($("settingsLogoFile"), "change", (e) => readImage(e.target, "logoImage"));
    on($("settingsAvatarFile"), "change", (e) => readImage(e.target, "avatarImage"));
    on($("settingsResetMedia"), "click", () => { settingsDraft.logoImage = ""; settingsDraft.avatarImage = ""; $("settingsLogoFile").value = ""; $("settingsAvatarFile").value = ""; renderSettingsPreview(); });
    on($("settingsOverlay"), "click", (e) => { if (e.target.id === "settingsOverlay") closeSettings(); });
    document.querySelectorAll(".theme-opt").forEach((el) => on(el, "click", () => {
      const val = el.dataset.themeOpt;
      settingsDraft.theme = val;
      document.querySelectorAll(".theme-opt").forEach((o) => o.classList.toggle("selected", o === el));
      document.querySelector(`input[name="settingsTheme"][value="${val}"]`).checked = true;
    }));

    on($("monthSelect"), "change", (e) => { state.selectedMonth = e.target.value; renderCashflow(); renderExpenseLegend(); });
    on($("addDividendBtn"), "click", () => {
      const symbol = prompt("สัญลักษณ์หุ้น/สินทรัพย์ (เช่น NVDA)");
      if (!symbol) return;
      const amount = Number(prompt("จำนวนเงินปันผล (USD)"));
      if (!amount || amount <= 0) return showToast("กรอกจำนวนเงินให้ถูกต้อง");
      state.dividends.push({ id: uid("div"), symbol: symbol.toUpperCase(), amount });
      persist("dividends");
      renderDividends();
      showToast("เพิ่มรายการปันผลแล้ว");
    });

    document.querySelectorAll("[data-action]").forEach((el) => on(el, "click", () => {
      const action = el.dataset.action;
      if (action === "addIncome") openEntry("income");
      else if (action === "addExpense") openEntry("expense");
      else if (action === "openAssetTx") openAssetTx("");
      else if (action === "openGoals") openGoalManager();
      else if (action === "openReport") openReport();
      else if (action === "openSettings") openSettings();
      else if (action === "scrollTop") window.scrollTo({ top: 0, behavior: "smooth" });
      document.querySelectorAll("#sideMenu button").forEach((b) => b.classList.toggle("active", b === el));
    }));
    on($("openSettingsBtn"), "click", openSettings);

    document.querySelectorAll("#assetFilters .filter-pill").forEach((btn) => on(btn, "click", () => {
      document.querySelectorAll("#assetFilters .filter-pill").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      state.assetFilter = btn.dataset.filter;
      renderAssetTable();
    }));

    on($("refreshPricesBtn"), "click", refreshLivePrices);
  }

  // ───────────────────────── live prices (Cloudflare Worker) ─────────────────────────
  function apiBase() {
    return ((window.AUTH_CONFIG && window.AUTH_CONFIG.apiUrl) || "").replace(/\/$/, "");
  }
  async function fetchJson(url, opts) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 9000);
    try {
      const res = await fetch(url, { ...(opts || {}), signal: controller.signal });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } finally { clearTimeout(timer); }
  }
  async function refreshLivePrices() {
    const base = apiBase();
    if (!base) return showToast("ยังไม่ได้ตั้งค่า Worker API URL");
    const btn = $("refreshPricesBtn");
    btn.textContent = "…";
    try {
      const cryptoSymbols = state.holdings.filter((h) => h.type === "crypto").map((h) => h.symbol);
      const stockSymbols = state.holdings.filter((h) => h.type !== "crypto").map((h) => h.symbol);
      const [cryptoRes, stockRes, fxRes] = await Promise.allSettled([
        cryptoSymbols.length ? fetchJson(`${base}/api/prices/crypto?symbols=${encodeURIComponent(cryptoSymbols.join(","))}`) : Promise.resolve({}),
        stockSymbols.length ? fetchJson(`${base}/api/prices/stocks?symbols=${encodeURIComponent(stockSymbols.join(","))}`) : Promise.resolve({}),
        fetchJson(`${base}/api/prices/fx?from=USD&to=THB`),
      ]);
      const cryptoPrices = cryptoRes.status === "fulfilled" ? (cryptoRes.value.prices || cryptoRes.value || {}) : {};
      const stockPrices = stockRes.status === "fulfilled" ? (stockRes.value.prices || stockRes.value || {}) : {};
      const fx = fxRes.status === "fulfilled" ? Number(fxRes.value.rate || fxRes.value.price || fxRes.value.value || state.fx) : state.fx;
      state.fx = Number.isFinite(fx) && fx > 0 ? fx : state.fx;
      let touched = false;
      state.holdings.forEach((h) => {
        const src = h.type === "crypto" ? cryptoPrices : stockPrices;
        const raw = src[h.symbol] ?? src[`${h.symbol}-USD`];
        const usdPrice = typeof raw === "number" ? raw : raw && (raw.price ?? raw.value ?? raw.last);
        if (typeof usdPrice === "number" && usdPrice > 0) {
          h.price = usdPrice * state.fx;
          touched = true;
        }
      });
      if (touched) {
        persist("holdings");
        renderAll();
        showToast("อัปเดตราคาล่าสุดแล้ว");
      } else {
        showToast("ดึงราคาไม่สำเร็จ — อาจต้องเปิดจากโดเมนจริงของเว็บ");
      }
    } catch (err) {
      console.warn("refreshLivePrices failed", err);
      showToast("ดึงราคาไม่สำเร็จ — อาจต้องเปิดจากโดเมนจริงของเว็บ");
    } finally {
      btn.textContent = "⟳";
    }
  }

  // ───────────────────────── Google sign-in + Worker sync ─────────────────────────
  let googleClientId = "";
  let cloudPushTimer = null;
  function scheduleCloudPush() {
    if (!state.auth) return;
    clearTimeout(cloudPushTimer);
    cloudPushTimer = setTimeout(pushCloudPortfolio, 1200);
  }
  function serializeSnapshot() {
    return {
      holdings: state.holdings,
      transactions: state.transactions,
      goals: state.goals,
      dividends: state.dividends,
      categories: state.categories,
      settings: state.settings,
      fx: state.fx,
    };
  }
  async function authFetch(path, opts) {
    const base = apiBase();
    if (!base) throw new Error("Auth API is not configured");
    const headers = { ...((opts && opts.headers) || {}) };
    if (state.auth && state.auth.token) headers.Authorization = `Bearer ${state.auth.token}`;
    if (opts && opts.body && !headers["Content-Type"]) headers["Content-Type"] = "application/json";
    const res = await fetch(base + path, { ...(opts || {}), headers });
    if (!res.ok) throw new Error(await res.text().catch(() => `HTTP ${res.status}`));
    return res.json();
  }
  async function pushCloudPortfolio() {
    if (!state.auth) return;
    try {
      await authFetch("/api/portfolio", { method: "PUT", body: JSON.stringify(serializeSnapshot()) });
    } catch (err) { console.warn("cloud push failed", err); }
  }
  async function pullCloudPortfolio() {
    try {
      const snap = await authFetch("/api/portfolio");
      if (snap && Object.keys(snap).length) {
        if (Array.isArray(snap.holdings)) state.holdings = snap.holdings;
        if (Array.isArray(snap.transactions)) state.transactions = snap.transactions;
        if (Array.isArray(snap.goals)) state.goals = snap.goals;
        if (Array.isArray(snap.dividends)) state.dividends = snap.dividends;
        if (snap.categories) state.categories = snap.categories;
        if (snap.settings) state.settings = { ...defaultSettings, ...snap.settings };
        if (snap.fx) state.fx = snap.fx;
        persist();
        renderAll();
        showToast("ซิงก์ข้อมูลจากบัญชี Google แล้ว");
      } else {
        await pushCloudPortfolio();
      }
    } catch (err) {
      console.warn("cloud pull failed", err);
    }
  }
  function renderAuthArea() {
    const el = $("authArea");
    if (state.auth && state.auth.user) {
      const u = state.auth.user;
      el.innerHTML = `<button type="button" class="google-btn" id="signOutBtn" title="ออกจากระบบ">${u.picture ? `<img src="${escapeHTML(u.picture)}" alt="">` : ""}<span>${escapeHTML(u.name || u.email || "บัญชี Google")}</span></button>`;
      on($("signOutBtn"), "click", signOut);
    } else {
      el.innerHTML = `<div id="googleBtnWrap"></div>`;
      tryRenderGoogleButton();
    }
  }
  async function resolveGoogleClientId() {
    const base = apiBase();
    if (!base) return "";
    if (googleClientId) return googleClientId;
    try {
      const data = await fetchJson(`${base}/api/auth/config`);
      googleClientId = data.googleClientId || "";
    } catch (err) { console.warn("cannot resolve google client id", err); }
    return googleClientId;
  }
  let googleRetryTimer = null;
  async function tryRenderGoogleButton() {
    const wrap = $("googleBtnWrap");
    if (!wrap) return;
    const clientId = await resolveGoogleClientId();
    if (!clientId) return; // Worker not configured for auth; silently skip (dashboard still works locally)
    const attempt = () => {
      if (!window.google || !window.google.accounts || !window.google.accounts.id) {
        googleRetryTimer = setTimeout(attempt, 200);
        return;
      }
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: async (response) => {
          try {
            const data = await authFetch("/api/auth/google", { method: "POST", body: JSON.stringify({ credential: response.credential }) });
            state.auth = data;
            save(keys.auth, data);
            renderAuthArea();
            showToast("เข้าสู่ระบบสำเร็จ");
            await pullCloudPortfolio();
          } catch (err) {
            console.warn("google sign-in failed", err);
            showToast("เข้าสู่ระบบไม่สำเร็จ");
          }
        },
      });
      window.google.accounts.id.renderButton(wrap, { theme: "outline", size: "medium", type: "standard", text: "signin_with", shape: "pill", width: 200 });
    };
    attempt();
  }
  async function signOut() {
    try { await authFetch("/api/auth/logout", { method: "POST" }); } catch (_) {}
    state.auth = null;
    save(keys.auth, null);
    renderAuthArea();
    showToast("ออกจากระบบแล้ว");
  }

  // ───────────────────────── init ─────────────────────────
  function init() {
    wireModals();
    renderAll();
    renderAuthArea();
    if (state.auth) pullCloudPortfolio();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
