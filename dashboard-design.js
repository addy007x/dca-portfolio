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

  const assets = [
    { symbol: "BTC", name: "Bitcoin", color: "#d8b45f", share: 25, value: 299955, pnl: 22875, pct: 8.25 },
    { symbol: "TRX", name: "TRON", color: "#8fd6c2", share: 8, value: 95985, pnl: 2915, pct: 3.12 },
    { symbol: "XAUT", name: "Tether Gold", color: "#f2d48a", share: 10, value: 119982, pnl: 4615, pct: 4.01 },
    { symbol: "TSM", name: "Taiwan Semiconductor", color: "#7bb7ff", share: 15, value: 179973, pnl: 10554, pct: 6.21 },
    { symbol: "NVDA", name: "NVIDIA", color: "#c9a56a", share: 15, value: 179973, pnl: 12382, pct: 7.38 },
    { symbol: "GOOGL", name: "Alphabet", color: "#6ee7a5", share: 20, value: 239964, pnl: 11491, pct: 5.05 },
    { symbol: "LLY", name: "Eli Lilly", color: "#a78bfa", share: 7, value: 83988, pnl: 2264, pct: 2.77 }
  ];

  const incomeRows = [
    ["27/06/2026", "เงินเดือนรายเดือน", 30000],
    ["27/06/2026", "เงินปันผล NVDA", 5000],
    ["27/06/2026", "โปรเจกต์เสริม", 3200],
    ["26/06/2026", "เงินปันผล SCHD", 4500],
    ["26/06/2026", "รายได้จากงานฟรีแลนซ์", 2300]
  ];

  const expenseRows = [
    ["27/06/2026", "อาหารเย็น", 250],
    ["27/06/2026", "เชื้อเพลิง", 500],
    ["27/06/2026", "บัตรเครดิต", 700],
    ["26/06/2026", "สุขภาพ", 1200],
    ["26/06/2026", "ค่าสมัครสมาชิก", 2500]
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
    muted: "rgba(169,160,146,.55)",
    panel: "rgba(6,6,6,.72)",
    good: "#6ee7a5",
    bad: "#f28f7f",
    gold: "#d8b45f",
    goldBright: "#f2d48a",
    goldSoft: "rgba(216,180,95,.24)",
    blue: "#7bb7ff"
  };

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

  function createCharts() {
    if (!window.Chart) return;

    Chart.defaults.color = chartColors.text;
    Chart.defaults.font.family = "'Inter', 'Noto Sans Thai', sans-serif";
    Chart.defaults.borderColor = chartColors.grid;

    const doughnutOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          padding: 12,
          cornerRadius: 12,
          backgroundColor: "rgba(8,8,7,.94)",
          titleColor: chartColors.goldBright,
          bodyColor: "#f7f0df",
          borderColor: "rgba(216,180,95,.38)",
          borderWidth: 1
        }
      }
    };

    const trendCanvas = document.getElementById("trendChart");
    if (trendCanvas) {
      new Chart(trendCanvas, {
        data: {
          labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
          datasets: [
            {
              type: "bar",
              label: "รายรับ",
              data: [38000, 42000, 46000, 41000, 50000, 45000],
              backgroundColor: "rgba(216,180,95,.70)",
              borderRadius: 8,
              maxBarThickness: 26
            },
            {
              type: "bar",
              label: "รายจ่าย",
              data: [23000, 21500, 26000, 24000, 28500, 21450],
              backgroundColor: "rgba(242,143,127,.55)",
              borderRadius: 8,
              maxBarThickness: 26
            },
            {
              type: "line",
              label: "คงเหลือ",
              data: [15000, 20500, 20000, 17000, 21500, 23550],
              borderColor: chartColors.goldBright,
              pointBackgroundColor: chartColors.goldBright,
              tension: .42,
              borderWidth: 2
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          interaction: { mode: "index", intersect: false },
          plugins: {
            legend: {
              position: "bottom",
              labels: { boxWidth: 10, boxHeight: 10, padding: 16 }
            }
          },
          scales: {
            x: { grid: { display: false } },
            y: {
              beginAtZero: true,
              ticks: { callback: value => `${number.format(value / 1000)}K` },
              grid: { color: chartColors.grid }
            }
          }
        }
      });
    }

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

  function renderRecent(id, rows, type) {
    const target = document.getElementById(id);
    if (!target) return;
    target.innerHTML = rows.map(([date, title, amount]) => `
      <div class="recent-item">
        <span>${date}</span>
        <b>${title}</b>
        <em class="${type}">${type === "income" ? "+" : "-"}${shortTHB(amount)}</em>
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

  function showToast(message) {
    const toast = document.getElementById("toast");
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add("show");
    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(() => toast.classList.remove("show"), 1800);
  }

  function bindActions() {
    const actionRoutes = {
      "Add Income": "./accounting-business.html#income",
      "Add Expense": "./accounting-business.html#expense",
      Transfer: "./accounting-business.html#accounts",
      Rebalance: "./index.html#rebalance",
      Report: "./accounting-business.html#reports"
    };

    document.querySelectorAll("[data-action]").forEach(button => {
      button.addEventListener("click", () => {
        const action = button.dataset.action;
        showToast(`กำลังเปิด ${action}`);
        const route = actionRoutes[action];
        if (route) window.setTimeout(() => { window.location.href = route; }, 450);
      });
    });

    document.querySelectorAll(".side-menu a").forEach(item => {
      item.addEventListener("click", event => {
        event.preventDefault();
        document.querySelectorAll(".side-menu a").forEach(link => link.classList.remove("active"));
        item.classList.add("active");
        showToast(`เลือก ${item.dataset.section}`);
      });
    });
  }

  function init() {
    updateClock();
    window.setInterval(updateClock, 1000);
    createCharts();
    renderPortfolioLegend();
    renderAssets();
    renderRecent("recentIncome", incomeRows, "income");
    renderRecent("recentExpense", expenseRows, "expense");
    renderGoals();
    renderDividends();
    renderExpenseLegend();
    bindActions();
    if (window.lucide) window.lucide.createIcons();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
