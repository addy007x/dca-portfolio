// SiamFolio — Section page views
// DCAView, EarnView, HistoryView, PortfolioView

// ─────── Shared page shell ───────
function PageShell({ title, sub, actions, children }) {
  return (
    <div className="page-shell">
      <div className="page-head">
        <div>
          <h2 className="page-title">{title}</h2>
          {sub && <div className="card-sub" style={{marginTop:2}}>{sub}</div>}
        </div>
        {actions && <div className="card-act">{actions}</div>}
      </div>
      {children}
    </div>
  );
}

// ─────── DCA View ───────
function DCAView({ ccy, onAddDCA, onEditDCA }) {
  const store = window.useStore();
  const FX = store.fx || 35.8;
  const dcaList = store.dca;
  const [confirm, setConfirm] = React.useState(null);
  const ccySym = ccy === "THB" ? "฿" : "$";

  const totalMonthly = dcaList.filter(d => !d.paused).reduce((s, d) => {
    const perMonth = { daily: 30, weekly: 4.33, biweekly: 2.17, monthly: 1 }[d.freq] || 4;
    const usd = d.ccy === "USD" ? d.amount * perMonth : d.amount * perMonth / FX;
    return s + (ccy === "THB" ? usd * FX : usd);
  }, 0);

  const active = dcaList.filter(d => !d.paused).length;
  const paused = dcaList.filter(d => d.paused).length;

  return (
    <PageShell
      title="ตารางลงทุนอัตโนมัติ (DCA)"
      sub={`${dcaList.length} รายการ · ${active} กำลังทำงาน · ${paused} หยุดชั่วคราว`}
      actions={
        <button className="btn primary" onClick={onAddDCA}>
          <Ico name="plus" size={14}/> ตั้ง DCA ใหม่
        </button>
      }
    >
      {/* Stats row */}
      <div className="kpi-grid" style={{marginBottom:20}}>
        <div className="kpi">
          <div className="label">รายการทั้งหมด</div>
          <div className="value">{dcaList.length}</div>
          <div className="delta" style={{color:"var(--muted)"}}>DCA schedules</div>
        </div>
        <div className="kpi">
          <div className="label">ลงทุนต่อเดือน</div>
          <div className="value">{ccySym}{Math.round(totalMonthly).toLocaleString()}</div>
          <div className="delta" style={{color:"var(--accent-ink)"}}>ประมาณการ</div>
        </div>
        <div className="kpi">
          <div className="label">กำลังทำงาน</div>
          <div className="value" style={{color:"var(--up)"}}>{active}</div>
          <div className="delta up">Active</div>
        </div>
        <div className="kpi">
          <div className="label">หยุดชั่วคราว</div>
          <div className="value" style={{color:"var(--muted)"}}>{paused}</div>
          <div className="delta" style={{color:"var(--muted)"}}>Paused</div>
        </div>
      </div>

      {/* DCA table */}
      <div className="card" style={{padding:0, overflow:"visible"}}>
        {dcaList.length === 0 ? (
          <div style={{padding:40, textAlign:"center", color:"var(--muted)"}}>
            <div style={{fontSize:32, marginBottom:10}}>📅</div>
            <div style={{fontWeight:600, marginBottom:6}}>ยังไม่มีตาราง DCA</div>
            <div style={{fontSize:13, marginBottom:16}}>เริ่มต้นลงทุนแบบสม่ำเสมอด้วยการตั้ง DCA แรก</div>
            <button className="btn primary" onClick={onAddDCA}>
              <Ico name="plus" size={14}/> ตั้ง DCA แรก
            </button>
          </div>
        ) : (
          <>
            <div className="dca-page-head">
              <div>สินทรัพย์</div>
              <div>จำนวน / ความถี่</div>
              <div>ครั้งถัดไป</div>
              <div>เวลา</div>
              <div>ทำไปแล้ว</div>
              <div>ยอดรวม</div>
              <div>สถานะ</div>
              <div></div>
            </div>
            {dcaList.map(d => {
              const daysLeft = d.nextDate ? window.daysBetween(window.todayISO(), d.nextDate) : null;
              const freqLabel = { daily: "วัน", weekly: "สัปดาห์", biweekly: "2 สัปดาห์", monthly: "เดือน" }[d.freq] || d.freq;
              const isOverdue = daysLeft !== null && daysLeft <= 0;
              const isDueSoon = daysLeft !== null && daysLeft > 0 && daysLeft <= 2;

              return (
                <div className="dca-page-row" key={d.id}>
                  <div className="asset-name">
                    <div className={`asset-logo ${d.classKey}`} style={{width:32, height:32, fontSize:12}}>
                      {d.ticker === "XAUT" ? "Au" : d.ticker.slice(0,2)}
                    </div>
                    <div>
                      <div style={{fontWeight:700, fontFamily:"var(--font-mono)", fontSize:13}}>{d.ticker}</div>
                      <div style={{fontSize:11, color:"var(--muted)"}}>{d.classKey?.toUpperCase()}</div>
                    </div>
                  </div>
                  <div>
                    <div className="num" style={{fontWeight:700}}>
                      {d.ccy === "THB" ? "฿" : "$"}{fmtNum(d.amount, 0)}
                    </div>
                    <div style={{fontSize:11, color:"var(--muted)"}}>ทุก{freqLabel}</div>
                  </div>
                  <div>
                    {d.paused ? (
                      <span style={{color:"var(--muted)", fontSize:12}}>—</span>
                    ) : (
                      <>
                        <div style={{fontSize:12, fontWeight:600, color: isOverdue ? "var(--down)" : isDueSoon ? "var(--accent-ink)" : "var(--ink)"}}>
                          {isOverdue ? "⚡ ถึงรอบแล้ว!" : isDueSoon ? `⏰ อีก ${daysLeft} วัน` : `อีก ${daysLeft} วัน`}
                        </div>
                        <div style={{fontSize:11, color:"var(--muted)"}}>{d.nextDate}</div>
                      </>
                    )}
                  </div>
                  <div>
                    <div style={{fontSize:13, fontWeight:600, fontFamily:"var(--font-mono)", color:"var(--accent-ink)"}}>
                      {d.execTime || "—"}
                    </div>
                    <div style={{fontSize:10, color:"var(--muted)"}}>น. (ICT)</div>
                  </div>
                  <div>
                    <div className="num" style={{fontWeight:600}}>{d.executedCount || 0} <span style={{color:"var(--muted)", fontWeight:400}}>ครั้ง</span></div>
                  </div>
                  <div>
                    <div className="num" style={{fontWeight:700}}>
                      {d.ccy === "THB" ? "฿" : "$"}{fmtNum(d.totalSpent || 0, 0)}
                    </div>
                    <div style={{fontSize:11, color:"var(--muted)"}}>ลงทุนสะสม</div>
                  </div>
                  <div>
                    <span className={`pill ${d.paused ? "" : "buy"}`} style={d.paused ? {background:"var(--surface-2)", color:"var(--muted)"} : {}}>
                      {d.paused ? "หยุด" : "กำลังทำ"}
                    </span>
                  </div>
                  <div onClick={e => e.stopPropagation()}>
                    <Menu items={[
                      { label: "แก้ไข DCA", icon: "edit", onClick: () => onEditDCA && onEditDCA(d) },
                      { label: d.paused ? "เริ่มทำงาน" : "หยุดชั่วคราว", icon: "pause",
                        onClick: () => window.updateDCA(d.id, { paused: !d.paused }) },
                      { label: "บันทึกว่าซื้อแล้ว", icon: "plus",
                        onClick: () => window.executeDCA(d.id) },
                      { sep: true },
                      { label: "ลบ DCA", icon: "trash", danger: true,
                        onClick: () => setConfirm({
                          title: `ลบ DCA ${d.ticker}?`,
                          body: `DCA ${d.ccy === "THB" ? "฿" : "$"}${fmtNum(d.amount,0)} ทุก${freqLabel} จะถูกยกเลิก`,
                          confirmLabel: "ลบ DCA",
                          onConfirm: () => window.removeDCA(d.id)
                        })
                      },
                    ]}/>
                  </div>
                </div>
              );
            })}
          </>
        )}
      </div>

      <ConfirmDialog open={!!confirm} title={confirm?.title} body={confirm?.body}
                     confirmLabel={confirm?.confirmLabel}
                     onCancel={() => setConfirm(null)} onConfirm={() => { confirm?.onConfirm(); setConfirm(null); }}/>
    </PageShell>
  );
}

