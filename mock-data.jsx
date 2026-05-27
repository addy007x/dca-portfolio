// Mock portfolio data — TH stocks, US stocks, crypto, gold
// Prices in their native currency; THB↔USD conversion via FX rate.

const FX = 35.8; // 1 USD = 35.8 THB

// Each holding has: ticker, name (thai/en), class, currency, qty, costAvg (native), price (native), spark[]
const HOLDINGS_MIXED = [
  // US stocks (USD)
  { ticker: "NVDA", name: "Nvidia Corp.", classKey: "us", ccy: "USD", qty: 12, costAvg: 412.3, price: 487.20, spark: [410,422,415,440,455,470,462,487], chg1d: 1.82 },
  { ticker: "AAPL", name: "Apple Inc.", classKey: "us", ccy: "USD", qty: 28, costAvg: 178.5, price: 192.40, spark: [178,180,176,182,188,185,190,192], chg1d: 0.48 },
  { ticker: "VOO", name: "Vanguard S&P 500 ETF", classKey: "us", ccy: "USD", qty: 18, costAvg: 432.0, price: 461.10, spark: [432,438,441,446,452,455,458,461], chg1d: 0.21 },
  { ticker: "TSLA", name: "Tesla, Inc.", classKey: "us", ccy: "USD", qty: 14, costAvg: 245.0, price: 218.50, spark: [245,238,230,225,220,222,218,218], chg1d: -1.40 },

  // TH stocks (THB)
  { ticker: "PTT", name: "ปตท. จำกัด (มหาชน)", classKey: "th", ccy: "THB", qty: 1200, costAvg: 35.5, price: 36.75, spark: [35.5,36.0,35.8,36.2,36.4,36.6,36.7,36.75], chg1d: 0.68 },
  { ticker: "KBANK", name: "ธนาคารกสิกรไทย", classKey: "th", ccy: "THB", qty: 400, costAvg: 138.5, price: 145.00, spark: [138,140,142,141,143,144,144,145], chg1d: 0.69 },
  { ticker: "AOT", name: "ท่าอากาศยานไทย", classKey: "th", ccy: "THB", qty: 800, costAvg: 64.2, price: 58.50, spark: [64,63,62,61,60,59,58.8,58.5], chg1d: -0.85 },
  { ticker: "CPALL", name: "ซีพี ออลล์", classKey: "th", ccy: "THB", qty: 600, costAvg: 56.0, price: 62.25, spark: [56,57,58,60,61,61.5,62,62.25], chg1d: 0.40 },

  // Crypto (USD-quoted)
  { ticker: "BTC", name: "Bitcoin", classKey: "crypto", ccy: "USD", qty: 0.42, costAvg: 38500, price: 67200, spark: [38500,42000,48000,55000,58000,62000,65000,67200], chg1d: 2.34 },
  { ticker: "ETH", name: "Ethereum", classKey: "crypto", ccy: "USD", qty: 4.8, costAvg: 2350, price: 3480, spark: [2350,2500,2700,2900,3100,3250,3400,3480], chg1d: 1.78 },
  { ticker: "SOL", name: "Solana", classKey: "crypto", ccy: "USD", qty: 65, costAvg: 88.5, price: 145.20, spark: [88,95,110,122,130,138,142,145], chg1d: 3.12 },

  // Gold (USD per troy oz, XAUT)
  { ticker: "XAUT", name: "ทองคำ (Tether Gold)", classKey: "gold", ccy: "USD", qty: 2.6, costAvg: 1980, price: 2342.5, spark: [1980,2020,2080,2140,2200,2260,2320,2342], chg1d: 0.42 },
];

// Generate hold-only loss scenario by inverting some prices
function makeScenario(name) {
  if (name === "gain") {
    return HOLDINGS_MIXED.map(h => ({ ...h, price: h.costAvg * 1.18, chg1d: Math.abs(h.chg1d) }));
  }
  if (name === "loss") {
    return HOLDINGS_MIXED.map(h => ({ ...h, price: h.costAvg * 0.83, chg1d: -Math.abs(h.chg1d) }));
  }
  return HOLDINGS_MIXED;
}

// Portfolio value time series (THB) — last 6 months daily-ish (~180 points)
function genHistory(seed = 1, base = 4_500_000, drift = 0.0008, vol = 0.012, n = 180) {
  const out = [];
  let v = base;
  let rng = seed * 7919;
  for (let i = 0; i < n; i++) {
    rng = (rng * 1103515245 + 12345) & 0x7fffffff;
    const noise = (rng / 0x7fffffff - 0.5) * 2;
    v *= 1 + drift + noise * vol;
    out.push(v);
  }
  return out;
}

