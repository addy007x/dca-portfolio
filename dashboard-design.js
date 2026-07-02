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
  const PRICE_REFRESH_MS = 60 * 1000;
  const PRICE_API_FALLBACK = "https://siamfolio-api.kingbooms5678.workers.dev";

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
    goals: "siamfolio.dashboard.goals.v1",
    dividends: "siamfolio.dashboard.dividends.v1",
    dividendFundamentals: "siamfolio.dashboard.dividendFundamentals.v1",
    earnIncomeRecords: "siamfolio.dashboard.earnIncomeRecords.v1",
    liveQuotes: "siamfolio.dashboard.liveQuotes.v1",
    appSettings: "siamfolio.dashboard.appSettings.v1",
    authSession: "siamfolio.googleSession",
    legacyBackend: "siamfolio.backend",
    databaseMode: "siamfolio.databaseMode"
  };

  const defaultAppSettings = {
    appName: "SiamFolio Prime",
    subtitle: "แดชบอร์ดการเงินและพอร์ตลงทุน",
    userName: "APISIT TIAKHAM",
    userEmail: "HONGAME5678@GMAIL.COM",
    theme: "dark",
    logoImage: "",
    avatarImage: ""
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

  const goalIconChoices = [
    "home", "shield-plus", "chart-no-axes-combined", "piggy-bank", "target", "trophy",
    "car", "plane", "graduation-cap", "gem", "heart-pulse", "briefcase-business"
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
  let financialGoals = loadFinancialGoals();
  let editingGoalId = null;
  let selectedGoalIcon = "target";
  let dividendRecords = loadDividendRecords();
  let dividendFundamentals = loadDividendFundamentals();
  let earnIncomeRecords = loadEarnIncomeRecords();
  let appSettings = loadAppSettings();
  let settingsDraft = null;
  let dividendRefreshBusy = false;
  let lastDividendRefreshAt = 0;
  let liveQuotes = loadLiveQuotes();
  let liveQuoteBusy = false;
  let lastQuoteRefreshAt = 0;
  let portfolioPriceBusy = false;
  let lastPortfolioRefreshAt = 0;
  let selectedCashMonth = "";
  let analyticsMode = "month";
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
      if (Array.isArray(saved)) {
        return saved.map(item => ({
          ...item,
          amount: Number.isFinite(Number(item?.amount)) ? Number(item.amount) : 0
        }));
      }
    } catch (error) {
      console.warn("Cannot load transactions", error);
    }
    return [...seedTransactions];
  }

  function saveTransactions() {
    localStorage.setItem(storageKeys.transactions, JSON.stringify(transactions));
  }

  function loadEarnIncomeRecords() {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKeys.earnIncomeRecords));
      if (saved && typeof saved === "object" && !Array.isArray(saved)) return saved;
    } catch (error) {
      console.warn("Cannot load earn income records", error);
    }
    return {};
  }

  function saveEarnIncomeRecords() {
    localStorage.setItem(storageKeys.earnIncomeRecords, JSON.stringify(earnIncomeRecords));
  }

  function loadAppSettings() {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKeys.appSettings));
      if (saved && typeof saved === "object") return { ...defaultAppSettings, ...saved };
    } catch (error) {
      console.warn("Cannot load app settings", error);
    }
    return { ...defaultAppSettings };
  }

  function saveAppSettings() {
    localStorage.setItem(storageKeys.appSettings, JSON.stringify(appSettings));
  }

  function imageOrTextHTML(image, fallback, alt = "") {
    return image
      ? `<img src="${escapeHTML(image)}" alt="${escapeHTML(alt)}">`
      : escapeHTML(fallback);
  }

  function applyAppSettings(settings = appSettings) {
    const next = { ...defaultAppSettings, ...settings };
    document.body.dataset.theme = next.theme === "light" ? "light" : "dark";
    document.title = `${next.appName} Dashboard`;

    document.querySelectorAll(".brand-emblem").forEach(target => {
      target.innerHTML = imageOrTextHTML(next.logoImage, "SF", next.appName);
    });
    document.querySelectorAll(".brand strong").forEach(target => {
      target.textContent = next.appName;
    });
    document.querySelectorAll(".brand small").forEach(target => {
      target.textContent = next.subtitle;
    });

    const profileAvatar = document.querySelector(".profile-avatar");
    if (profileAvatar) {
      profileAvatar.innerHTML = `<img src="${escapeHTML(next.avatarImage || "assets/manga-dashboard-scene.webp")}" alt="">`;
    }
    const profileName = document.querySelector(".profile-card h1");
    const profileEmail = document.querySelector(".profile-card p");
    if (profileName) profileName.textContent = next.userName;
    if (profileEmail) profileEmail.textContent = next.userEmail;
    renderSettingsPreview(next);
  }

  function renderSettingsPreview(settings = settingsDraft || appSettings) {
    const next = { ...defaultAppSettings, ...settings };
    const logo = document.getElementById("settingsPreviewLogo");
    const avatar = document.getElementById("settingsPreviewAvatar");
    const name = document.getElementById("settingsPreviewName");
    const subtitle = document.getElementById("settingsPreviewSubtitle");
    if (logo) logo.innerHTML = imageOrTextHTML(next.logoImage, "SF", next.appName);
    if (avatar) avatar.innerHTML = `<img src="${escapeHTML(next.avatarImage || "assets/manga-dashboard-scene.webp")}" alt="">`;
    if (name) name.textContent = next.appName;
    if (subtitle) subtitle.textContent = next.subtitle;
  }

  function fillSettingsForm() {
    settingsDraft = { ...defaultAppSettings, ...appSettings };
    const fields = {
      settingsAppName: settingsDraft.appName,
      settingsSubtitle: settingsDraft.subtitle,
      settingsUserName: settingsDraft.userName,
      settingsUserEmail: settingsDraft.userEmail
    };
    Object.entries(fields).forEach(([id, value]) => {
      const input = document.getElementById(id);
      if (input) input.value = value || "";
    });
    document.querySelectorAll('input[name="settingsTheme"]').forEach(input => {
      input.checked = input.value === settingsDraft.theme;
    });
    renderSettingsPreview(settingsDraft);
  }

  function updateSettingsDraftFromInputs() {
    if (!settingsDraft) settingsDraft = { ...defaultAppSettings, ...appSettings };
    settingsDraft = {
      ...settingsDraft,
      appName: document.getElementById("settingsAppName")?.value.trim() || defaultAppSettings.appName,
      subtitle: document.getElementById("settingsSubtitle")?.value.trim() || defaultAppSettings.subtitle,
      userName: document.getElementById("settingsUserName")?.value.trim() || defaultAppSettings.userName,
      userEmail: document.getElementById("settingsUserEmail")?.value.trim() || defaultAppSettings.userEmail,
      theme: document.querySelector('input[name="settingsTheme"]:checked')?.value || "dark"
    };
    document.body.dataset.theme = settingsDraft.theme === "light" ? "light" : "dark";
    renderSettingsPreview(settingsDraft);
  }

  function openSettingsModal() {
    const overlay = document.getElementById("settingsOverlay");
    if (!overlay) return;
    fillSettingsForm();
    overlay.hidden = false;
    setTimeout(() => document.getElementById("settingsAppName")?.focus(), 60);
    refreshModalIcons();
  }

  function closeSettingsModal() {
    const overlay = document.getElementById("settingsOverlay");
    if (overlay) overlay.hidden = true;
    settingsDraft = null;
    applyAppSettings(appSettings);
  }

  function readSettingsImage(input, field) {
    const file = input?.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) return showToast("เลือกไฟล์รูปภาพเท่านั้น");
    if (file.size > 2_000_000) return showToast("รูปต้องไม่เกิน 2MB");
    const reader = new FileReader();
    reader.onload = () => {
      if (!settingsDraft) settingsDraft = { ...defaultAppSettings, ...appSettings };
      settingsDraft[field] = String(reader.result || "");
      renderSettingsPreview(settingsDraft);
    };
    reader.readAsDataURL(file);
  }

  function submitSettings(event) {
    event.preventDefault();
    updateSettingsDraftFromInputs();
    appSettings = { ...defaultAppSettings, ...settingsDraft };
    saveAppSettings();
    applyAppSettings();
    closeSettingsModal();
    showToast("บันทึกตั้งค่าแล้ว");
  }

  function resetSettingsMedia() {
    if (!settingsDraft) settingsDraft = { ...defaultAppSettings, ...appSettings };
    settingsDraft.logoImage = "";
    settingsDraft.avatarImage = "";
    const logoInput = document.getElementById("settingsLogoFile");
    const avatarInput = document.getElementById("settingsAvatarFile");
    if (logoInput) logoInput.value = "";
    if (avatarInput) avatarInput.value = "";
    renderSettingsPreview(settingsDraft);
  }

  function portfolioFxRate() {
    const store = loadPortfolioStore();
    return Number(store?.fx || 35.8) || 35.8;
  }

  function defaultFinancialGoals() {
    return [
      { id: "goal-home", icon: "home", name: "บ้านในฝัน", targetValue: 3000000, currentValue: 1350000 },
      { id: "goal-savings", icon: "piggy-bank", name: "เงินออม", targetValue: 200000, currentValue: 0 },
      { id: "goal-portfolio", icon: "chart-no-axes-combined", name: "พอร์ต 1 ล้านบาท", targetValue: 1000000, currentValue: 620000 }
    ];
  }

  function normalizeGoal(goal = {}) {
    const parseMoney = value => Number(String(value || "").replace(/[^\d.-]/g, "")) || 0;
    const targetValue = Number(goal.targetValue) || parseMoney(goal.target) || 0;
    const currentValue = Number(goal.currentValue) || parseMoney(String(goal.current || "").split("/")[0]) || 0;
    const pct = targetValue > 0 ? Math.min(100, Math.max(0, (currentValue / targetValue) * 100)) : Number(goal.pct || 0);
    return {
      id: goal.id || `goal-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
      icon: goal.icon || "target",
      name: goal.name || "เป้าหมายใหม่",
      targetValue,
      currentValue,
      pct
    };
  }

  function loadFinancialGoals() {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKeys.goals));
      if (Array.isArray(saved)) return saved.map(normalizeGoal);
    } catch (error) {
      console.warn("Cannot load financial goals", error);
    }
    return defaultFinancialGoals().map(normalizeGoal);
  }

  function saveFinancialGoals() {
    localStorage.setItem(storageKeys.goals, JSON.stringify(financialGoals.map(normalizeGoal)));
  }

  function dividendColorForTicker(ticker) {
    const symbol = String(ticker || "").toUpperCase();
    const asset = assets.find(item => item.symbol === symbol) || getHeldAssets().find(item => item.symbol === symbol);
    return asset?.color || "#d8b45f";
  }

  function normalizeDividendRecord(record = {}) {
    const ticker = String(record.ticker || record.symbol || record[0] || "").trim().toUpperCase() || "DIV";
    const amount = Number(record.amount ?? record.dividend ?? record[1] ?? 0) || 0;
    const fallbackDate = `${new Date().getFullYear()}-12-31`;
    return {
      id: record.id || `div-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
      ticker,
      amount,
      exDate: record.exDate || record.ex_date || "",
      payDate: record.payDate || record.pay_date || fallbackDate,
      mark: record.mark || record[2] || ticker.slice(0, 1),
      color: record.color || record[3] || dividendColorForTicker(ticker),
      recordedIncomeId: record.recordedIncomeId || ""
    };
  }

  function defaultDividendRecords() {
    const year = new Date().getFullYear();
    return dividends.map(([ticker, amount, mark, color], index) => normalizeDividendRecord({
      ticker,
      amount,
      mark,
      color,
      exDate: `${year}-${String(6 + index).padStart(2, "0")}-12`,
      payDate: `${year}-${String(6 + index).padStart(2, "0")}-26`
    }));
  }

  function loadDividendRecords() {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKeys.dividends));
      if (Array.isArray(saved)) return saved.map(normalizeDividendRecord);
    } catch (error) {
      console.warn("Cannot load dividend records", error);
    }
    return defaultDividendRecords();
  }

  function saveDividendRecords() {
    localStorage.setItem(storageKeys.dividends, JSON.stringify(dividendRecords.map(normalizeDividendRecord)));
  }

  function loadDividendFundamentals() {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKeys.dividendFundamentals));
      return saved && typeof saved === "object" ? saved : {};
    } catch (error) {
      console.warn("Cannot load dividend fundamentals", error);
      return {};
    }
  }

  function saveDividendFundamentals() {
    localStorage.setItem(storageKeys.dividendFundamentals, JSON.stringify(dividendFundamentals || {}));
  }

  function defaultLiveQuotes() {
    return [
      { id: "live-btc", symbol: "BTC", type: "crypto" },
      { id: "live-xaut", symbol: "XAUT", type: "crypto" },
      { id: "live-trx", symbol: "TRX", type: "crypto" },
      { id: "live-sol", symbol: "SOL", type: "crypto" },
      { id: "live-eth", symbol: "ETH", type: "crypto" },
      { id: "live-bnb", symbol: "BNB", type: "crypto" }
    ];
  }

  function normalizeLiveQuote(item = {}) {
    const type = item.type === "crypto" ? "crypto" : "stocks";
    const symbol = String(item.symbol || item.ticker || "")
      .trim()
      .toUpperCase()
      .replace(type === "crypto" ? /-USD$/ : /$/g, "");
    return {
      id: item.id || `live-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
      symbol,
      type,
      price: Number(item.price || 0),
      changePct: Number(item.changePct ?? item.chg1d ?? 0),
      currency: item.currency || (type === "crypto" ? "USD" : "USD"),
      source: item.source || "",
      session: item.session || item.marketState || "",
      error: item.error || "",
      updatedAt: Number(item.updatedAt || 0)
    };
  }

  function loadLiveQuotes() {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKeys.liveQuotes));
      if (Array.isArray(saved)) {
        const rows = saved.map(normalizeLiveQuote).filter(item => item.symbol);
        const key = rows.map(item => `${item.type}:${item.symbol}`).join(",");
        if (key === "crypto:BTC,crypto:TRX,stocks:NVDA,stocks:PTT.BK") {
          return defaultLiveQuotes().map(normalizeLiveQuote);
        }
        return rows;
      }
    } catch (error) {
      console.warn("Cannot load live quotes", error);
    }
    return defaultLiveQuotes().map(normalizeLiveQuote);
  }

  function saveLiveQuotes() {
    localStorage.setItem(storageKeys.liveQuotes, JSON.stringify(liveQuotes.map(normalizeLiveQuote)));
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
          price: Number(asset.price || asset.costAvg || 0),
          ccy: asset.ccy || "USD",
          priceUpdatedAt: Number(asset.priceUpdatedAt || store?.pricesUpdatedAt || 0),
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

  function earnPriceFromPortfolioHoldings(holdings, sym) {
    const symbol = String(sym || "").toUpperCase();
    const holding = (holdings || []).find(asset => String(asset.ticker || asset.symbol || "").toUpperCase() === symbol);
    if (holding) return Number(holding.price || holding.costAvg || 0);
    if (["USDT", "USDC", "BUSD", "DAI", "USD"].includes(symbol)) return 1;
    return 0;
  }

  function earnPositionPrice(position = {}, holdings = []) {
    const ownPrice = Number(position.priceUSD ?? position.price ?? position.lastPrice ?? 0);
    if (Number.isFinite(ownPrice) && ownPrice > 0) return ownPrice;
    return earnPriceFromPortfolioHoldings(holdings, position.sym || position.ticker || position.symbol);
  }

  function secondsSinceBangkokMidnight() {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Bangkok",
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit"
    }).formatToParts(new Date()).reduce((out, part) => ({ ...out, [part.type]: part.value }), {});
    return (Number(parts.hour || 0) * 3600) + (Number(parts.minute || 0) * 60) + Number(parts.second || 0);
  }

  function earnAccruedUSD(position = {}, price = 1) {
    const qty = Number(position.qty || position.amount || 0);
    const apy = Number(position.apy || 0);
    const stored = Number(position.accruedEarnedUSD ?? position.earnedToday ?? 0) || 0;
    if (!qty || !apy || !Number.isFinite(price) || price <= 0) return stored;
    const last = Number(position.accruedEarnedAt || position.earnedUpdatedAt || position.updatedAt || 0);
    const seconds = last > 0 ? Math.max(0, (Date.now() - last) / 1000) : secondsSinceBangkokMidnight();
    return stored + (qty * price * (apy / 100) * (seconds / (365 * 24 * 60 * 60)));
  }

  function getEarnStatsFromStore() {
    const store = loadPortfolioStore();
    if (!store || !Array.isArray(store.earn)) return null;
    const fx = Number(store.fx || 35.8);
    const holdings = Array.isArray(store.holdings) ? store.holdings : [];
    const valueUSD = store.earn.reduce((sum, position) => {
      const qty = Number(position.qty || position.amount || 0);
      if (!qty) return sum;
      const price = earnPositionPrice(position, holdings);
      const principalUSD = qty * Math.max(price, 1);
      const accruedUSD = earnAccruedUSD(position, Math.max(price, 1));
      return sum + principalUSD + accruedUSD;
    }, 0);
    return {
      value: valueUSD * fx,
      count: store.earn.length
    };
  }

  function getEarnInterestStatsFromStore() {
    const store = loadPortfolioStore();
    if (!store || !Array.isArray(store.earn)) return null;
    const fx = Number(store.fx || 35.8);
    const holdings = Array.isArray(store.holdings) ? store.holdings : [];
    const accruedUSD = store.earn.reduce((sum, position) => {
      const qty = Number(position.qty || position.amount || 0);
      if (!qty) return sum;
      const price = earnPositionPrice(position, holdings);
      return sum + earnAccruedUSD(position, Math.max(price, 1));
    }, 0);
    return {
      value: accruedUSD * fx,
      count: store.earn.length
    };
  }

  function earnIncomeSymbol(position = {}) {
    return String(position.sym || position.ticker || position.symbol || "EARN")
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9.-]/g, "") || "EARN";
  }

  function dailyEarnIncomeRows(date = todayISO()) {
    const store = loadPortfolioStore();
    if (!store || !Array.isArray(store.earn) || !store.earn.length) return [];
    const fx = Number(store.fx || 35.8);
    const holdings = Array.isArray(store.holdings) ? store.holdings : [];
    const rows = new Map();
    store.earn.forEach(position => {
      const qty = Number(position.qty || position.amount || 0);
      const apy = Number(position.apy || 0);
      if (!qty || !apy) return;
      const symbol = earnIncomeSymbol(position);
      const price = Math.max(earnPositionPrice(position, holdings), 1);
      const dailyTHB = qty * price * (apy / 100) / 365 * fx;
      if (!Number.isFinite(dailyTHB) || dailyTHB < 0.01) return;
      const current = rows.get(symbol) || { symbol, amount: 0 };
      current.amount += dailyTHB;
      rows.set(symbol, current);
    });
    return Array.from(rows.values()).map(row => ({
      ...row,
      id: `earn-income-${row.symbol}-${date}`,
      date,
      amount: Math.round(row.amount * 100) / 100
    }));
  }

  function recordDailyEarnInterestAsIncome(date = todayISO()) {
    const rows = dailyEarnIncomeRows(date).filter(row => (
      row.amount > 0 &&
      !earnIncomeRecords[row.id] &&
      !transactions.some(tx => tx.id === row.id)
    ));
    if (!rows.length) return false;
    const newTransactions = rows.map(row => ({
      id: row.id,
      type: "income",
      date: row.date,
      categoryId: "invest",
      note: `ดอกเบี้ย Earn ${row.symbol}`,
      amount: row.amount
    }));
    transactions = [...newTransactions, ...transactions];
    rows.forEach(row => {
      earnIncomeRecords[row.id] = {
        symbol: row.symbol,
        date: row.date,
        amount: row.amount,
        recordedAt: Date.now()
      };
    });
    saveTransactions();
    saveEarnIncomeRecords();
    return true;
  }

  function goalSource(goal = {}) {
    const id = String(goal.id || "").toLowerCase();
    const name = String(goal.name || "").toLowerCase();
    if (id === "goal-portfolio" || name.includes("พอร์ต") || name.includes("พอร์") || name.includes("portfolio")) return "portfolio";
    if (
      id === "goal-savings" ||
      name.includes("เงินออม") ||
      name.includes("เงินฝาก") ||
      name.includes("ดอกเบี้ย") ||
      name.includes("ฝาก") ||
      name.includes("ออม") ||
      name.includes("earn") ||
      name.includes("eran") ||
      name.includes("interest") ||
      name.includes("deposit")
    ) return "earn";
    return "";
  }

  function goalSourceValue(source) {
    if (source === "portfolio") {
      const store = loadPortfolioStore();
      if (!store) return null;
      return getPortfolioStatsFromStore().value;
    }
    if (source === "earn") {
      return getEarnStatsFromStore()?.value ?? null;
    }
    return null;
  }

  function goalSourceLabel(source) {
    if (source === "portfolio") return "อ้างอิงมูลค่าพอร์ต";
    if (source === "earn") return "อ้างอิง Earn จากพอร์ต";
    return "";
  }

  function resolveGoal(goal = {}) {
    const row = normalizeGoal(goal);
    const source = goalSource(row);
    const linkedValue = goalSourceValue(source);
    const currentValue = linkedValue == null ? row.currentValue : linkedValue;
    const pct = row.targetValue > 0 ? Math.min(100, Math.max(0, (currentValue / row.targetValue) * 100)) : 0;
    return {
      ...row,
      currentValue,
      pct,
      source,
      sourceLabel: goalSourceLabel(source)
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

  function getPriceApiBase() {
    return getDashboardAuthApiUrl() || PRICE_API_FALLBACK;
  }

  function normalizePriceSymbol(asset = {}) {
    return String(asset.ticker || asset.symbol || "")
      .trim()
      .toUpperCase()
      .replace(/-USD$/, "");
  }

  function isStableSymbol(symbol) {
    return ["USDT", "USDC", "BUSD", "DAI", "USD"].includes(String(symbol || "").toUpperCase());
  }

  function portfolioPriceSymbol(asset = {}) {
    const symbol = normalizePriceSymbol(asset);
    if (!symbol) return "";
    if (String(asset.classKey || "").toLowerCase() === "th" && !symbol.endsWith(".BK")) return `${symbol}.BK`;
    return symbol;
  }

  function priceGroupForAsset(asset = {}) {
    const type = normalizeAssetType(asset);
    if (type === "crypto" || type === "gold") return "crypto";
    return "stocks";
  }

  function extractPriceValue(priceData) {
    if (typeof priceData === "number") return priceData;
    if (!priceData || typeof priceData !== "object") return NaN;
    return Number(
      priceData.price ??
      priceData.regularMarketPrice ??
      priceData.value ??
      priceData.last ??
      priceData.close ??
      priceData.bid ??
      priceData.ask
    );
  }

  function pickPrice(prices, symbol) {
    const clean = String(symbol || "").toUpperCase().replace(/-USD$/, "");
    if (!prices || !clean) return NaN;
    const direct = prices[clean] ?? prices[`${clean}-USD`] ?? prices[clean.replace(".BK", "")];
    const directPrice = extractPriceValue(direct);
    if (Number.isFinite(directPrice) && directPrice > 0) return directPrice;
    const found = Object.entries(prices).find(([key]) => {
      const normalized = String(key).toUpperCase().replace(/-USD$/, "");
      return normalized === clean || normalized.replace(".BK", "") === clean.replace(".BK", "");
    });
    return extractPriceValue(found?.[1]);
  }

  async function fetchJsonWithTimeout(url, timeoutMs = 9000) {
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, { signal: controller.signal });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json();
    } finally {
      window.clearTimeout(timer);
    }
  }

  function normalizeWorkerPrices(json) {
    return json?.prices || json || {};
  }

  function extractFXRate(json) {
    const value = Number(json?.rate ?? json?.price ?? json?.value ?? json?.THB ?? json?.result ?? json);
    return Number.isFinite(value) && value > 0 ? value : NaN;
  }

  async function fetchFXRate() {
    const json = await fetchJsonWithTimeout(`${getPriceApiBase()}/api/prices/fx?from=USD&to=THB`, 8000);
    return extractFXRate(json);
  }

  function binanceSymbol(symbol) {
    const clean = String(symbol || "").toUpperCase().replace(/-USD$/, "");
    if (clean === "XAUT") return "PAXGUSDT";
    if (clean === "USDT") return "";
    return `${clean}USDT`;
  }

  async function fetchBinancePrices(symbols) {
    const pairs = symbols.map(binanceSymbol).filter(Boolean);
    if (!pairs.length) return {};
    const url = `https://data-api.binance.vision/api/v3/ticker/24hr?symbols=${encodeURIComponent(JSON.stringify(pairs))}`;
    const rows = await fetchJsonWithTimeout(url);
    const list = Array.isArray(rows) ? rows : [rows];
    return list.reduce((out, row) => {
      const pair = String(row.symbol || "").toUpperCase();
      const symbol = pair === "PAXGUSDT" ? "XAUT" : pair.replace(/USDT$/, "");
      const price = Number(row.lastPrice);
      if (Number.isFinite(price) && price > 0) {
        out[symbol] = {
          price,
          chg1d: Number(row.priceChangePercent || 0),
          source: "binance",
          currency: "USD",
          updatedAt: Date.now()
        };
      }
      return out;
    }, {});
  }

  async function fetchCoinbasePrices(symbols) {
    const results = await Promise.allSettled(symbols.map(async symbol => {
      const clean = String(symbol || "").toUpperCase().replace(/-USD$/, "");
      if (clean === "XAUT") return [clean, null];
      const json = await fetchJsonWithTimeout(`https://api.coinbase.com/v2/prices/${clean}-USD/spot`, 8000);
      const price = Number(json?.data?.amount);
      return [clean, Number.isFinite(price) && price > 0 ? {
        price,
        chg1d: 0,
        source: "coinbase",
        currency: "USD",
        updatedAt: Date.now()
      } : null];
    }));
    return results.reduce((out, result) => {
      if (result.status === "fulfilled" && result.value?.[1]) out[result.value[0]] = result.value[1];
      return out;
    }, {});
  }

  function yahooStockPriceFromChart(symbol, chart = {}) {
    const result = chart?.chart?.result?.[0] || {};
    const meta = result.meta || {};
    const timestamps = Array.isArray(result.timestamp) ? result.timestamp : [];
    const closes = Array.isArray(result.indicators?.quote?.[0]?.close) ? result.indicators.quote[0].close : [];
    let latestClose = NaN;
    let latestTime = 0;
    for (let index = closes.length - 1; index >= 0; index -= 1) {
      const close = Number(closes[index]);
      const time = Number(timestamps[index]);
      if (Number.isFinite(close) && close > 0) {
        latestClose = close;
        latestTime = Number.isFinite(time) ? time * 1000 : 0;
        break;
      }
    }
    const state = String(meta.marketState || "").toUpperCase();
    const regular = Number(meta.regularMarketPrice);
    const pre = Number(meta.preMarketPrice);
    const post = Number(meta.postMarketPrice);
    const prev = Number(meta.chartPreviousClose ?? meta.previousClose);
    let price = Number.isFinite(latestClose) ? latestClose : regular;
    let session = state.includes("CLOSED") ? "close" : "regular";
    if (Number.isFinite(pre) && state.includes("PRE")) {
      price = pre;
      session = "pre";
    } else if (Number.isFinite(post) && (state.includes("POST") || state.includes("CLOSED"))) {
      price = post;
      session = "post";
    } else if (!Number.isFinite(price) && Number.isFinite(prev)) {
      price = prev;
      session = "close";
    }
    if (!Number.isFinite(price) || price <= 0) return null;
    const baseline = Number.isFinite(prev) && prev > 0 ? prev : price;
    return {
      price,
      chg1d: baseline > 0 ? ((price - baseline) / baseline) * 100 : 0,
      source: "yahoo-direct",
      currency: String(meta.currency || "USD").toUpperCase(),
      session,
      updatedAt: latestTime || (Number(meta.regularMarketTime || meta.preMarketTime || meta.postMarketTime || 0) * 1000) || Date.now()
    };
  }

  async function fetchYahooStockPrices(symbols) {
    const results = await Promise.allSettled(symbols.map(async symbol => {
      const clean = String(symbol || "").trim().toUpperCase();
      const json = await fetchJsonWithTimeout(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(clean)}?interval=1m&range=1d&includePrePost=true`, 8000);
      return [clean, yahooStockPriceFromChart(clean, json)];
    }));
    return results.reduce((out, result) => {
      if (result.status === "fulfilled" && result.value?.[1]) out[result.value[0]] = result.value[1];
      return out;
    }, {});
  }

  async function fetchPriceGroup(group, symbols) {
    if (!symbols.length) return {};
    const endpoint = group === "crypto" ? "crypto" : "stocks";
    const workerUrl = `${getPriceApiBase()}/api/prices/${endpoint}?symbols=${encodeURIComponent(symbols.join(","))}`;
    let workerPrices = {};
    try {
      workerPrices = normalizeWorkerPrices(await fetchJsonWithTimeout(workerUrl));
    } catch (error) {
      console.warn(`${endpoint} worker price refresh skipped`, error);
    }
    if (group !== "crypto") {
      const missingStocks = symbols.filter(symbol => !Number.isFinite(pickPrice(workerPrices, symbol)));
      if (!missingStocks.length) return workerPrices;
      try {
        const yahooPrices = await fetchYahooStockPrices(missingStocks);
        return { ...yahooPrices, ...workerPrices };
      } catch (error) {
        console.warn("Yahoo direct stock fallback skipped", error);
        return workerPrices;
      }
    }

    const missing = symbols.filter(symbol => !Number.isFinite(pickPrice(workerPrices, symbol)));
    if (!missing.length) return workerPrices;

    const [binanceResult, coinbaseResult] = await Promise.allSettled([
      fetchBinancePrices(missing),
      fetchCoinbasePrices(missing)
    ]);
    const binancePrices = binanceResult.status === "fulfilled" ? binanceResult.value : {};
    const coinbasePrices = coinbaseResult.status === "fulfilled" ? coinbaseResult.value : {};
    if (binanceResult.status === "rejected") console.warn("Binance price fallback skipped", binanceResult.reason);
    if (coinbaseResult.status === "rejected") console.warn("Coinbase price fallback skipped", coinbaseResult.reason);
    return { ...coinbasePrices, ...binancePrices, ...workerPrices };
  }

  async function fetchLatestLiveQuotePrices(quotes) {
    const grouped = quotes.reduce((sum, quote) => {
      const symbol = normalizePriceSymbol(quote);
      if (!symbol) return sum;
      sum[quote.type === "crypto" ? "crypto" : "stocks"].add(symbol);
      return sum;
    }, { crypto: new Set(), stocks: new Set() });
    const [cryptoResult, stockResult] = await Promise.allSettled([
      fetchPriceGroup("crypto", Array.from(grouped.crypto)),
      fetchPriceGroup("stocks", Array.from(grouped.stocks))
    ]);
    const cryptoPrices = cryptoResult.status === "fulfilled" ? cryptoResult.value : {};
    const stockPrices = stockResult.status === "fulfilled" ? stockResult.value : {};
    if (cryptoResult.status === "rejected") console.warn("Crypto price refresh skipped", cryptoResult.reason);
    if (stockResult.status === "rejected") console.warn("Stock price refresh skipped", stockResult.reason);
    return { crypto: cryptoPrices, stocks: stockPrices };
  }

  async function refreshLiveQuotes() {
    if (liveQuoteBusy || !liveQuotes.length) return false;
    liveQuoteBusy = true;
    try {
      const priceGroups = await fetchLatestLiveQuotePrices(liveQuotes);
      const now = Date.now();
      liveQuotes = liveQuotes.map(quote => {
        const symbol = normalizePriceSymbol(quote);
        const group = quote.type === "crypto" ? "crypto" : "stocks";
        const raw = priceGroups[group]?.[symbol] ?? priceGroups[group]?.[`${symbol}-USD`] ?? priceGroups[group]?.[symbol.replace(".BK", "")];
        const latestPrice = pickPrice(priceGroups[group], symbol);
        if (!Number.isFinite(latestPrice) || latestPrice <= 0) return { ...quote, error: "ดึงราคาไม่ได้" };
        return {
          ...quote,
          price: latestPrice,
          changePct: Number(raw?.chg1d ?? raw?.changePct ?? quote.changePct ?? 0) || 0,
          currency: raw?.currency || quote.currency || "USD",
          source: raw?.source || quote.source || "",
          session: raw?.session || raw?.marketState || quote.session || "",
          error: "",
          updatedAt: Number(raw?.updatedAt || now)
        };
      });
      lastQuoteRefreshAt = now;
      saveLiveQuotes();
      if (activeAssetFilter === "live") renderAssets();
      return true;
    } catch (error) {
      console.warn("Cannot refresh live quotes", error);
      return false;
    } finally {
      liveQuoteBusy = false;
    }
  }

  async function refreshPortfolioPrices() {
    const store = loadPortfolioStore();
    const holdings = Array.isArray(store?.holdings) ? store.holdings : [];
    const earn = Array.isArray(store?.earn) ? store.earn : [];
    if (portfolioPriceBusy || (!holdings.length && !earn.length)) return false;

    portfolioPriceBusy = true;
    try {
      const groups = holdings.reduce((sum, asset) => {
        const symbol = portfolioPriceSymbol(asset);
        if (!symbol) return sum;
        sum[priceGroupForAsset(asset)].add(symbol);
        return sum;
      }, { crypto: new Set(), stocks: new Set() });

      earn.forEach(position => {
        const symbol = normalizePriceSymbol({ ticker: position.sym || position.ticker || position.symbol });
        if (symbol && !isStableSymbol(symbol)) groups.crypto.add(symbol);
      });

      const [cryptoResult, stockResult, fxResult] = await Promise.allSettled([
        fetchPriceGroup("crypto", Array.from(groups.crypto)),
        fetchPriceGroup("stocks", Array.from(groups.stocks)),
        fetchFXRate()
      ]);

      const cryptoPrices = cryptoResult.status === "fulfilled" ? cryptoResult.value : {};
      const stockPrices = stockResult.status === "fulfilled" ? stockResult.value : {};
      const nextFx = fxResult.status === "fulfilled" && Number.isFinite(fxResult.value) ? fxResult.value : Number(store.fx || 35.8);
      const now = Date.now();
      let changed = Number(nextFx) !== Number(store.fx || 0);
      let touched = changed;

      const nextHoldings = holdings.map(asset => {
        const group = priceGroupForAsset(asset);
        const prices = group === "crypto" ? cryptoPrices : stockPrices;
        const requestSymbol = portfolioPriceSymbol(asset);
        const symbol = normalizePriceSymbol(asset);
        const latestPrice = pickPrice(prices, requestSymbol) || pickPrice(prices, symbol);
        if (!Number.isFinite(latestPrice) || latestPrice <= 0) return asset;
        const raw = prices[requestSymbol] ?? prices[symbol] ?? prices[`${symbol}-USD`] ?? prices[symbol.replace(".BK", "")];
        changed = changed || Number(asset.price || 0) !== latestPrice;
        touched = true;
        return {
          ...asset,
          price: latestPrice,
          chg1d: Number(raw?.chg1d ?? raw?.changePct ?? asset.chg1d ?? 0) || 0,
          priceSource: raw?.source || asset.priceSource || (group === "crypto" ? "crypto" : "stocks"),
          priceSession: raw?.session || raw?.marketState || asset.priceSession || "",
          priceUpdatedAt: now,
          spark: [...(asset.spark || []).slice(-11), latestPrice]
        };
      });

      const nextEarn = earn.map(position => {
        const symbol = normalizePriceSymbol({ ticker: position.sym || position.ticker || position.symbol });
        if (!symbol) return position;
        const latestPrice = isStableSymbol(symbol) ? 1 : pickPrice(cryptoPrices, symbol);
        if (!Number.isFinite(latestPrice) || latestPrice <= 0) return position;
        changed = changed || Number(position.priceUSD ?? position.price ?? 0) !== latestPrice;
        touched = true;
        return {
          ...position,
          priceUSD: latestPrice,
          priceUpdatedAt: now
        };
      });

      lastPortfolioRefreshAt = now;
      if (changed || touched) {
        savePortfolioStore({
          ...store,
          fx: nextFx,
          holdings: nextHoldings,
          earn: nextEarn,
          pricesUpdatedAt: now
        });
      } else {
        refreshPortfolioDrivenData();
      }
      return true;
    } catch (error) {
      console.warn("Cannot refresh portfolio prices", error);
      return false;
    } finally {
      portfolioPriceBusy = false;
    }
  }

  function dividendSymbolsFromHoldings() {
    return getHeldAssets()
      .filter(asset => asset.type === "stocks" && Number(asset.qty || 0) > 0)
      .map(asset => String(asset.symbol || "").toUpperCase())
      .filter(Boolean);
  }

  async function refreshDividendFundamentals() {
    const symbols = Array.from(new Set(dividendSymbolsFromHoldings()));
    if (dividendRefreshBusy || !symbols.length) {
      renderDividends();
      return false;
    }
    dividendRefreshBusy = true;
    try {
      const url = `${getPriceApiBase()}/api/fundamentals/dividends?symbols=${encodeURIComponent(symbols.join(","))}`;
      const json = await fetchJsonWithTimeout(url, 9000);
      const now = Date.now();
      dividendFundamentals = symbols.reduce((out, symbol) => {
        const raw = json?.[symbol] || json?.dividends?.[symbol] || json?.data?.[symbol] || null;
        const dividendRate = Number(raw?.dividendRate ?? raw?.rate ?? raw?.annualDividend ?? 0) || 0;
        const dividendYield = Number(raw?.dividendYield ?? raw?.yield ?? 0) || 0;
        const payments = Math.max(1, Number(raw?.payments ?? raw?.frequency ?? 4) || 4);
        out[symbol] = {
          dividendRate,
          dividendYield,
          payments,
          currency: raw?.currency || "USD",
          source: raw?.source || "yahoo-dividend",
          updatedAt: now
        };
        return out;
      }, { ...dividendFundamentals });
      lastDividendRefreshAt = now;
      saveDividendFundamentals();
      renderDividends();
      renderDashboardData();
      return true;
    } catch (error) {
      console.warn("Cannot refresh dividend fundamentals", error);
      renderDividends();
      return false;
    } finally {
      dividendRefreshBusy = false;
    }
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

  function monthLabel(key) {
    if (!key) return "เดือนนี้";
    const [year, month] = key.split("-").map(Number);
    const date = new Date(year, (month || 1) - 1, 1);
    return date.toLocaleDateString("th-TH", { month: "long", year: "numeric" });
  }

  function shortMonthLabel(key) {
    if (!key) return "";
    const [year, month] = key.split("-").map(Number);
    const date = new Date(year, (month || 1) - 1, 1);
    return date.toLocaleDateString("th-TH", { month: "short", year: "numeric" });
  }

  function yearLabel(key) {
    return key ? `ปี ${Number(key) + 543}` : "ปีนี้";
  }

  function dayLabel(key) {
    return formatDate(key);
  }

  function getTransactionMonth(item) {
    return String(item?.date || "").slice(0, 7);
  }

  function getTransactionYear(item) {
    return String(item?.date || "").slice(0, 4);
  }

  function availableMonths() {
    const keys = new Set(transactions.map(getTransactionMonth).filter(Boolean));
    monthBaseline.forEach(item => keys.add(item.key));
    return [...keys].sort().reverse();
  }

  function ensureCashMonth() {
    const months = availableMonths();
    if (!selectedCashMonth || !months.includes(selectedCashMonth)) selectedCashMonth = months[0] || todayISO().slice(0, 7);
    return selectedCashMonth;
  }

  function transactionsForMonth(monthKey = ensureCashMonth()) {
    return transactions.filter(item => getTransactionMonth(item) === monthKey);
  }

  function transactionPeriodKey(item, mode = analyticsMode) {
    if (mode === "day") return item.date || todayISO();
    if (mode === "year") return getTransactionYear(item) || todayISO().slice(0, 4);
    return getTransactionMonth(item) || todayISO().slice(0, 7);
  }

  function transactionPeriodLabel(key, mode = analyticsMode) {
    if (mode === "day") return dayLabel(key);
    if (mode === "year") return yearLabel(key);
    return shortMonthLabel(key);
  }

  function getCategory(type, categoryId) {
    const list = categories[type] || [];
    return list.find(category => category.id === categoryId) || list[list.length - 1] || { name: "อื่น ๆ", icon: "ellipsis" };
  }

  function totalByType(type, source = transactions) {
    return source
      .filter(item => item.type === type)
      .reduce((sum, item) => sum + Number(item.amount || 0), 0);
  }

  function cashAvailableFromTransactions(source = transactions) {
    return Math.max(0, totalByType("income", source) - totalByType("expense", source));
  }

  function summarizeCategories(type, source = transactions) {
    const summary = new Map();
    source.filter(item => item.type === type).forEach(item => {
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

  function getAnalyticsRows() {
    const summary = new Map();
    if (analyticsMode === "month") {
      monthBaseline.forEach(item => {
        summary.set(item.key, { key: item.key, label: shortMonthLabel(item.key), income: 0, expense: 0 });
      });
    }
    transactions.forEach(item => {
      const key = transactionPeriodKey(item, analyticsMode);
      if (!key) return;
      if (!summary.has(key)) {
        summary.set(key, { key, label: transactionPeriodLabel(key, analyticsMode), income: 0, expense: 0 });
      }
      const row = summary.get(key);
      row[item.type] += Number(item.amount || 0);
    });
    const limit = analyticsMode === "day" ? 10 : 6;
    return [...summary.values()]
      .map(row => ({ ...row, balance: row.income - row.expense }))
      .sort((a, b) => b.key.localeCompare(a.key))
      .slice(0, limit);
  }

  function renderMonthlyAnalytics() {
    const target = document.getElementById("monthlyAnalytics");
    if (!target) return;
    const rows = getAnalyticsRows();
    const rangeLabel = analyticsMode === "day" ? "วัน" : analyticsMode === "year" ? "ปี" : "เดือน";
    const title = document.querySelector(".trend-panel .panel-head h2");
    const subtitle = document.querySelector(".trend-panel .panel-head p");
    if (title) title.textContent = analyticsMode === "day" ? "วิเคราะห์รายวัน" : analyticsMode === "year" ? "วิเคราะห์รายปี" : "วิเคราะห์รายเดือน";
    if (subtitle) subtitle.textContent = `รายรับ รายจ่าย และเงินคงเหลือแบบ${rangeLabel}`;
    if (!rows.length) {
      target.innerHTML = `
        <div class="asset-empty">
          <i data-lucide="calendar-search"></i>
          <b>ยังไม่มีข้อมูลสำหรับการวิเคราะห์แบบ${rangeLabel}</b>
          <span>เพิ่มรายรับหรือรายจ่ายก่อน แล้วระบบจะสรุปให้ทันที</span>
        </div>
      `;
      if (window.lucide) window.lucide.createIcons();
      return;
    }
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
          <small>เฉลี่ยต่อ${rangeLabel} ${shortTHB(incomeTotal / Math.max(rows.length, 1))}</small>
        </article>
        <article class="monthly-kpi" style="--dot:#ff6b6b">
          <span>รายจ่ายรวม</span>
          <strong>${shortTHB(expenseTotal)}</strong>
          <small>เฉลี่ยต่อ${rangeLabel} ${shortTHB(expenseTotal / Math.max(rows.length, 1))}</small>
        </article>
        <article class="monthly-kpi" style="--dot:var(--gold-2)">
          <span>เงินคงเหลือปัจจุบัน</span>
          <strong>${shortTHB(currentBalance)}</strong>
          <small>เดือนล่าสุดจากข้อมูลบันทึก</small>
        </article>
      </section>
      <section class="monthly-table">
        <div class="monthly-row header">
          <span>${rangeLabel}</span>
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
        <span class="monthly-month">รวม ${rows.length} ${rangeLabel}</span>
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

  function formatAssetPrice(asset = {}) {
    const price = Number(asset.price || 0);
    const ccy = asset.ccy || "USD";
    if (!price) return "รอราคา";
    if (ccy === "THB") return `฿${number.format(Number(price.toFixed(2)))}`;
    return `$${number.format(Number(price.toFixed(price >= 100 ? 2 : 4)))}`;
  }

  function formatPriceUpdatedAt(timestamp) {
    const at = Number(timestamp || lastQuoteRefreshAt || 0);
    if (!at) return "ยังไม่ดึงราคา";
    return new Date(at).toLocaleTimeString("th-TH", {
      timeZone: "Asia/Bangkok",
      hour12: false,
      hour: "2-digit",
      minute: "2-digit"
    });
  }

  function formatPortfolioUpdatedAt() {
    const store = loadPortfolioStore();
    const at = Number(lastPortfolioRefreshAt || store?.pricesUpdatedAt || 0);
    return formatPriceUpdatedAt(at);
  }

  function formatLiveQuotePrice(quote = {}) {
    const price = Number(quote.price || 0);
    if (!price) return "รอราคา";
    const prefix = quote.currency === "THB" ? "฿" : "$";
    const digits = price >= 100 ? 2 : 4;
    return `${prefix}${number.format(Number(price.toFixed(digits)))}`;
  }

  function renderLivePriceMonitor(target) {
    const cryptoCount = liveQuotes.filter(item => item.type === "crypto").length;
    const stockCount = liveQuotes.length - cryptoCount;
    const sortedQuotes = [...liveQuotes].sort((a, b) => {
      if (a.type !== b.type) return a.type === "stocks" ? -1 : 1;
      return a.symbol.localeCompare(b.symbol);
    });
    target.innerHTML = `
      <section class="live-price-panel">
        <header class="live-market-head">
          <div>
            <h3>LIVE MARKET</h3>
            <p>${cryptoCount} crypto · ${stockCount} stock · ${formatPriceUpdatedAt()}</p>
          </div>
          <button class="live-add-toggle" type="button" data-live-add-toggle>เพิ่ม</button>
        </header>
        <form class="live-price-form" id="livePriceForm" hidden>
          <div>
            <select id="liveQuoteType" aria-label="ประเภทสินทรัพย์">
              <option value="crypto">คริปโต</option>
              <option value="stocks">หุ้น</option>
            </select>
            <input id="liveQuoteSymbol" type="text" placeholder="BTC, ETH, NVDA, PTT.BK" autocomplete="off">
          </div>
          <button type="submit"><i data-lucide="plus"></i>เพิ่ม</button>
          <button type="button" data-live-refresh><i data-lucide="refresh-cw"></i></button>
        </form>
        <div class="live-price-list">
          ${sortedQuotes.length ? sortedQuotes.map(quote => {
            const positive = Number(quote.changePct || 0) >= 0;
            const typeLabel = quote.source || (quote.type === "crypto" ? "crypto api" : "stock api");
            const iconAsset = { ticker: quote.symbol, symbol: quote.symbol, type: quote.type === "crypto" ? "crypto" : "stocks" };
            return `
              <article class="live-price-row ${positive ? "up" : "down"}" data-live-id="${escapeHTML(quote.id)}">
                <span class="asset-icon">
                  <img src="${escapeHTML(assetLogoUrl(iconAsset))}" alt="${escapeHTML(quote.symbol)}" loading="lazy" onerror="this.hidden=true;this.nextElementSibling.hidden=false;">
                  <i data-lucide="${quote.type === "crypto" ? "coins" : "chart-line"}" hidden></i>
                </span>
                <div>
                  <strong>${escapeHTML(quote.symbol)}</strong>
                  <small>${quote.error ? escapeHTML(quote.error) : escapeHTML(typeLabel)}</small>
                </div>
                <b>${quote.error ? "--" : formatLiveQuotePrice(quote)}</b>
                <em>${positive ? "+" : ""}${Number(quote.changePct || 0).toFixed(2)}%</em>
                <button type="button" data-live-remove="${escapeHTML(quote.id)}" aria-label="ลบ ${escapeHTML(quote.symbol)}">X</button>
              </article>
            `;
          }).join("") : `
            <div class="asset-empty">
              <i data-lucide="radar"></i>
              <b>ยังไม่มีรายการราคา Live</b>
              <span>เพิ่มคริปโตหรือหุ้นที่อยากดู ราคา Live จะไม่ยุ่งกับสินทรัพย์ในพอร์ต</span>
            </div>
          `}
        </div>
      </section>
    `;
    if (window.lucide) window.lucide.createIcons();
  }

  function renderLiveHoldingAssets(target) {
    const rows = getHeldAssets();
    const subtitle = document.querySelector(".asset-table-panel .panel-head p");
    if (subtitle) subtitle.textContent = `ราคา Live จากสินทรัพย์ที่ถืออยู่ · อัปเดตทุก 1 นาที · ล่าสุด ${formatPortfolioUpdatedAt()}`;
    if (!rows.length) {
      target.innerHTML = `
        <div class="asset-empty">
          <i data-lucide="radar"></i>
          <b>ยังไม่มีสินทรัพย์สำหรับราคา Live</b>
          <span>เพิ่มสินทรัพย์ในพอร์ตก่อน ระบบจะแสดงราคาล่าสุดที่นี่</span>
        </div>
      `;
      if (window.lucide) window.lucide.createIcons();
      return;
    }
    const typeLabels = { crypto: "คริปโต", stocks: "หุ้น", gold: "ทองคำ" };
    target.innerHTML = rows.map(asset => {
      const isGain = Number(asset.pnl || 0) >= 0;
      return `
        <div class="asset-row is-live asset-type-${asset.type}" style="--dot:${asset.color}">
          <span class="asset-icon">
            ${asset.logoUrl ? `<img src="${escapeHTML(asset.logoUrl)}" alt="${escapeHTML(asset.symbol)}" loading="lazy" onerror="this.hidden=true;this.nextElementSibling.hidden=false;">` : ""}
            <i data-lucide="${asset.icon || "landmark"}" ${asset.logoUrl ? "hidden" : ""}></i>
          </span>
          <div>
            <strong>${escapeHTML(asset.symbol)}</strong>
            <small>${escapeHTML(asset.symbol)} · ${typeLabels[asset.type] || "สินทรัพย์"} · ราคา ${formatAssetPrice(asset)} · ${number.format(asset.qty || 0)} หน่วย</small>
          </div>
          <b>${shortTHB(asset.value)}</b>
          <em class="${isGain ? "income" : "expense"}">${isGain ? "+" : ""}${shortTHB(asset.pnl)}</em>
          <strong class="gain ${isGain ? "" : "loss"}">${isGain ? "+" : ""}${asset.pct.toFixed(2)}%</strong>
        </div>
      `;
    }).join("");
    if (window.lucide) window.lucide.createIcons();
  }

  function addLiveQuote(event) {
    event?.preventDefault();
    const type = document.getElementById("liveQuoteType")?.value === "crypto" ? "crypto" : "stocks";
    const input = document.getElementById("liveQuoteSymbol");
    const symbol = String(input?.value || "").trim().toUpperCase().replace(type === "crypto" ? /-USD$/ : /$/g, "");
    if (!symbol) return showToast("ใส่สัญลักษณ์ที่ต้องการดูก่อน");
    if (liveQuotes.some(item => item.type === type && item.symbol === symbol)) return showToast("มีรายการนี้แล้ว");
    liveQuotes = [{ id: `live-${Date.now().toString(36)}`, symbol, type }, ...liveQuotes].map(normalizeLiveQuote);
    saveLiveQuotes();
    if (input) input.value = "";
    renderAssets();
    refreshLiveQuotes();
  }

  function removeLiveQuote(id) {
    liveQuotes = liveQuotes.filter(item => item.id !== id);
    saveLiveQuotes();
    renderAssets();
  }

  function renderAssets() {
    const target = document.getElementById("assetTable");
    if (!target) return;
    const allAssets = getHeldAssets();
    const isLiveView = activeAssetFilter === "live";
    if (isLiveView) {
      const subtitle = document.querySelector(".asset-table-panel .panel-head p");
      if (subtitle) subtitle.textContent = `เพิ่มคริปโต/หุ้นที่อยากดู · ดึงราคาเรียลไทม์ทุก 1 นาที · ล่าสุด ${formatPriceUpdatedAt()}`;
      renderLivePriceMonitor(target);
      return;
    }
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
      <div class="asset-row asset-type-${asset.type}${isLiveView ? " is-live" : ""}" style="--dot:${asset.color}">
        <span class="asset-icon">
          ${asset.logoUrl ? `<img src="${escapeHTML(asset.logoUrl)}" alt="${escapeHTML(asset.symbol)}" loading="lazy" onerror="this.hidden=true;this.nextElementSibling.hidden=false;">` : ""}
          <i data-lucide="${asset.icon || "landmark"}" ${asset.logoUrl ? "hidden" : ""}></i>
        </span>
        <div>
          <strong>${escapeHTML(asset.name)}</strong>
          <small>${escapeHTML(asset.symbol)} · ${typeLabels[asset.type] || "สินทรัพย์"} · ราคา ${formatAssetPrice(asset)}${asset.qty ? ` · ${number.format(asset.qty)} หน่วย` : ""}</small>
        </div>
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
    const filters = ["all", "crypto", "stocks", "live"];
    buttons.forEach((button, index) => {
      button.dataset.assetFilter = filters[index] || "all";
      button.addEventListener("click", () => {
        activeAssetFilter = button.dataset.assetFilter;
        buttons.forEach(item => item.classList.toggle("active", item === button));
        renderAssets();
        if (activeAssetFilter === "live") refreshLiveQuotes();
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
    renderGoals();
    closeAssetTransactionModal();
    showToast(remotePushed ? `บันทึก ${asset.ticker} เข้า cloud แล้ว` : `บันทึกธุรกรรม ${asset.ticker} แล้ว`);
  }

  function renderGoalManagerList() {
    const target = document.getElementById("goalManagerList");
    if (!target) return;
    if (!financialGoals.length) {
      target.innerHTML = `
        <div class="goal-manager-empty">
          <i data-lucide="target"></i>
          <b>ยังไม่มีเป้าหมาย</b>
          <span>กดเพิ่มเพื่อสร้างเป้าหมายแรก</span>
        </div>
      `;
      refreshModalIcons();
      return;
    }

    target.innerHTML = financialGoals.map(goal => {
      const row = resolveGoal(goal);
      return `
        <button class="goal-manager-item${row.id === editingGoalId ? " active" : ""}" type="button" data-goal-id="${escapeHTML(row.id)}">
          <span><i data-lucide="${row.icon}"></i></span>
          <strong>${escapeHTML(row.name)}</strong>
          <small>${shortTHB(row.currentValue)} / ${shortTHB(row.targetValue)}${row.sourceLabel ? ` · ${row.sourceLabel}` : ""}</small>
          <em>${row.pct.toFixed(0)}%</em>
        </button>
      `;
    }).join("");
    refreshModalIcons();
  }

  function renderGoalIconGrid() {
    const target = document.getElementById("goalIconGrid");
    if (!target) return;
    target.innerHTML = goalIconChoices.map(icon => `
      <button class="goal-icon-choice${icon === selectedGoalIcon ? " active" : ""}" type="button" data-goal-icon="${icon}" title="${icon}">
        <i data-lucide="${icon}"></i>
      </button>
    `).join("");
    refreshModalIcons();
  }

  function updateGoalProgressPreview() {
    const targetValue = Number(document.getElementById("goalTargetValue")?.value || 0);
    const currentInput = document.getElementById("goalCurrentValue");
    const source = goalSource({ id: editingGoalId, name: document.getElementById("goalName")?.value || "" });
    const linkedValue = goalSourceValue(source);
    const currentValue = linkedValue == null ? Number(currentInput?.value || 0) : linkedValue;
    const pct = targetValue > 0 ? Math.min(100, Math.max(0, (currentValue / targetValue) * 100)) : 0;
    const output = document.getElementById("goalProgressPreview");
    if (currentInput) {
      currentInput.disabled = linkedValue != null;
      currentInput.parentElement?.classList.toggle("is-linked-source", linkedValue != null);
      if (linkedValue != null) currentInput.value = String(Math.round(linkedValue));
    }
    if (output) output.textContent = `${pct.toFixed(0)}%`;
  }

  function fillGoalForm(goal = null) {
    const row = goal ? resolveGoal(goal) : { id: "", icon: "target", name: "", targetValue: "", currentValue: "" };
    editingGoalId = row.id || null;
    selectedGoalIcon = row.icon || "target";
    const name = document.getElementById("goalName");
    const target = document.getElementById("goalTargetValue");
    const current = document.getElementById("goalCurrentValue");
    const deleteButton = document.getElementById("goalDeleteButton");
    if (name) name.value = row.name || "";
    if (target) target.value = row.targetValue || "";
    if (current) current.value = row.currentValue || "";
    if (deleteButton) deleteButton.hidden = !editingGoalId;
    updateGoalProgressPreview();
    renderGoalManagerList();
    renderGoalIconGrid();
    setTimeout(() => name?.focus(), 40);
  }

  function openGoalModal() {
    const overlay = document.getElementById("goalOverlay");
    if (!overlay) return;
    overlay.hidden = false;
    fillGoalForm(financialGoals[0] || null);
  }

  function closeGoalModal() {
    const overlay = document.getElementById("goalOverlay");
    if (overlay) overlay.hidden = true;
  }

  function submitGoalForm(event) {
    event.preventDefault();
    const name = document.getElementById("goalName")?.value.trim();
    const targetValue = Number(document.getElementById("goalTargetValue")?.value || 0);
    const source = goalSource({ id: editingGoalId, name });
    const linkedValue = goalSourceValue(source);
    const currentValue = linkedValue == null ? Number(document.getElementById("goalCurrentValue")?.value || 0) : linkedValue;
    if (!name) return showToast("กรุณาใส่ชื่อเป้าหมาย");
    if (!targetValue || targetValue <= 0) return showToast("กรุณาใส่ยอดเป้าหมาย");
    if (currentValue < 0) return showToast("ยอดสะสมต้องไม่ติดลบ");

    const nextGoal = normalizeGoal({
      id: editingGoalId || `goal-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
      icon: selectedGoalIcon,
      name,
      targetValue,
      currentValue
    });

    if (editingGoalId) {
      financialGoals = financialGoals.map(goal => goal.id === editingGoalId ? nextGoal : goal);
    } else {
      financialGoals = [nextGoal, ...financialGoals];
    }
    editingGoalId = nextGoal.id;
    saveFinancialGoals();
    renderGoals();
    renderGoalManagerList();
    updateGoalProgressPreview();
    showToast("บันทึกเป้าหมายแล้ว");
  }

  function deleteSelectedGoal() {
    const goal = financialGoals.find(item => item.id === editingGoalId);
    if (!goal) return showToast("เลือกเป้าหมายที่ต้องการลบ");
    if (!window.confirm(`ลบเป้าหมาย "${goal.name}" ใช่ไหม?`)) return;
    financialGoals = financialGoals.filter(item => item.id !== editingGoalId);
    saveFinancialGoals();
    renderGoals();
    fillGoalForm(financialGoals[0] || null);
    showToast("ลบเป้าหมายแล้ว");
  }

  function renderGoals() {
    const target = document.getElementById("goalList");
    if (!target) return;
    const rows = financialGoals.map(resolveGoal);
    if (!rows.length) {
      target.innerHTML = `
        <div class="goal-empty">
          <i data-lucide="target"></i>
          <b>ยังไม่มีเป้าหมาย</b>
          <span>กดเมนูเป้าหมายเพื่อเพิ่มแผนการเงินของคุณ</span>
        </div>
      `;
      refreshModalIcons();
      return;
    }
    target.innerHTML = rows.map(goal => `
      <article class="goal-card">
        <span><i data-lucide="${goal.icon}"></i></span>
        <div>
          <header><b>${escapeHTML(goal.name)}</b><em>${goal.pct.toFixed(0)}%</em></header>
          <p>เป้าหมาย ${shortTHB(goal.targetValue)}</p>
          <i><b style="width:${goal.pct}%"></b></i>
          <small>${shortTHB(goal.currentValue)} / ${shortTHB(goal.targetValue)}${goal.sourceLabel ? ` · ${goal.sourceLabel}` : ""}</small>
        </div>
      </article>
    `).join("");
  }

  function formatDividendDate(dateString) {
    return dateString ? formatDate(dateString) : "-";
  }

  function dividendVisual(ticker) {
    const symbol = String(ticker || "").toUpperCase();
    const held = getHeldAssets().find(asset => String(asset.symbol || "").toUpperCase() === symbol);
    const fallback = { ticker: symbol, symbol, type: normalizeAssetType({ ticker: symbol }) };
    return {
      color: held?.color || dividendColorForTicker(symbol),
      logoUrl: held?.logoUrl || assetLogoUrl(fallback),
      icon: held?.icon || assetIconName(fallback),
      mark: symbol.slice(0, 1) || "D"
    };
  }

  function dividendIconHTML(ticker, label = ticker) {
    const visual = dividendVisual(ticker);
    return `
      <span class="asset-icon dividend-asset-icon" style="--dot:${visual.color}">
        ${visual.logoUrl ? `<img src="${escapeHTML(visual.logoUrl)}" alt="${escapeHTML(label)}" loading="lazy" onerror="this.hidden=true;this.nextElementSibling.hidden=false;">` : ""}
        <i data-lucide="${visual.icon || "badge-dollar-sign"}" ${visual.logoUrl ? "hidden" : ""}></i>
      </span>
    `;
  }

  function dateFromISO(dateString) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(dateString || ""))) return null;
    const [year, month, day] = dateString.split("-").map(Number);
    return new Date(Date.UTC(year, month - 1, day));
  }

  function daysBetween(start, end) {
    const ms = 24 * 60 * 60 * 1000;
    return Math.max(0, Math.round((end - start) / ms));
  }

  function portfolioTxSignedQty(tx = {}) {
    const qty = Number(tx.qty || 0);
    if (String(tx.kind || "").toLowerCase() === "sell" && qty > 0) return -qty;
    return qty;
  }

  function portfolioTxSymbol(tx = {}) {
    return String(tx.ticker || tx.symbol || "").trim().toUpperCase();
  }

  function dividendHoldingExposure(asset, year = new Date().getFullYear()) {
    const store = loadPortfolioStore();
    const symbol = String(asset.symbol || asset.ticker || "").toUpperCase();
    const currentQty = Number(asset.qty || 0);
    const start = new Date(Date.UTC(year, 0, 1));
    const end = new Date(Date.UTC(year + 1, 0, 1));
    const totalDays = Math.max(1, daysBetween(start, end));
    const transactions = (store?.transactions || [])
      .filter(tx => portfolioTxSymbol(tx) === symbol)
      .map(tx => ({ ...tx, dateValue: dateFromISO(tx.date), signedQty: portfolioTxSignedQty(tx) }))
      .filter(tx => tx.dateValue && Number.isFinite(tx.signedQty) && tx.signedQty !== 0)
      .sort((a, b) => a.dateValue - b.dateValue);

    if (!transactions.length) {
      return {
        eligibleQty: currentQty,
        firstBuyDate: "",
        heldDays: totalDays,
        totalDays
      };
    }

    const yearEvents = transactions.filter(tx => tx.dateValue >= start && tx.dateValue < end);
    const yearQtyDelta = yearEvents.reduce((sum, tx) => sum + tx.signedQty, 0);
    let runningQty = Math.max(0, currentQty - yearQtyDelta);
    let cursor = start;
    let shareDays = 0;
    let firstBuyDate = yearEvents.find(tx => tx.signedQty > 0)?.date || "";

    yearEvents.forEach(tx => {
      if (tx.dateValue > cursor) {
        shareDays += runningQty * daysBetween(cursor, tx.dateValue);
        cursor = tx.dateValue;
      }
      runningQty = Math.max(0, runningQty + tx.signedQty);
    });

    shareDays += runningQty * daysBetween(cursor, end);
    if (!firstBuyDate) {
      const earliestBuy = transactions.find(tx => tx.signedQty > 0);
      firstBuyDate = earliestBuy?.date || "";
    }

    return {
      eligibleQty: shareDays / totalDays,
      firstBuyDate,
      heldDays: currentQty > 0 ? Math.round(shareDays / Math.max(currentQty, 0.000001)) : 0,
      totalDays
    };
  }

  function dividendEstimateRows() {
    const store = loadPortfolioStore();
    const fx = Number(store?.fx || 35.8);
    const year = new Date().getFullYear();
    return getHeldAssets()
      .filter(asset => asset.type === "stocks" && Number(asset.qty || 0) > 0)
      .map(asset => {
        const symbol = String(asset.symbol || "").toUpperCase();
        const info = dividendFundamentals[symbol] || {};
        const rate = Number(info.dividendRate || 0);
        const payments = Math.max(1, Number(info.payments || 4) || 4);
        const exposure = dividendHoldingExposure(asset, year);
        const annualNative = Number(exposure.eligibleQty || 0) * rate;
        const currency = info.currency || asset.ccy || "USD";
        const annualTHB = currency === "THB" ? annualNative : annualNative * fx;
        return {
          ...asset,
          symbol,
          eligibleQty: Number(exposure.eligibleQty || 0),
          firstBuyDate: exposure.firstBuyDate,
          heldDays: exposure.heldDays,
          totalDays: exposure.totalDays,
          dividendRate: rate,
          dividendYield: Number(info.dividendYield || 0),
          payments,
          currency,
          source: info.source || "รอข้อมูล",
          updatedAt: Number(info.updatedAt || lastDividendRefreshAt || 0),
          annualNative,
          annualTHB,
          perPaymentTHB: annualTHB / payments,
          monthlyTHB: annualTHB / 12
        };
      })
      .filter(row => row.dividendRate > 0)
      .sort((a, b) => b.annualTHB - a.annualTHB);
  }

  function estimatedMonthlyDividendTHB() {
    return dividendEstimateRows().reduce((sum, row) => sum + Number(row.monthlyTHB || 0), 0);
  }

  function actualDividendIncomeTHB(source = transactions) {
    return source
      .filter(item => item.type === "income" && String(item.id || "").startsWith("div-income-"))
      .reduce((sum, item) => sum + (Number.isFinite(Number(item.amount)) ? Number(item.amount) : 0), 0);
  }

  function portfolioIncomeCashAvailable() {
    const dividend = actualDividendIncomeTHB();
    const earnInterest = getEarnInterestStatsFromStore()?.value || 0;
    return {
      dividend,
      earnInterest,
      total: Math.max(0, dividend + earnInterest)
    };
  }

  function dividendStats() {
    const rows = dividendEstimateRows();
    const annualTHB = rows.reduce((sum, row) => sum + Number(row.annualTHB || 0), 0);
    const monthlyTHB = annualTHB / 12;
    const next = rows[0] || null;
    const fx = portfolioFxRate();
    return {
      fx,
      annualTHB,
      monthlyTHB,
      rows,
      next,
      pending: 0
    };
  }

  function repairInvalidDividendIncomeTransactions() {
    const fx = portfolioFxRate();
    let changed = false;
    transactions = transactions.map(item => {
      const amount = Number(item?.amount);
      if (Number.isFinite(amount)) return item;
      if (!String(item?.id || "").startsWith("div-income-")) {
        changed = true;
        return { ...item, amount: 0 };
      }
      const recordId = String(item.id).replace(/^div-income-/, "");
      const dividend = dividendRecords.find(record => record.id === recordId);
      const repairedAmount = dividend ? Math.round((Number(dividend.amount || 0) * fx) || 0) : 0;
      changed = true;
      return { ...item, amount: repairedAmount };
    });
    if (changed) saveTransactions();
    return changed;
  }

  function renderDividends() {
    const target = document.getElementById("dividendList");
    if (!target) return;
    const rows = dividendEstimateRows().slice(0, 5);
    const stats = dividendStats();
    const subtitle = document.querySelector(".dividend-panel .panel-head p");
    const total = document.querySelector(".dividend-total");
    const sourceLabel = rows.some(row => row.source && row.source !== "รอข้อมูล") ? "Yahoo/Worker" : "รอข้อมูลจากเน็ต";
    if (subtitle) subtitle.textContent = `${rows.length} หุ้นปันผล · คำนวณจากจำนวนหุ้นที่ถือ · ${sourceLabel}`;
    if (total) {
      total.innerHTML = `
        <span>รวมประมาณการ</span>
        <strong>${shortTHB(stats.annualTHB)}</strong>
        <small>${shortTHB(stats.monthlyTHB)} / เดือน</small>
      `;
    }
    if (!rows.length) {
      target.innerHTML = `
        <div class="asset-empty dividend-empty">
          <i data-lucide="satellite-dish"></i>
          <b>ยังไม่พบหุ้นที่มีข้อมูลปันผล</b>
          <span>ระบบจะเช็คหุ้นที่ถืออยู่จาก Yahoo ผ่าน Worker แล้วคำนวณให้เมื่อมีข้อมูล</span>
        </div>
      `;
      refreshModalIcons();
      return;
    }
    target.innerHTML = rows.map(item => `
      <div class="dividend-row auto-dividend-row">
        ${dividendIconHTML(item.symbol, item.symbol)}
        <b>
          ${escapeHTML(item.symbol)}
          <small>ถือ ${number.format(item.qty)} หุ้น · คิดเฉลี่ย ${number.format(Number(item.eligibleQty || 0).toFixed(3))} หุ้น · ${item.firstBuyDate ? `ซื้อ ${formatDate(item.firstBuyDate)} · ` : ""}${item.payments} รอบ/ปี</small>
        </b>
        <em>
          <strong>${shortTHB(item.annualTHB)}</strong>
          <small>${shortTHB(item.perPaymentTHB)} / รอบ</small>
        </em>
      </div>
    `).join("");
    refreshModalIcons();
  }

  function renderDividendManager() {
    const summary = document.getElementById("dividendSummary");
    const list = document.getElementById("dividendRecords");
    if (!summary || !list) return;
    const stats = dividendStats();
    summary.innerHTML = `
      <article>
        <span>รวมทั้งปี</span>
        <strong>${USD.format(stats.totalUSD)}</strong>
        <small>${shortTHB(stats.totalTHB)}</small>
      </article>
      <article>
        <span>เฉลี่ย/เดือน</span>
        <strong>${USD.format(stats.monthlyUSD)}</strong>
        <small>ประมาณการจากรายการทั้งหมด</small>
      </article>
      <article>
        <span>รายการถัดไป</span>
        <strong>${stats.next ? escapeHTML(stats.next.ticker) : "-"}</strong>
        <small>${stats.next ? formatDividendDate(stats.next.payDate) : "ยังไม่มีรายการรอจ่าย"}</small>
      </article>
      <article>
        <span>รอบันทึกรายรับ</span>
        <strong>${stats.pending}</strong>
        <small>รายการที่ยังไม่ถูกบันทึก</small>
      </article>
    `;

    const rows = [...dividendRecords].sort((a, b) => a.payDate.localeCompare(b.payDate));
    if (!rows.length) {
      list.innerHTML = `
        <div class="report-empty">
          <i data-lucide="inbox"></i>
          <b>ยังไม่มีรายการเงินปันผล</b>
          <span>เพิ่มรายการแรกจากฟอร์มด้านบนได้เลย</span>
        </div>
      `;
      refreshModalIcons();
      return;
    }

    list.innerHTML = rows.map(item => {
      const isRecorded = item.recordedIncomeId && transactions.some(tx => tx.id === item.recordedIncomeId);
      return `
        <article class="dividend-record" style="--dot:${item.color}">
          ${dividendIconHTML(item.ticker, item.ticker)}
          <div>
            <strong>${escapeHTML(item.ticker)}</strong>
            <small>Ex ${formatDividendDate(item.exDate)} · Pay ${formatDividendDate(item.payDate)}${isRecorded ? " · บันทึกรายรับแล้ว" : ""}</small>
          </div>
          <b>${USD.format(item.amount)}</b>
          <div class="report-actions">
            <button type="button" data-record-dividend="${escapeHTML(item.id)}" title="บันทึกเป็นรายรับ" ${isRecorded ? "disabled" : ""}><i data-lucide="receipt-text"></i></button>
            <button type="button" data-delete-dividend="${escapeHTML(item.id)}" title="ลบ"><i data-lucide="trash-2"></i></button>
          </div>
        </article>
      `;
    }).join("");
    refreshModalIcons();
  }

  function openDividendModal() {
    const overlay = document.getElementById("dividendOverlay");
    if (!overlay) return;
    document.getElementById("dividendForm")?.reset();
    const payDate = document.getElementById("dividendPayDate");
    if (payDate) payDate.value = todayISO();
    overlay.hidden = false;
    renderDividendManager();
  }

  function closeDividendModal() {
    const overlay = document.getElementById("dividendOverlay");
    if (overlay) overlay.hidden = true;
  }

  function submitDividendRecord(event) {
    event.preventDefault();
    const ticker = document.getElementById("dividendTicker")?.value.trim().toUpperCase();
    const amount = Number(document.getElementById("dividendAmount")?.value || 0);
    const exDate = document.getElementById("dividendExDate")?.value || "";
    const payDate = document.getElementById("dividendPayDate")?.value || todayISO();
    if (!ticker) return showToast("กรุณาใส่สัญลักษณ์หุ้น");
    if (!amount || amount <= 0) return showToast("กรุณาใส่จำนวนเงินปันผล");
    dividendRecords = [normalizeDividendRecord({ ticker, amount, exDate, payDate }), ...dividendRecords];
    saveDividendRecords();
    document.getElementById("dividendForm")?.reset();
    const nextPayDate = document.getElementById("dividendPayDate");
    if (nextPayDate) nextPayDate.value = todayISO();
    renderDividends();
    renderDividendManager();
    showToast(`เพิ่มปันผล ${ticker} แล้ว`);
  }

  function deleteDividendRecord(id) {
    const item = dividendRecords.find(record => record.id === id);
    if (!item) return showToast("ไม่พบรายการเงินปันผล");
    if (!window.confirm(`ลบปันผล ${item.ticker} ใช่ไหม?`)) return;
    dividendRecords = dividendRecords.filter(record => record.id !== id);
    saveDividendRecords();
    renderDividends();
    renderDividendManager();
    showToast("ลบรายการเงินปันผลแล้ว");
  }

  function recordDividendAsIncome(id, options = {}) {
    const { silent = false, rerender = true } = options;
    const item = dividendRecords.find(record => record.id === id);
    if (!item) {
      if (!silent) showToast("ไม่พบรายการเงินปันผล");
      return false;
    }
    if (item.recordedIncomeId && transactions.some(tx => tx.id === item.recordedIncomeId)) {
      if (!silent) showToast("รายการนี้บันทึกเป็นรายรับแล้ว");
      return false;
    }
    const amountTHB = Number(item.amount || 0) * portfolioFxRate();
    const tx = {
      id: `div-income-${item.id}`,
      type: "income",
      date: item.payDate || todayISO(),
      categoryId: "invest",
      note: `เงินปันผล ${item.ticker}`,
      amount: Math.round(Number(amountTHB || 0))
    };
    transactions.unshift(tx);
    dividendRecords = dividendRecords.map(record => record.id === id ? { ...record, recordedIncomeId: tx.id } : record);
    saveTransactions();
    saveDividendRecords();
    if (rerender) {
      renderDashboardData();
      renderDividends();
      renderDividendManager();
    }
    if (!silent) showToast(`บันทึกเงินปันผล ${item.ticker} เป็นรายรับแล้ว`);
    return true;
  }

  function recordDueDividendsAsIncome(options = {}) {
    const { silent = false, rerender = true } = options;
    const today = todayISO();
    const dueRows = dividendRecords.filter(item => item.payDate <= today && !(item.recordedIncomeId && transactions.some(tx => tx.id === item.recordedIncomeId)));
    if (!dueRows.length) {
      if (!silent) showToast("ยังไม่มีรายการปันผลครบกำหนด");
      return 0;
    }
    let recordedCount = 0;
    dueRows.forEach(item => {
      if (recordDividendAsIncome(item.id, { silent: true, rerender: false })) recordedCount += 1;
    });
    if (recordedCount && rerender) {
      renderDashboardData();
      renderDividends();
      renderDividendManager();
      renderReportRows();
    }
    if (!silent && recordedCount) showToast(`บันทึกเงินปันผลเข้าเป็นรายรับ ${recordedCount} รายการแล้ว`);
    return recordedCount;
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

  function renderCashMonthOptions() {
    const select = document.getElementById("monthSelect");
    if (!select) return;
    const month = ensureCashMonth();
    select.innerHTML = availableMonths()
      .map(key => `<option value="${key}" ${key === month ? "selected" : ""}>${monthLabel(key)}</option>`)
      .join("");
  }

  function renderCashFlow() {
    const month = ensureCashMonth();
    const scopedTransactions = transactionsForMonth(month);
    const incomeTotal = totalByType("income", scopedTransactions);
    const expenseTotal = totalByType("expense", scopedTransactions);
    const remain = incomeTotal - expenseTotal;
    const target = document.querySelector(".cash-flow-layout");
    const rowTemplate = (type) => {
      const rows = summarizeCategories(type, scopedTransactions);
      if (!rows.length) return `<div><span>ยังไม่มีรายการในเดือนนี้</span><b>0</b></div>`;
      return rows.map(([name, amount]) => `<div><span>${name}</span><b>${number.format(amount)}</b></div>`).join("");
    };

    if (target) {
      renderCashMonthOptions();
      target.innerHTML = `
        <section class="cash-ledger income-ledger">
          <div class="ledger-title">
            <p>รายรับรวม</p>
            <strong>THB ${number.format(incomeTotal)}</strong>
            <small>${monthLabel(month)}</small>
          </div>
          <div class="ledger-lines">${rowTemplate("income")}</div>
          <div class="ledger-total"><span>รวม</span><strong>${number.format(incomeTotal)}</strong></div>
        </section>

        <section class="cash-ledger expense-ledger">
          <div class="ledger-title">
            <p>รายจ่ายรวม</p>
            <strong>THB ${number.format(expenseTotal)}</strong>
            <small>${monthLabel(month)}</small>
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
    if (cards[2]) {
      const cashValue = cards[2].querySelector("strong");
      const cashDetail = cards[2].querySelector("small");
      const portfolioCash = portfolioIncomeCashAvailable();
      if (cashValue) cashValue.textContent = compactTHB(portfolioCash.total);
      if (cashDetail) cashDetail.textContent = "ปันผลจริง + ดอกเบี้ยสะสมจากพอร์ต";
    }
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

  function refreshPortfolioDrivenData() {
    const repairedDividendRows = repairInvalidDividendIncomeTransactions();
    const earnIncomeChanged = recordDailyEarnInterestAsIncome();
    const dividendIncomeCount = recordDueDividendsAsIncome({ silent: true, rerender: false });
    renderPortfolioLegend();
    renderAssets();
    renderPortfolioKpis();
    renderGoals();
    renderDividends();
    renderGoalManagerList();
    updateGoalProgressPreview();
    if (repairedDividendRows || earnIncomeChanged || dividendIncomeCount) {
      renderCashFlow();
      renderRecent("recentIncome", "income");
      renderMonthlyAnalytics();
      renderReportRows();
    }
    refreshDividendFundamentals();
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
        if (href === "#goal") return openGoalModal();
        if (href === "#report") return openReportModal();
        if (href === "#settings") return openSettingsModal();
        showToast(`เลือก ${item.dataset.section || item.textContent.trim()}`);
      });
    });

    document.querySelector(".goals-panel .ghost-btn")?.addEventListener("click", openGoalModal);
    document.getElementById("monthSelect")?.addEventListener("change", event => {
      selectedCashMonth = event.target.value || ensureCashMonth();
      renderCashFlow();
    });
    document.getElementById("analyticsMode")?.addEventListener("change", event => {
      analyticsMode = event.target.value || "month";
      renderMonthlyAnalytics();
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
    document.getElementById("goalClose")?.addEventListener("click", closeGoalModal);
    document.getElementById("goalCancel")?.addEventListener("click", closeGoalModal);
    document.getElementById("goalForm")?.addEventListener("submit", submitGoalForm);
    document.getElementById("goalDeleteButton")?.addEventListener("click", deleteSelectedGoal);
    document.getElementById("goalNewButton")?.addEventListener("click", () => fillGoalForm(null));
    document.getElementById("goalOverlay")?.addEventListener("click", event => {
      if (event.target.id === "goalOverlay") closeGoalModal();
    });
    document.getElementById("settingsClose")?.addEventListener("click", closeSettingsModal);
    document.getElementById("settingsCancel")?.addEventListener("click", closeSettingsModal);
    document.getElementById("settingsOverlay")?.addEventListener("click", event => {
      if (event.target.id === "settingsOverlay") closeSettingsModal();
    });
    document.getElementById("settingsForm")?.addEventListener("submit", submitSettings);
    ["settingsAppName", "settingsSubtitle", "settingsUserName", "settingsUserEmail"].forEach(id => {
      document.getElementById(id)?.addEventListener("input", updateSettingsDraftFromInputs);
    });
    document.querySelectorAll('input[name="settingsTheme"]').forEach(input => {
      input.addEventListener("change", updateSettingsDraftFromInputs);
    });
    document.getElementById("settingsLogoFile")?.addEventListener("change", event => readSettingsImage(event.target, "logoImage"));
    document.getElementById("settingsAvatarFile")?.addEventListener("change", event => readSettingsImage(event.target, "avatarImage"));
    document.getElementById("settingsResetMedia")?.addEventListener("click", resetSettingsMedia);
    document.getElementById("goalManagerList")?.addEventListener("click", event => {
      const button = event.target.closest("[data-goal-id]");
      if (!button) return;
      const goal = financialGoals.find(item => item.id === button.dataset.goalId);
      if (goal) fillGoalForm(goal);
    });
    document.getElementById("goalIconGrid")?.addEventListener("click", event => {
      const button = event.target.closest("[data-goal-icon]");
      if (!button) return;
      selectedGoalIcon = button.dataset.goalIcon || "target";
      renderGoalIconGrid();
    });
    ["goalName", "goalTargetValue", "goalCurrentValue"].forEach(id => {
      document.getElementById(id)?.addEventListener("input", updateGoalProgressPreview);
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
    document.getElementById("assetTable")?.addEventListener("submit", event => {
      if (event.target?.id === "livePriceForm") addLiveQuote(event);
    });
    document.getElementById("assetTable")?.addEventListener("click", event => {
      const toggleButton = event.target.closest("[data-live-add-toggle]");
      if (toggleButton) {
        const form = document.getElementById("livePriceForm");
        if (form) {
          form.hidden = !form.hidden;
          if (!form.hidden) window.setTimeout(() => document.getElementById("liveQuoteSymbol")?.focus(), 40);
        }
        return;
      }
      const refreshButton = event.target.closest("[data-live-refresh]");
      if (refreshButton) return refreshLiveQuotes();
      const removeButton = event.target.closest("[data-live-remove]");
      if (removeButton) return removeLiveQuote(removeButton.dataset.liveRemove);
    });
    document.addEventListener("keydown", event => {
      if (event.key === "Escape") {
        closeEntryModal();
        closeReportModal();
        closeAssetTransactionModal();
        closeGoalModal();
        closeSettingsModal();
      }
    });
    window.addEventListener("storage", event => {
      if (event.key === storageKeys.portfolio) refreshPortfolioDrivenData();
    });
    window.addEventListener("siamfolio:portfolio-updated", refreshPortfolioDrivenData);
  }

  function init() {
    applyAppSettings();
    updateClock();
    window.setInterval(updateClock, 1000);
    const refreshRealtimeData = () => {
      recordDueDividendsAsIncome({ silent: true });
      refreshLiveQuotes();
      refreshPortfolioPrices();
      refreshDividendFundamentals();
    };
    window.setTimeout(refreshRealtimeData, 700);
    window.setInterval(refreshRealtimeData, PRICE_REFRESH_MS);
    renderPortfolioLegend();
    bindAssetFilters();
    renderAssets();
    renderGoals();
    renderDividends();
    renderExpenseLegend();
    repairInvalidDividendIncomeTransactions();
    recordDailyEarnInterestAsIncome();
    recordDueDividendsAsIncome({ silent: true, rerender: false });
    renderDashboardData();
    bindActions();
    if (window.lucide) window.lucide.createIcons();
    if (["#income", "#expense", "#portfolio", "#goal", "#report", "#settings"].includes(window.location.hash)) {
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
      if (window.location.hash === "#goal") {
        window.setTimeout(openGoalModal, 120);
        return;
      }
      if (window.location.hash === "#settings") {
        window.setTimeout(openSettingsModal, 120);
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
