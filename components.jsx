// Sidebar + Topbar + small shared bits

function Sidebar({ active, onNav, dcaDueCount = 0 }) {
  const items = [
    { key: "dashboard", icon: "home", label: "หน้าแรก", labelShort: "หน้าแรก" },
    { key: "portfolio", icon: "wallet", label: "พอร์ตการลงทุน", labelShort: "พอร์ต" },
    { key: "dca", icon: "dca", label: "DCA Schedule", labelShort: "DCA", badge: dcaDueCount > 0 ? String(dcaDueCount) : null },
    { key: "earn", icon: "earn", label: "Earn", labelShort: "Earn" },
    { key: "history", icon: "history", label: "ประวัติธุรกรรม", labelShort: "ประวัติ", mobileHide: true },
    { key: "tax", icon: "tax", label: "รายงานภาษี", labelShort: "ภาษี", mobileHide: true },
    { key: "bench", icon: "bench", label: "เปรียบเทียบ", labelShort: "เทียบ" },
  ];
  return (
    <aside className="side">
      <div className="side-brand">
        <div className="side-mark">฿</div>
        <div>
          <div className="side-name">SiamFolio</div>
          <div style={{fontSize:11, color:"var(--muted)"}}>DCA Portfolio Tracker</div>
        </div>
      </div>

      <nav className="side-nav">
        <div className="nav-section">เมนูหลัก</div>
        {items.map(it => (
          <button key={it.key} className={`nav-item ${active === it.key ? "is-active" : ""} ${it.mobileHide ? "mobile-hide" : ""}`}
                  onClick={() => onNav(it.key)}>
            <span className="ico"><Ico name={it.icon} size={18}/></span>
            <span className="nav-label-long">{it.label}</span>
            <span className="nav-label-short">{it.labelShort}</span>
            {it.badge && <span className="nav-badge">{it.badge}</span>}
          </button>
        ))}
      </nav>

      <div className="side-foot">
        <div className="avatar">ภ</div>
        <div style={{minWidth:0}}>
          <div style={{fontWeight:600}}>คุณภัทร</div>
          <div style={{color:"var(--muted)", fontSize:11}}>
            สถานะ: <span style={{color:"var(--up)", fontWeight:600}}>● ออนไลน์</span>
          </div>
        </div>
      </div>
    </aside>
  );
}

function Topbar({ ccy, onCcy, onAdd, priceStatus, onSettings, searchQuery, onSearch }) {
  const today = new Date();
  const days = ["อาทิตย์","จันทร์","อังคาร","พุธ","พฤหัสบดี","ศุกร์","เสาร์"];
  const months = ["ม.ค.","ก.พ.","มี.ค.","เม.ย.","พ.ค.","มิ.ย.","ก.ค.","ส.ค.","ก.ย.","ต.ค.","พ.ย.","ธ.ค."];
  const dateStr = `วัน${days[today.getDay()]}ที่ ${today.getDate()} ${months[today.getMonth()]} ${today.getFullYear() + 543}`;

  // Compute status label
  let statusClass = "stale", statusLabel = "ยังไม่ได้รีเฟรช";
  if (priceStatus?.loading) {
    statusClass = "loading"; statusLabel = "กำลังโหลดราคา...";
  } else if (priceStatus?.lastUpdate) {
    const ageSec = Math.floor((Date.now() - priceStatus.lastUpdate) / 1000);
    if (ageSec < 90) { statusClass = "live"; statusLabel = `Live · ${ageSec}s`; }
    else { statusClass = "stale"; statusLabel = `อัพเดต ${Math.floor(ageSec/60)}m ที่แล้ว`; }
  }
  if (priceStatus?.error) { statusClass = "stale"; statusLabel = "ดึงราคาไม่สำเร็จ"; }

  return (
    <div className="topbar">
      <div className="greeting">
        <h1>สวัสดีค่ะ คุณภัทร 👋</h1>
        <p>{dateStr} · <span className={`price-status ${statusClass}`}
              onClick={() => priceStatus?.refresh()}
              title="คลิกเพื่อรีเฟรชราคา">{statusLabel}</span></p>
      </div>
      <div className="topbar-actions">
        <div className="ccy-toggle" role="tablist">
          <button className={ccy === "THB" ? "is-on" : ""} onClick={() => onCcy("THB")}>฿ THB</button>
          <button className={ccy === "USD" ? "is-on" : ""} onClick={() => onCcy("USD")}>$ USD</button>
        </div>
        <div className="search">
          <Ico name="search" size={16}/>
          <input placeholder="ค้นหา ticker..."
                 value={searchQuery || ""}
                 onChange={e => onSearch && onSearch(e.target.value)}/>
          {searchQuery && (
            <button onClick={() => onSearch("")}
                    style={{background:"none",border:"none",cursor:"pointer",padding:"0 4px",color:"var(--muted)",lineHeight:1,fontSize:16}}>
              ×
            </button>
          )}
        </div>
        <button className="icon-btn" aria-label="ตั้งค่า" onClick={onSettings} title="ตั้งค่า">
          <Ico name="settings" size={18}/>
        </button>
        <button className="btn primary" onClick={onAdd}>
          <Ico name="plus" size={16}/> เพิ่มธุรกรรม
        </button>
      </div>
    </div>
  );
}