// ─────── History View ───────
function HistoryView({ ccy }) {
  const store = window.useStore();
  const FX = store.fx || 35.8;
  const [filter, setFilter] = React.useState("all");
  const [search, setSearch] = React.useState("");
  const ccySym = ccy === "THB" ? "฿" : "$";

  const txs = (store.transactions || []).filter(t => {
    if (filter !== "all" && t.kind !== filter) return false;
    if (search && !t.ticker?.toUpperCase().includes(search.toUpperCase())) return false;
    return true;
  });

  const totalBought = store.transactions.filter(t => t.kind !== "sell")
    .reduce((s, t) => s + (t.valUSD || 0), 0);

  const kindLabel = { buy:"ซื้อ", sell:"ขาย", dca:"DCA" };
  const kindColor = { buy:"var(--up)", sell:"var(--down)", dca:"var(--accent-ink)" };

  return (
    <PageShell
      title="ประวัติธุรกรรม"
      sub={`${store.transactions.length} รายการ · ลงทุนสะสม ${ccySym}${fmtNum(ccy === "THB" ? totalBought * FX : totalBought, 2)}`}
    >
      {/* Filters */}
      <div style={{display:"flex", gap:10, marginBottom:16, flexWrap:"wrap", alignItems:"center"}}>
        <div style={{display:"flex", gap:4}}>
          {["all","buy","sell","dca"].map(k => (
            <button key={k}
                    className={filter === k ? "btn sm accent" : "btn sm"}
                    onClick={() => setFilter(k)}>
              {k === "all" ? "ทั้งหมด" : kindLabel[k] || k}
            </button>
          ))}
        </div>
        <input className="form-input" type="text" placeholder="ค้นหา ticker..."
               style={{width:180, height:32, fontSize:13}}
               value={search} onChange={e => setSearch(e.target.value)}/>
        <div style={{marginLeft:"auto", fontSize:12, color:"var(--muted)"}}>
          {txs.length} รายการ
        </div>
      </div>

      <div className="card" style={{padding:0, overflow:"visible"}}>
        {txs.length === 0 ? (
          <div style={{padding:40, textAlign:"center", color:"var(--muted)"}}>
            <div style={{fontSize:13}}>ไม่พบธุรกรรม{search ? ` สำหรับ "${search}"` : ""}</div>
          </div>
        ) : (
          <>
            <div className="tx-head">
              <div>วันที่</div>
              <div>สินทรัพย์</div>
              <div>ประเภท</div>
              <div>จำนวน</div>
              <div>ราคา/หน่วย</div>
              <div>มูลค่า</div>
              <div>บันทึก</div>
              <div></div>
            </div>
            {txs.map(t => {
              const valDisp = ccy === "THB" ? (t.valUSD || 0) * FX : (t.valUSD || 0);
              return (
                <div className="tx-row" key={t.id}>
                  <div style={{fontSize:12, color:"var(--muted)"}}>{t.date}</div>
                  <div style={{fontWeight:700, fontFamily:"var(--font-mono)", fontSize:13}}>{t.ticker}</div>
                  <div>
                    <span className="pill" style={{background: t.kind === "buy" || t.kind === "dca" ? "var(--up-soft)" : "var(--down-soft)",
                                                   color: kindColor[t.kind] || "var(--ink)", fontSize:11}}>
                      {kindLabel[t.kind] || t.kind}
                    </span>
                  </div>
                  <div className="num" style={{fontSize:13}}>
                    {Math.abs(t.qty || 0).toLocaleString("en-US", {maximumFractionDigits:6})}
                  </div>
                  <div className="num" style={{fontSize:12, color:"var(--muted)"}}>
                    {t.pricePerUnit ? `$${fmtNum(t.pricePerUnit, 2)}` : "—"}
                  </div>
                  <div className="num" style={{fontWeight:600}}>
                    {ccySym}{fmtNum(valDisp, 2)}
                  </div>
                  <div style={{fontSize:12, color:"var(--muted)", minWidth:0, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap"}}>
                    {t.note || "—"}
                  </div>
                  <div onClick={e => e.stopPropagation()}>
                    <Menu items={[
                      { label: "ลบธุรกรรม", icon: "trash", danger: true,
                        onClick: () => window.removeTransaction(t.id) }
                    ]}/>
                  </div>
                </div>
              );
            })}
          </>
        )}
      </div>
    </PageShell>
  );
}

// ─────── Earn View (full page) ───────
function EarnView({ ccy, onAddEarn }) {
  const store = window.useStore();
  const FX = store.fx || 35.8;
  const [confirm, setConfirm] = React.useState(null);
  const [apy, setApy] = React.useState(15);
  const positions = store.earn || [];
  const holdings = store.holdings || [];
  const ccySym = ccy === "THB" ? "฿" : "$";

  const [secNow, setSecNow] = React.useState(() => {
    const n = new Date();
    return n.getHours() * 3600 + n.getMinutes() * 60 + n.getSeconds();
  });
  React.useEffect(() => {
    const id = setInterval(() => {
      const n = new Date();
      setSecNow(n.getHours() * 3600 + n.getMinutes() * 60 + n.getSeconds());
    }, 1000);
    return () => clearInterval(id);
  }, []);

  const getPrice = (sym) => {
    const h = holdings.find(x => x.ticker === sym);
    if (h) return h.price;
    if (["USDT","USDC","BUSD","DAI"].includes(sym)) return 1;
    return 0;
  };
  const calcEarnedTodayUSD = (p) => {
    const earnedNative = p.qty * (p.apy / 100) / 365 * (secNow / 86400);
    const price = getPrice(p.sym);
    return price > 0 ? earnedNative * price : earnedNative;
  };

  const totalUSD = positions.reduce((s, p) => s + p.qty * Math.max(getPrice(p.sym), 1), 0);
  const earnedTodayUSD = positions.reduce((s, p) => s + calcEarnedTodayUSD(p), 0);
  const totalAnnualUSD = positions.reduce((s, p) => s + p.qty * getPrice(p.sym) * p.apy / 100, 0);

  const usdtBal = (positions.find(p => p.sym === "USDT") || {}).qty || 0;
  const projAnnual = usdtBal * (apy / 100);
  const projDaily = projAnnual / 365;

  return (
    <PageShell
      title="💰 Earn — สร้างผลตอบแทนจากสินทรัพย์"
      sub={`${positions.length} สินทรัพย์ · ดอกเบี้ยทบต้นรายวัน`}
      actions={
        <button className="btn primary" onClick={onAddEarn}>
          <Ico name="plus" size={14}/> เพิ่มเหรียญ
        </button>
      }
    >
      {/* Stats */}
      <div className="kpi-grid" style={{marginBottom:20}}>
        <div className="kpi">
          <div className="label">ยอดรวม Earn</div>
          <div className="value">{ccySym}{ccy === "THB" ? Math.round(totalUSD*FX).toLocaleString() : fmtNum(totalUSD,2)}</div>
          <div className="delta" style={{color:"var(--muted)"}}>มูลค่าตลาด</div>
        </div>
        <div className="kpi">
          <div className="label">ได้รับวันนี้</div>
          <div className="value" style={{color:"var(--up)"}}>
            {ccySym}{ccy === "THB" ? fmtNum(earnedTodayUSD*FX,2) : fmtNum(earnedTodayUSD,4)}
          </div>
          <div className="delta up" style={{display:"flex", alignItems:"center", gap:4}}>
            <span style={{width:6, height:6, borderRadius:"50%", background:"var(--up)", display:"inline-block", animation:"pulse 1.4s ease-in-out infinite"}}/>
            เรียลไทม์
          </div>
        </div>
        <div className="kpi">
          <div className="label">คาดการณ์/ปี</div>
          <div className="value">{ccySym}{ccy === "THB" ? Math.round(totalAnnualUSD*FX).toLocaleString() : fmtNum(totalAnnualUSD,2)}</div>
          <div className="delta" style={{color:"var(--accent-ink)"}}>ตาม APY ปัจจุบัน</div>
        </div>
        <div className="kpi">
          <div className="label">สินทรัพย์</div>
          <div className="value">{positions.length}</div>
          <div className="delta" style={{color:"var(--muted)"}}>รายการ</div>
        </div>
      </div>

      <div style={{display:"flex", gap:20, flexWrap:"wrap"}}>
        {/* Position table */}
        <div style={{flex:"2 1 400px"}}>
          <div className="card" style={{padding:0, overflow:"visible"}}>
            {positions.length === 0 ? (
              <div style={{padding:40, textAlign:"center", color:"var(--muted)"}}>
                <div style={{fontSize:32, marginBottom:10}}>💰</div>
                <div style={{fontWeight:600, marginBottom:6}}>ยังไม่มีสินทรัพย์ใน Earn</div>
                <button className="btn primary" style={{marginTop:8}} onClick={onAddEarn}>
                  <Ico name="plus" size={14}/> เพิ่มเหรียญแรก
                </button>
              </div>
            ) : (
              <>
                <div className="earn-page-head">
                  <div>สัญลักษณ์</div>
                  <div>จำนวน</div>
                  <div>ประเภท</div>
                  <div>APY</div>
                  <div>ได้รับวันนี้ (เรียลไทม์)</div>
                  <div>คาดการณ์/ปี</div>
                  <div></div>
                </div>
                {positions.map(p => {
                  const earnedNative = p.qty * (p.apy / 100) / 365 * (secNow / 86400);
                  const earnedUSD = calcEarnedTodayUSD(p);
                  const annualNative = p.qty * p.apy / 100;
                  const annualUSD = annualNative * getPrice(p.sym);
                  return (
                    <div className="earn-page-row" key={p.id || p.sym}>
                      <div style={{fontWeight:700, fontFamily:"var(--font-mono)", fontSize:14}}>{p.sym}</div>
                      <div className="num">{p.qty.toLocaleString("en-US",{maximumFractionDigits:4})}</div>
                      <div>
                        <span style={{fontSize:11, color:"var(--muted)"}}>
                          {p.kind && p.kind.includes("ล็อก") && <Ico name="lock" size={10}/>} {p.kind}
                        </span>
                      </div>
                      <div className="apy">{p.apy.toFixed(2)}%</div>
                      <div>
                        <div style={{fontSize:13, color:"var(--up)", fontFamily:"var(--font-num)", fontWeight:700}}>
                          +{earnedNative.toFixed(6)} {p.sym}
                        </div>
                        <div style={{fontSize:11, color:"var(--muted)"}}>
                          ≈ {ccySym}{fmtNum(ccy === "THB" ? earnedUSD*FX : earnedUSD, ccy==="THB"?2:4)}
                        </div>
                      </div>
                      <div>
                        <div className="num" style={{fontWeight:600}}>+{fmtNum(annualNative,4)} {p.sym}</div>
                        <div style={{fontSize:11, color:"var(--muted)"}}>
                          ≈ {ccySym}{fmtNum(ccy==="THB"?annualUSD*FX:annualUSD,2)}
                        </div>
                      </div>
                      <div onClick={e => e.stopPropagation()}>
                        <Menu items={[
                          { label: "ปิดบัญชี Earn", icon: "trash", danger: true,
                            onClick: () => setConfirm({
                              title: `ปิดบัญชี Earn ${p.sym}?`,
                              body: `${p.qty.toLocaleString("en-US",{maximumFractionDigits:4})} ${p.sym} จะถูกถอนกลับ`,
                              confirmLabel: "ปิดบัญชี",
                              onConfirm: () => window.removeEarn(p.id || p.sym)
                            })
                          }
                        ]}/>
                      </div>
                    </div>
                  );
                })}
              </>
            )}
          </div>
        </div>

        {/* APY Simulator */}
        <div className="card earn-slider" style={{flex:"1 1 220px", alignSelf:"flex-start"}}>
          <div style={{fontSize:12, color:"var(--muted)"}}>เป้าหมาย APY ที่ต้องการ</div>
          <div className="target num">{apy.toFixed(1)}<sup>%</sup></div>
          <input className="apy-slider" type="range" min="1" max="50" step="0.5"
                 value={apy} onChange={e => setApy(parseFloat(e.target.value))}/>
          <div className="apy-ticks"><span>1%</span><span>15%</span><span>30%</span><span>50%</span></div>
          <div className="apy-projection">
            <div>
              <div style={{fontSize:11, color:"var(--muted)"}}>คาดว่าจะได้/ปี</div>
              <div className="v">{ccySym}{ccy==="THB"?Math.round(projAnnual*FX).toLocaleString():fmtNum(projAnnual,2)}</div>
            </div>
            <div style={{textAlign:"right"}}>
              <div style={{fontSize:11, color:"var(--muted)"}}>เฉลี่ย/วัน</div>
              <div className="v" style={{fontSize:14}}>{ccySym}{ccy==="THB"?Math.round(projDaily*FX).toLocaleString():fmtNum(projDaily,2)}</div>
            </div>
          </div>
        </div>
      </div>

      <ConfirmDialog open={!!confirm} title={confirm?.title} body={confirm?.body}
                     confirmLabel={confirm?.confirmLabel}
                     onCancel={() => setConfirm(null)} onConfirm={() => { confirm?.onConfirm(); setConfirm(null); }}/>
    </PageShell>
  );
}

// ─────── CSS for page layouts ───────
const PAGE_STYLES = `
.page-shell { display: flex; flex-direction: column; gap: 0; }
.page-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; margin-bottom: 20px; }
.page-title { font-size: 22px; font-weight: 800; letter-spacing: -0.02em; color: var(--ink); font-family: var(--font-ui); }

/* DCA page table */
.dca-page-head, .dca-page-row {
  display: grid;
  grid-template-columns: 1.5fr 1fr 1fr 0.7fr 0.7fr 1fr 0.8fr 32px;
  align-items: center;
  gap: 12px;
  padding: 10px 20px;
}
.dca-page-head {
  font-size: 11px; color: var(--muted); text-transform: uppercase;
  letter-spacing: 0.06em; border-bottom: 1px solid var(--line);
  background: var(--surface-2);
  border-radius: calc(var(--radius) - 1px) calc(var(--radius) - 1px) 0 0;
  overflow: hidden;
}
.dca-page-row { border-bottom: 1px solid var(--line); transition: background .15s; }
.dca-page-row:last-child { border-bottom: 0; }
.dca-page-row:hover { background: var(--surface-2); }

/* History table */
.tx-head, .tx-row {
  display: grid;
  grid-template-columns: 0.8fr 0.7fr 0.6fr 0.8fr 0.8fr 1fr 1.2fr 32px;
  align-items: center;
  gap: 12px;
  padding: 10px 20px;
}
.tx-head {
  font-size: 11px; color: var(--muted); text-transform: uppercase;
  letter-spacing: 0.06em; border-bottom: 1px solid var(--line);
  background: var(--surface-2);
  border-radius: calc(var(--radius) - 1px) calc(var(--radius) - 1px) 0 0;
  overflow: hidden;
}
.tx-row { border-bottom: 1px solid var(--line); transition: background .15s; }
.tx-row:last-child { border-bottom: 0; }
.tx-row:hover { background: var(--surface-2); }

/* Earn page table */
.earn-page-head, .earn-page-row {
  display: grid;
  grid-template-columns: 0.8fr 1fr 1fr 0.6fr 1.4fr 1.2fr 32px;
  align-items: center;
  gap: 12px;
  padding: 12px 20px;
}
.earn-page-head {
  font-size: 11px; color: var(--muted); text-transform: uppercase;
  letter-spacing: 0.06em; border-bottom: 1px solid var(--line);
  background: var(--surface-2);
  border-radius: calc(var(--radius) - 1px) calc(var(--radius) - 1px) 0 0;
  overflow: hidden;
}
.earn-page-row { border-bottom: 1px solid var(--line); transition: background .15s; }
.earn-page-row:last-child { border-bottom: 0; }
.earn-page-row:hover { background: var(--surface-2); }

@media (max-width: 768px) {
  .dca-page-head { display: none; }
  .dca-page-row { grid-template-columns: 1fr 1fr auto; grid-template-rows: auto auto; }
  .tx-head { display: none; }
  .tx-row { grid-template-columns: 1fr 1fr auto; grid-template-rows: auto auto; }
  .earn-page-head { display: none; }
  .earn-page-row { grid-template-columns: 1fr 1fr auto; }
}
`;

// Inject styles once
if (!document.getElementById("views-styles")) {
  const s = document.createElement("style");
  s.id = "views-styles";
  s.textContent = PAGE_STYLES;
  document.head.appendChild(s);
}

Object.assign(window, { DCAView, EarnView, HistoryView });