const PORTFOLIO_HISTORY = {
  "1M": genHistory(2, 5_100_000, 0.0015, 0.012, 30),
  "3M": genHistory(3, 4_900_000, 0.0010, 0.011, 90),
  "6M": genHistory(4, 4_600_000, 0.0009, 0.012, 180),
  "1Y": genHistory(5, 4_200_000, 0.0007, 0.013, 250),
  "ALL": genHistory(6, 3_400_000, 0.0006, 0.014, 500),
};

// DCA schedules
const DCA_SCHEDULES = [
  { ticker: "VOO", classKey: "us", ccy: "USD", amount: 200, freq: "สัปดาห์", nextIn: "อีก 3 วัน", since: "ก.พ. 2024", executed: 64, total: 12800 },
  { ticker: "BTC", classKey: "crypto", ccy: "USD", amount: 100, freq: "สัปดาห์", nextIn: "อีก 6 วัน", since: "ม.ค. 2024", executed: 70, total: 7000 },
  { ticker: "ETH", classKey: "crypto", ccy: "USD", amount: 50, freq: "สัปดาห์", nextIn: "อีก 6 วัน", since: "ม.ค. 2024", executed: 70, total: 3500 },
  { ticker: "PTT", classKey: "th", ccy: "THB", amount: 5000, freq: "เดือน", nextIn: "อีก 12 วัน", since: "ต.ค. 2023", executed: 19, total: 95000 },
  { ticker: "XAUT", classKey: "gold", ccy: "USD", amount: 150, freq: "เดือน", nextIn: "อีก 12 วัน", since: "พ.ย. 2023", executed: 18, total: 2700 },
];

// Earn positions (crypto)
const EARN_POSITIONS = [
  { sym: "USDT", qty: 4136.39, apy: 15.0, kind: "ยืดหยุ่น", earnedToday: 0.63 },
  { sym: "USDC", qty: 2200.00, apy: 12.5, kind: "ยืดหยุ่น", earnedToday: 0.28 },
  { sym: "BTC",  qty: 0.05,    apy: 4.5,  kind: "ล็อก 30 วัน", earnedToday: 12.4 }, // 12.4 USD value
  { sym: "ETH",  qty: 1.2,     apy: 5.2,  kind: "ล็อก 30 วัน", earnedToday: 6.10 },
  { sym: "SOL",  qty: 12.0,    apy: 7.8,  kind: "สเตก", earnedToday: 2.20 },
];

// Transactions (for detail view example, NVDA)
const TX_NVDA = [
  { kind: "dca",  date: "20 พ.ค. 2026", note: "DCA อัตโนมัติ — สัปดาห์", qty: 0.41, valUSD: 200.00 },
  { kind: "dca",  date: "13 พ.ค. 2026", note: "DCA อัตโนมัติ — สัปดาห์", qty: 0.42, valUSD: 200.00 },
  { kind: "buy",  date: "06 พ.ค. 2026", note: "Manual buy", qty: 2.00, valUSD: 950.00 },
  { kind: "dca",  date: "29 เม.ย. 2026", note: "DCA อัตโนมัติ — สัปดาห์", qty: 0.44, valUSD: 200.00 },
  { kind: "buy",  date: "10 เม.ย. 2026", note: "Manual buy", qty: 5.00, valUSD: 2150.00 },
  { kind: "sell", date: "22 มี.ค. 2026", note: "Trim profit", qty: -1.00, valUSD: 480.00 },
];

const BENCHMARKS = [
  { ticker: "พอร์ตคุณ",  ytd: 18.4,  isYou: true },
  { ticker: "SET",     ytd: 4.2 },
  { ticker: "S&P 500", ytd: 11.8 },
  { ticker: "BTC",     ytd: 32.6 },
  { ticker: "ทองคำ",    ytd: 14.3 },
];

const REBALANCE_ALERTS = [
  { ticker: "BTC", classKey: "crypto", action: "sell", delta: "+8.2%", reason: "เกินเป้า 25% (ปัจจุบัน 33.2%)" },
  { ticker: "PTT", classKey: "th", action: "buy", delta: "−3.4%", reason: "ต่ำกว่าเป้า 10% (ปัจจุบัน 6.6%)" },
  { ticker: "XAUT", classKey: "gold", action: "buy", delta: "−1.8%", reason: "ต่ำกว่าเป้า 8% (ปัจจุบัน 6.2%)" },
];

window.MOCK = {
  FX,
  HOLDINGS_MIXED,
  makeScenario,
  PORTFOLIO_HISTORY,
  DCA_SCHEDULES,
  EARN_POSITIONS,
  TX_NVDA,
  BENCHMARKS,
  REBALANCE_ALERTS,
};
