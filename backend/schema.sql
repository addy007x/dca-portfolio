-- SiamFolio D1 schema
-- Run via: wrangler d1 execute siamfolio --file=schema.sql
--      or paste into D1 console in Cloudflare dashboard

CREATE TABLE IF NOT EXISTS holdings (
  id        TEXT PRIMARY KEY,
  ticker    TEXT NOT NULL,
  name      TEXT,
  classKey  TEXT NOT NULL,
  ccy       TEXT NOT NULL,
  qty       REAL NOT NULL,
  costAvg   REAL NOT NULL,
  price     REAL DEFAULT 0,
  chg1d     REAL DEFAULT 0,
  spark     TEXT,           -- JSON-encoded number[]
  updated_at INTEGER
);
CREATE INDEX IF NOT EXISTS idx_holdings_ticker ON holdings(ticker);

CREATE TABLE IF NOT EXISTS transactions (
  id           TEXT PRIMARY KEY,
  ticker       TEXT NOT NULL,
  kind         TEXT NOT NULL,    -- 'buy' | 'sell' | 'dca'
  date         TEXT NOT NULL,    -- ISO YYYY-MM-DD
  qty          REAL NOT NULL,    -- signed; negative for sell
  pricePerUnit REAL NOT NULL,
  valUSD       REAL,
  ccy          TEXT,
  note         TEXT,
  dca_id       TEXT
);
CREATE INDEX IF NOT EXISTS idx_transactions_ticker ON transactions(ticker);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);

CREATE TABLE IF NOT EXISTS dca_schedules (
  id            TEXT PRIMARY KEY,
  ticker        TEXT NOT NULL,
  classKey      TEXT,
  ccy           TEXT NOT NULL,
  amount        REAL NOT NULL,
  freq          TEXT NOT NULL,    -- 'daily' | 'weekly' | 'biweekly' | 'monthly'
  startDate     TEXT,
  nextDate      TEXT,             -- ISO YYYY-MM-DD
  execTime      TEXT,               -- "HH:MM" UTC+7 notification time
  executedCount INTEGER DEFAULT 0,
  totalSpent    REAL DEFAULT 0,
  paused        INTEGER DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_dca_next ON dca_schedules(nextDate, paused);

CREATE TABLE IF NOT EXISTS earn_positions (
  id          TEXT PRIMARY KEY,
  sym         TEXT NOT NULL,
  qty         REAL NOT NULL,
  apy         REAL NOT NULL,
  kind        TEXT,
  earnedToday REAL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS dca_log (
  id         TEXT PRIMARY KEY,
  dca_id     TEXT NOT NULL,
  date       TEXT NOT NULL,
  ticker     TEXT,
  amount     REAL,
  status     TEXT,   -- 'due' | 'notified' | 'executed' | 'dismissed'
  created_at INTEGER
);
CREATE INDEX IF NOT EXISTS idx_log_status ON dca_log(status, created_at);

-- Google login users and per-user portfolio snapshots.
CREATE TABLE IF NOT EXISTS users (
  id            TEXT PRIMARY KEY,
  email         TEXT,
  name          TEXT,
  picture       TEXT,
  created_at    INTEGER,
  last_login_at INTEGER
);

CREATE TABLE IF NOT EXISTS user_sessions (
  token_hash TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL,
  email      TEXT,
  name       TEXT,
  picture    TEXT,
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_exp ON user_sessions(expires_at);

CREATE TABLE IF NOT EXISTS portfolio_snapshots (
  user_id    TEXT PRIMARY KEY,
  data       TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);

-- LINE OA targets captured automatically from webhook events.
CREATE TABLE IF NOT EXISTS line_targets (
  id           TEXT PRIMARY KEY,
  kind         TEXT,
  display_name TEXT,
  created_at   INTEGER NOT NULL,
  last_seen_at INTEGER NOT NULL
);
