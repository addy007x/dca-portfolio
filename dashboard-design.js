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
  const storageKeys = {
    transactions: "siamfolio.dashboard.transactions.v1",
    categories: "siamfolio.dashboard.categories.v1"
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
  const monthBaseline = [
    { key: "2026-01", label: "ม.ค. 2026", income: 38000, expense: 15500 },
    { key: "2026-02", label: "ก.พ. 2026", income: 40000, expense: 19800 },
    { key: "2026-03", label: "มี.ค. 2026", income: 40000, expense: 22000 },
    { key: "2026-04", label: "เม.ย. 2026", income: 45000, expense: 20000 },
    { key: "2026-05", label: "พ.ค. 2026", income: 50000, expense: 23000 },
    { key: "2026-06", label: "มิ.ย. 2026", income: 0, expense: 0 }
  ];

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
    target.innerHTML = assets.map(asset => `
      <div class="allocation-row" style="--dot:${asset.color}">
        <span></span>
        <b>${asset.symbol}</b>
        <i><b style="width:${asset.share * 4}%"></b></i>
        <em>${asset.share}%</em>
      </div>
    `).join("");
  }

  function renderAssets() {
    const target = document.getElementById("assetTable");
    if (!target) return;
    target.innerHTML = assets.map(asset => `
      <div class="asset-row">
        <span class="asset-dot" style="--dot:${asset.color}">${asset.symbol.slice(0, 1)}</span>
        <div><strong>${asset.name}</strong><small>${asset.symbol}</small></div>
        <b>${shortTHB(asset.value)}</b>
        <em>+${shortTHB(asset.pnl)}</em>
        <strong class="gain">+${asset.pct.toFixed(2)}%</strong>
      </div>
    `).join("");
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

  function openEntryModal(type) {
    modalMode = type;
    selectedCategoryId = (categories[type] || [])[0]?.id || "";
    const overlay = document.getElementById("entryOverlay");
    const modal = document.getElementById("entryModal");
    const title = document.getElementById("entryModalTitle");
    const subtitle = document.getElementById("entryModalSubtitle");
    const amount = document.getElementById("entryAmount");
    const date = document.getElementById("entryDate");
    const note = document.getElementById("entryNote");
    const submit = document.getElementById("entrySubmit");
    const manage = document.getElementById("categoryManager");
    const headIcon = modal?.querySelector(".entry-head-icon i");

    modal?.classList.toggle("expense-mode", type === "expense");
    if (title) title.textContent = type === "income" ? "เพิ่มรายการรายรับ" : "เพิ่มรายการรายจ่าย";
    if (subtitle) subtitle.textContent = type === "income" ? "บันทึกรายรับของคุณ" : "บันทึกรายจ่ายของคุณ";
    if (submit) submit.innerHTML = `<i data-lucide="save"></i>${type === "income" ? "บันทึกรายรับ" : "บันทึกรายจ่าย"}`;
    if (headIcon) headIcon.setAttribute("data-lucide", type === "income" ? "wallet-cards" : "credit-card");
    if (amount) amount.value = "";
    if (date) date.value = todayISO();
    if (note) note.value = "";
    if (manage) manage.hidden = true;

    renderCategoryGrid();
    renderCategoryList();
    if (overlay) overlay.hidden = false;
    refreshModalIcons();
    setTimeout(() => amount?.focus(), 60);
  }

  function closeEntryModal() {
    const overlay = document.getElementById("entryOverlay");
    if (overlay) overlay.hidden = true;
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
    const amount = Number(document.getElementById("entryAmount")?.value || 0);
    const date = document.getElementById("entryDate")?.value;
    const note = document.getElementById("entryNote")?.value.trim();
    if (!amount || amount <= 0) return showToast("กรุณาใส่จำนวนเงิน");
    if (!date) return showToast("กรุณาเลือกวันที่");
    if (!selectedCategoryId) return showToast("กรุณาเลือกหมวดหมู่");

    transactions.unshift({
      id: `${modalMode}-${Date.now()}`,
      type: modalMode,
      date,
      categoryId: selectedCategoryId,
      note: note || getCategory(modalMode, selectedCategoryId).name,
      amount
    });
    saveTransactions();
    renderDashboardData();
    closeEntryModal();
    showToast(modalMode === "income" ? "บันทึกรายรับแล้ว" : "บันทึกรายจ่ายแล้ว");
  }

  function renderDashboardData() {
    const cashPanelTitle = document.querySelector(".income-expense-panel .panel-head h2");
    const cashPanelSubtitle = document.querySelector(".income-expense-panel .panel-head p");
    if (cashPanelTitle) cashPanelTitle.textContent = "สรุปรายรับ-รายจ่าย";
    if (cashPanelSubtitle) cashPanelSubtitle.textContent = "กระแสเงินสดและเงินคงเหลือรายเดือน";
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
        showToast(`เลือก ${item.dataset.section || item.textContent.trim()}`);
      });
    });

    document.getElementById("entryClose")?.addEventListener("click", closeEntryModal);
    document.getElementById("entryCancel")?.addEventListener("click", closeEntryModal);
    document.getElementById("entryForm")?.addEventListener("submit", submitEntry);
    document.getElementById("categoryManageToggle")?.addEventListener("click", () => {
      const manager = document.getElementById("categoryManager");
      if (manager) manager.hidden = !manager.hidden;
      renderCategoryList();
      refreshModalIcons();
    });
    document.getElementById("addCategoryBtn")?.addEventListener("click", addCategory);
    document.getElementById("categoryName")?.addEventListener("keydown", event => {
      if (event.key === "Enter") {
        event.preventDefault();
        addCategory();
      }
    });
    document.getElementById("categoryGrid")?.addEventListener("click", event => {
      const button = event.target.closest("[data-category-id]");
      if (!button) return;
      selectedCategoryId = button.dataset.categoryId;
      renderCategoryGrid();
      refreshModalIcons();
    });
    document.getElementById("categoryList")?.addEventListener("click", event => {
      const button = event.target.closest("[data-delete-category]");
      if (!button || button.disabled) return;
      deleteCategory(button.dataset.deleteCategory);
    });
    document.getElementById("entryOverlay")?.addEventListener("click", event => {
      if (event.target.id === "entryOverlay") closeEntryModal();
    });
    document.addEventListener("keydown", event => {
      if (event.key === "Escape") closeEntryModal();
    });
  }

  function init() {
    updateClock();
    window.setInterval(updateClock, 1000);
    renderPortfolioLegend();
    renderAssets();
    renderGoals();
    renderDividends();
    renderExpenseLegend();
    renderDashboardData();
    bindActions();
    if (window.lucide) window.lucide.createIcons();
    if (window.location.hash === "#income" || window.location.hash === "#expense") {
      const type = window.location.hash === "#income" ? "income" : "expense";
      document.querySelectorAll(".side-menu a").forEach(link => {
        link.classList.toggle("active", link.getAttribute("href") === window.location.hash);
      });
      window.setTimeout(() => openEntryModal(type), 120);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