// Currency formatters
function fmtCcy(amount, ccy) {
  if (ccy === "THB") {
    return "฿" + Math.round(amount).toLocaleString("th-TH");
  }
  return "$" + amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function fmtNum(amount, decimals = 2) {
  return amount.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}
function fmtPct(p) {
  const s = (p >= 0 ? "+" : "") + p.toFixed(2) + "%";
  return s;
}

// Convert native value to display currency
function toDisplay(nativeAmount, fromCcy, dispCcy, FX) {
  if (fromCcy === dispCcy) return nativeAmount;
  if (fromCcy === "USD" && dispCcy === "THB") return nativeAmount * FX;
  if (fromCcy === "THB" && dispCcy === "USD") return nativeAmount / FX;
  return nativeAmount;
}

window.Sidebar = Sidebar;
window.Topbar = Topbar;
window.fmtCcy = fmtCcy;
window.fmtNum = fmtNum;
window.fmtPct = fmtPct;
window.toDisplay = toDisplay;

// ===== Menu (dropdown) =====
function Menu({ items, label = "Actions" }) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef(null);

  React.useEffect(() => {
    if (!open) return;
    const onDoc = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  return (
    <div className="menu-wrap" ref={ref}>
      <button className={`row-action ${open ? "is-open" : ""}`}
              aria-label={label}
              onClick={(e) => { e.stopPropagation(); setOpen(o => !o); }}>
        <Ico name="more" size={16}/>
      </button>
      {open && (
        <div className="menu" onClick={(e) => e.stopPropagation()}>
          {items.map((it, i) => {
            if (it.sep) return <div className="sep" key={"sep"+i}/>;
            return (
              <button key={i} className={it.danger ? "danger" : ""}
                      onClick={() => { setOpen(false); it.onClick && it.onClick(); }}>
                {it.icon && <Ico name={it.icon} size={15}/>}
                <span>{it.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ===== Confirm dialog =====
// kind: "soft" (just Yes/No) | "type" (must type the ticker to confirm)
function ConfirmDialog({ open, title, body, confirmLabel, requireType, onCancel, onConfirm }) {
  const [typed, setTyped] = React.useState("");
  React.useEffect(() => { if (open) setTyped(""); }, [open]);

  const canConfirm = !requireType || typed.trim() === requireType;

  React.useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") onCancel();
      if (e.key === "Enter" && canConfirm) onConfirm();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, canConfirm, onConfirm, onCancel]);

  if (!open) return null;

  const onScrim = (e) => { if (e.target === e.currentTarget) onCancel(); };

  return (
    <div className="modal-scrim" onClick={onScrim}>
      <div className="modal" role="dialog" aria-modal="true">
        <div className="modal-ico"><Ico name="trash" size={22}/></div>
        <h3>{title}</h3>
        <p>{body}</p>
        {requireType && (
          <>
            <div style={{fontSize:12, color:"var(--muted)", marginBottom:6}}>
              พิมพ์ <b style={{fontFamily:"var(--font-mono)", color:"var(--ink)"}}>{requireType}</b> เพื่อยืนยัน
            </div>
            <input className="confirm-input" autoFocus
                   value={typed}
                   onChange={e => setTyped(e.target.value)}
                   placeholder={requireType}/>
          </>
        )}
        <div className="modal-actions">
          <button className="btn" onClick={onCancel}>ยกเลิก</button>
          <button className="btn danger" disabled={!canConfirm} onClick={onConfirm}>
            <Ico name="trash" size={14}/> {confirmLabel || "ลบ"}
          </button>
        </div>
      </div>
    </div>
  );
}

window.Menu = Menu;
window.ConfirmDialog = ConfirmDialog;

// ─────── AssetIcon — auto-fetches logo from CoinGecko CDN (crypto) or Parqet CDN (stocks) ───────
// Falls back to a coloured letter badge on any load error.
const _ICON_CACHE = {}; // page-lifetime cache; avoids re-fetching on re-render

// CoinGecko CDN URLs — matches COINGECKO_IDS in worker.js
const _CG_ICONS = {
  BTC:   "https://assets.coingecko.com/coins/images/1/small/bitcoin.png",
  ETH:   "https://assets.coingecko.com/coins/images/279/small/ethereum.png",
  SOL:   "https://assets.coingecko.com/coins/images/4128/small/solana.png",
  XAUT:  "https://assets.coingecko.com/coins/images/10058/small/tether-gold.png",
  ADA:   "https://assets.coingecko.com/coins/images/975/small/cardano.png",
  XRP:   "https://assets.coingecko.com/coins/images/44/small/xrp-symbol-white-128.png",
  DOGE:  "https://assets.coingecko.com/coins/images/5/small/dogecoin.png",
  MATIC: "https://assets.coingecko.com/coins/images/4713/small/polygon.png",
  BNB:   "https://assets.coingecko.com/coins/images/825/small/bnb-icon2_2x.png",
  AVAX:  "https://assets.coingecko.com/coins/images/12559/small/Avalanche_Circle_RedWhite_Trans.png",
  LINK:  "https://assets.coingecko.com/coins/images/877/small/chainlink-new-logo.png",
  DOT:   "https://assets.coingecko.com/coins/images/12171/small/polkadot.png",
};

// Parqet logo CDN for stocks (strips .BK / .NYSE suffix automatically)
function _stockIconUrl(ticker) {
  return `https://assets.parqet.com/logos/symbol/${ticker.replace(/\.[A-Z]+$/i, "")}`;
}

const _CLASS_BG = {
  us:     "#3264C8",
  th:     "#C84820",
  crypto: "#D07800",
  gold:   "#B87C10",
};

function AssetIcon({ ticker, classKey, size = 32 }) {
  const url = React.useMemo(() => {
    if (classKey === "crypto" || classKey === "gold") return _CG_ICONS[ticker] || null;
    return _stockIconUrl(ticker);
  }, [ticker, classKey]);

  // cached === "ok" | "fail" | undefined
  const [imgState, setImgState] = React.useState(() => _ICON_CACHE[ticker] || (url ? "idle" : "fail"));

  const onLoad  = () => { _ICON_CACHE[ticker] = "ok";   setImgState("ok"); };
  const onError = () => { _ICON_CACHE[ticker] = "fail"; setImgState("fail"); };

  const isCircle = classKey === "crypto" || classKey === "gold";
  const bg    = _CLASS_BG[classKey] || "#888";
  const label = classKey === "gold" ? "Au"
              : ticker.replace(/\.[A-Z]+$/i, "").slice(0, 2).toUpperCase();

  return (
    <div style={{
      width: size, height: size, flexShrink: 0,
      borderRadius: isCircle ? "50%" : Math.round(size * 0.28),
      overflow: "hidden",
      background: imgState === "ok" ? "#fff" : bg,
      display: "flex", alignItems: "center", justifyContent: "center",
      border: "1.5px solid rgba(0,0,0,0.08)",
      boxShadow: "0 1px 4px rgba(0,0,0,0.10)",
      transition: "background 0.25s",
    }}>
      {url && imgState !== "fail" && (
        <img src={url} alt={ticker}
             width={Math.round(size * 0.72)} height={Math.round(size * 0.72)}
             style={{ display: imgState === "ok" ? "block" : "none", objectFit: "contain" }}
             onLoad={onLoad} onError={onError}/>
      )}
      {imgState !== "ok" && (
        <span style={{
          fontSize: Math.round(size * 0.33), fontWeight: 700,
          color: "white", letterSpacing: "-0.5px", lineHeight: 1,
          fontFamily: "var(--font-num)",
        }}>{label}</span>
      )}
    </div>
  );
}

window.AssetIcon = AssetIcon;
