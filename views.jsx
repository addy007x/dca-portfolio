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

const EARN_SECONDS_PER_YEAR = 365 * 86400;

function earnPriceFromHoldings(holdings, sym) {
  const h = (holdings || []).find(x => x.ticker === sym);
  if (h) return h.price;
  if (["USDT","USDC","BUSD","DAI"].includes(sym)) return 1;
  return 0;
}

function calcEarnedUSDForSeconds(p, seconds, price) {
  const qty = Number(p?.qty) || 0;
  const apy = Number(p?.apy) || 0;
  const earnedNative = qty * (apy / 100) * (Math.max(0, seconds) / EARN_SECONDS_PER_YEAR);
  return price > 0 ? earnedNative * price : earnedNative;
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
                    <AssetIcon ticker={d.ticker} classKey={d.classKey} size={32}/>
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
                    <div style={{fontSize:10, color:"var(--muted)"}}>UTC+7</div>
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
                    {fmtQty(Math.abs(t.qty || 0))}
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
    return earnPriceFromHoldings(holdings, sym);
  };
  const calcEarnedTodayUSD = (p) => {
    return calcEarnedUSDForSeconds(p, secNow, getPrice(p.sym));
  };
  const storedEarnedUSD = (p) => Number(p.accruedEarnedUSD ?? p.earnedToday ?? 0) || 0;
  const pendingEarnedUSD = (p) => {
    const last = Number(p.accruedEarnedAt) || 0;
    if (!last) return 0;
    return calcEarnedUSDForSeconds(p, (Date.now() - last) / 1000, getPrice(p.sym));
  };

  React.useEffect(() => {
    if (!positions.length) return;

    const syncEarnAccrual = () => {
      const now = Date.now();
      const current = new Date(now);
      const secOfDay = current.getHours() * 3600 + current.getMinutes() * 60 + current.getSeconds();

      window.updateStore(s => {
        let changed = false;
        const nextEarn = (s.earn || []).map(p => {
          const last = Number(p.accruedEarnedAt) || 0;
          const base = Number(p.accruedEarnedUSD ?? p.earnedToday ?? 0) || 0;
          const price = earnPriceFromHoldings(s.holdings || [], p.sym);
          const elapsedSeconds = last ? Math.max(0, (now - last) / 1000) : secOfDay;

          if (last && p.accruedEarnedUSD != null && elapsedSeconds < 60) return p;

          const earned = calcEarnedUSDForSeconds(p, elapsedSeconds, price);
          changed = true;
          return {
            ...p,
            accruedEarnedUSD: base + earned,
            accruedEarnedAt: now,
          };
        });

        return changed ? { ...s, earn: nextEarn } : s;
      });
    };

    syncEarnAccrual();
    const id = setInterval(syncEarnAccrual, 60000);
    return () => clearInterval(id);
  }, [positions.length]);

  const totalUSD = positions.reduce((s, p) => s + p.qty * Math.max(getPrice(p.sym), 1), 0);
  const earnedTodayUSD = positions.reduce((s, p) => s + calcEarnedTodayUSD(p), 0);
  const savedEarnedUSD = positions.reduce((s, p) => s + storedEarnedUSD(p), 0);
  const pendingAccruedUSD = positions.reduce((s, p) => s + pendingEarnedUSD(p), 0);
  const accumulatedEarnedUSD = savedEarnedUSD + pendingAccruedUSD;
  const totalWithEarnedUSD = totalUSD + accumulatedEarnedUSD;
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
          <div className="value">{ccySym}{ccy === "THB" ? Math.round(totalWithEarnedUSD*FX).toLocaleString() : fmtNum(totalWithEarnedUSD,2)}</div>
          <div className="delta" style={{color:"var(--muted)"}}>มูลค่าตลาด + ดอกเบี้ยสะสม</div>
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
          <div className="label">ดอกเบี้ยสะสม</div>
          <div className="value">{ccySym}{ccy === "THB" ? fmtNum(accumulatedEarnedUSD*FX,2) : fmtNum(accumulatedEarnedUSD,4)}</div>
          <div className="delta" style={{color:"var(--accent-ink)"}}>บันทึกไว้ ไม่รีเซตข้ามวัน</div>
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

// ─────── Benchmark / Compare View ───────
function BenchView({ ccy }) {
  const store      = window.useStore();
  const holdings   = store.holdings || [];
  const FX         = store.fx || 35.8;
  const benchmarks = store.benchmarks || window.MOCK?.BENCHMARKS || [];
  const ccySym     = ccy === "THB" ? "฿" : "$";
  const cv         = (thb) => ccy === "THB" ? thb : thb / FX;

  // ── Portfolio-level metrics ──
  const { mvTHB, costTHB } = React.useMemo(() => {
    let mvTHB = 0, costTHB = 0;
    holdings.forEach(h => {
      const f = h.ccy === "THB" ? 1 : FX;
      mvTHB   += h.qty * h.price   * f;
      costTHB += h.qty * h.costAvg * f;
    });
    return { mvTHB, costTHB };
  }, [holdings, FX]);

  const portYTD    = costTHB > 0 ? ((mvTHB - costTHB) / costTHB) * 100 : 0;
  const portGainTHB = mvTHB - costTHB;

  // ── Per-holding performance ──
  const holdPerf = holdings.map(h => {
    const plNative = h.qty * (h.price - h.costAvg);
    const plTHB    = h.ccy === "THB" ? plNative : plNative * FX;
    const mvTHB_h  = h.qty * h.price * (h.ccy === "THB" ? 1 : FX);
    const retPct   = h.costAvg > 0 ? ((h.price - h.costAvg) / h.costAvg) * 100 : 0;
    const weight   = mvTHB > 0 ? (mvTHB_h / mvTHB) * 100 : 0;
    const contrib  = weight * retPct / 100; // contribution to portfolio return
    return { ...h, plTHB, retPct, weight, contrib };
  }).sort((a, b) => b.retPct - a.retPct);

  const best  = holdPerf.slice(0, 3);
  const worst = [...holdPerf].sort((a, b) => a.retPct - b.retPct).slice(0, 3);

  // ── What-if simulator ──
  const [whatIfTicker, setWhatIfTicker] = React.useState("S&P 500");
  const whatIfBench  = benchmarks.find(b => b.ticker === whatIfTicker) || benchmarks[1];
  const whatIfValue  = costTHB * (1 + (whatIfBench?.ytd || 0) / 100);
  const whatIfGain   = whatIfValue - costTHB;
  const portBetter   = portGainTHB - whatIfGain;

  // ── All benchmarks enriched with portfolio ──
  const allBars = [
    { ticker: "พอร์ตคุณ", ytd: portYTD, isYou: true },
    ...benchmarks.filter(b => !b.isYou),
  ].sort((a, b) => b.ytd - a.ytd);
  const maxAbs = Math.max(...allBars.map(b => Math.abs(b.ytd)), 1);

  // ── Diversification score (0–100) ──
  const classKeys = [...new Set(holdings.map(h => h.classKey))];
  const divScore  = Math.min(100, classKeys.length * 22 + (holdings.length > 5 ? 12 : 0));

  // ── Asset class weights ──
  const byClass = {};
  holdings.forEach(h => {
    const v = h.qty * h.price * (h.ccy === "THB" ? 1 : FX);
    byClass[h.classKey] = (byClass[h.classKey] || 0) + v;
  });
  const classColors = { us:"var(--c-us)", th:"var(--c-th)", crypto:"var(--c-crypto)", gold:"var(--c-gold)" };
  const classLabels = { us:"หุ้น US", th:"หุ้นไทย", crypto:"คริปโต", gold:"ทองคำ" };

  return (
    <PageShell title="📊 เปรียบเทียบผลตอบแทน"
               sub="พอร์ตของคุณ vs ดัชนีอ้างอิง · ข้อมูล YTD">
      {/* ── KPI strip ── */}
      <div className="kpi-grid" style={{marginBottom:20}}>
        <div className="kpi">
          <div className="label">ผลตอบแทนพอร์ต</div>
          <div className="value" style={{color: portYTD>=0?"var(--up)":"var(--down)"}}>
            {portYTD>=0?"+":""}{portYTD.toFixed(2)}%
          </div>
          <div className={`delta ${portYTD>=0?"up":"down"}`}>
            {portYTD>=0?"+":""}{ccySym}{Math.round(Math.abs(cv(portGainTHB))).toLocaleString()} กำไรสะสม
          </div>
        </div>
        <div className="kpi">
          <div className="label">ดีกว่า SET</div>
          {(() => {
            const set = benchmarks.find(b => b.ticker==="SET");
            const diff = portYTD - (set?.ytd||0);
            return <>
              <div className="value" style={{color: diff>=0?"var(--up)":"var(--down)"}}>
                {diff>=0?"+":""}{diff.toFixed(2)}%
              </div>
              <div className={`delta ${diff>=0?"up":"down"}`}>
                SET {(set?.ytd||0).toFixed(1)}%
              </div>
            </>;
          })()}
        </div>
        <div className="kpi">
          <div className="label">ดีกว่า S&P 500</div>
          {(() => {
            const sp = benchmarks.find(b => b.ticker==="S&P 500");
            const diff = portYTD - (sp?.ytd||0);
            return <>
              <div className="value" style={{color: diff>=0?"var(--up)":"var(--down)"}}>
                {diff>=0?"+":""}{diff.toFixed(2)}%
              </div>
              <div className={`delta ${diff>=0?"up":"down"}`}>
                S&P {(sp?.ytd||0).toFixed(1)}%
              </div>
            </>;
          })()}
        </div>
        <div className="kpi">
          <div className="label">คะแนนกระจายความเสี่ยง</div>
          <div className="value" style={{color:"var(--accent-ink)"}}>{divScore}<span style={{fontSize:14,fontWeight:500}}>/100</span></div>
          <div className="delta" style={{color:"var(--muted)"}}>
            {classKeys.length} ประเภท · {holdings.length} สินทรัพย์
          </div>
        </div>
      </div>

      <div style={{display:"flex", gap:20, flexWrap:"wrap", alignItems:"flex-start"}}>

        {/* ── Left: bar chart + per-holding table ── */}
        <div style={{flex:"2 1 480px", display:"flex", flexDirection:"column", gap:20}}>

          {/* Performance bars */}
          <div className="card">
            <div className="card-head">
              <div>
                <div className="card-title">เปรียบเทียบผลตอบแทน YTD</div>
                <div className="card-sub">พอร์ตคุณ vs ดัชนีตลาด</div>
              </div>
            </div>
            <div style={{display:"flex", flexDirection:"column", gap:10, padding:"0 4px 4px"}}>
              {allBars.map(b => {
                const w    = (Math.abs(b.ytd) / maxAbs) * 100;
                const pos  = b.ytd >= 0;
                const isYou = b.isYou;
                return (
                  <div key={b.ticker}>
                    <div style={{display:"flex", justifyContent:"space-between", fontSize:12, marginBottom:4}}>
                      <span style={{fontWeight: isYou?800:600,
                                    color: isYou?"var(--accent-ink)":"var(--ink)",
                                    fontFamily: isYou?"var(--font-ui)":"var(--font-mono)"}}>
                        {b.ticker}{isYou && " ★"}
                      </span>
                      <span className="num" style={{fontWeight:700,
                                                    color: pos?"var(--up)":"var(--down)"}}>
                        {pos?"+":""}{b.ytd.toFixed(2)}%
                      </span>
                    </div>
                    <div style={{height:10, background:"var(--line)", borderRadius:5, overflow:"hidden"}}>
                      <div style={{
                        height:"100%", borderRadius:5, transition:"width .6s ease",
                        width: w+"%",
                        background: isYou ? "var(--accent)"
                                  : pos   ? "var(--up)"
                                  :         "var(--down)",
                        opacity: isYou ? 1 : 0.7,
                      }}/>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Per-holding performance table */}
          <div className="card" style={{padding:0}}>
            <div className="card-head" style={{padding:"16px 20px 12px"}}>
              <div>
                <div className="card-title">ผลตอบแทนรายสินทรัพย์</div>
                <div className="card-sub">เรียงจากผลตอบแทนสูงสุด</div>
              </div>
            </div>
            <div style={{
              display:"grid", gridTemplateColumns:"1.6fr 0.8fr 0.8fr 1fr 1fr",
              gap:12, padding:"8px 20px",
              fontSize:11, color:"var(--muted)", textTransform:"uppercase", letterSpacing:"0.06em",
              borderBottom:"1px solid var(--line)", background:"var(--surface-2)",
            }}>
              <div>สินทรัพย์</div><div>น้ำหนัก%</div><div>ผลตอบแทน</div>
              <div>กำไร/ขาดทุน ({ccy})</div><div>Contribution</div>
            </div>
            {holdPerf.map(h => (
              <div key={h.id} style={{
                display:"grid", gridTemplateColumns:"1.6fr 0.8fr 0.8fr 1fr 1fr",
                gap:12, padding:"10px 20px", alignItems:"center",
                borderBottom:"1px solid var(--line)", transition:"background .15s",
              }}
              onMouseEnter={e=>e.currentTarget.style.background="var(--surface-2)"}
              onMouseLeave={e=>e.currentTarget.style.background=""}>
                <div style={{display:"flex", gap:8, alignItems:"center"}}>
                  <AssetIcon ticker={h.ticker} classKey={h.classKey} size={28}/>
                  <div>
                    <div style={{fontWeight:700, fontFamily:"var(--font-mono)", fontSize:12}}>{h.ticker}</div>
                    <div style={{fontSize:10, color:"var(--muted)"}}>{h.classKey?.toUpperCase()}</div>
                  </div>
                </div>
                <div>
                  <div className="num" style={{fontSize:12, fontWeight:600}}>{h.weight.toFixed(1)}%</div>
                  <div style={{height:3, background:"var(--line)", borderRadius:2, marginTop:3}}>
                    <div style={{height:"100%", borderRadius:2, background:"var(--accent)",
                                 width: Math.min(h.weight,100)+"%"}}/>
                  </div>
                </div>
                <div className="num" style={{fontWeight:700, fontSize:13,
                                             color: h.retPct>=0?"var(--up)":"var(--down)"}}>
                  {h.retPct>=0?"+":""}{h.retPct.toFixed(2)}%
                </div>
                <div className="num" style={{fontWeight:600, fontSize:12,
                                             color: h.plTHB>=0?"var(--up)":"var(--down)"}}>
                  {h.plTHB>=0?"+":"−"}{ccySym}{Math.round(Math.abs(cv(h.plTHB))).toLocaleString()}
                </div>
                <div>
                  <div className="num" style={{fontSize:12, fontWeight:600,
                                               color: h.contrib>=0?"var(--up)":"var(--down)"}}>
                    {h.contrib>=0?"+":""}{h.contrib.toFixed(2)}%
                  </div>
                  <div style={{fontSize:10, color:"var(--muted)"}}>ต่อพอร์ต</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Right column ── */}
        <div style={{flex:"1 1 260px", display:"flex", flexDirection:"column", gap:16}}>

          {/* Best / Worst */}
          <div className="card">
            <div className="card-title" style={{marginBottom:12}}>🏆 Top performers</div>
            {best.map((h,i) => (
              <div key={h.id} style={{display:"flex", justifyContent:"space-between",
                                      alignItems:"center", padding:"6px 0",
                                      borderBottom: i<best.length-1?"1px solid var(--line)":"none"}}>
                <div style={{display:"flex", gap:8, alignItems:"center"}}>
                  <span style={{fontSize:14}}>{["🥇","🥈","🥉"][i]}</span>
                  <span style={{fontWeight:700, fontFamily:"var(--font-mono)", fontSize:13}}>{h.ticker}</span>
                </div>
                <span className="num" style={{color:"var(--up)", fontWeight:700}}>
                  +{h.retPct.toFixed(2)}%
                </span>
              </div>
            ))}
            <div className="card-title" style={{margin:"14px 0 10px"}}>📉 Worst performers</div>
            {worst.map((h,i) => (
              <div key={h.id} style={{display:"flex", justifyContent:"space-between",
                                      alignItems:"center", padding:"6px 0",
                                      borderBottom: i<worst.length-1?"1px solid var(--line)":"none"}}>
                <div style={{display:"flex", gap:8, alignItems:"center"}}>
                  <span style={{fontSize:13}}>{["1️⃣","2️⃣","3️⃣"][i]}</span>
                  <span style={{fontWeight:700, fontFamily:"var(--font-mono)", fontSize:13}}>{h.ticker}</span>
                </div>
                <span className="num" style={{color:"var(--down)", fontWeight:700}}>
                  {h.retPct.toFixed(2)}%
                </span>
              </div>
            ))}
          </div>

          {/* What-if simulator */}
          <div className="card">
            <div className="card-title" style={{marginBottom:4}}>🤔 What-If Simulator</div>
            <div style={{fontSize:12, color:"var(--muted)", marginBottom:12}}>
              ถ้าลงทุนเงินต้นทั้งหมดใน…
            </div>
            <div style={{display:"flex", flexWrap:"wrap", gap:6, marginBottom:14}}>
              {benchmarks.filter(b=>!b.isYou).map(b => (
                <button key={b.ticker}
                        onClick={() => setWhatIfTicker(b.ticker)}
                        style={{
                          padding:"5px 12px", borderRadius:20, fontSize:12, cursor:"pointer",
                          border: whatIfTicker===b.ticker ? "2px solid var(--accent)" : "1px solid var(--line)",
                          background: whatIfTicker===b.ticker ? "var(--accent-soft)" : "var(--surface-2)",
                          color: whatIfTicker===b.ticker ? "var(--accent-ink)" : "var(--ink)",
                          fontWeight: whatIfTicker===b.ticker ? 700 : 500,
                          fontFamily:"inherit",
                        }}>
                  {b.ticker}
                </button>
              ))}
            </div>
            <div style={{background:"var(--surface-2)", borderRadius:10, padding:14}}>
              <div style={{display:"flex", justifyContent:"space-between", marginBottom:6}}>
                <span style={{fontSize:12, color:"var(--muted)"}}>มูลค่าถ้าลงใน {whatIfTicker}</span>
                <span className="num" style={{fontWeight:700}}>
                  {ccySym}{Math.round(cv(whatIfValue)).toLocaleString()}
                </span>
              </div>
              <div style={{display:"flex", justifyContent:"space-between", marginBottom:10}}>
                <span style={{fontSize:12, color:"var(--muted)"}}>มูลค่าพอร์ตปัจจุบัน</span>
                <span className="num" style={{fontWeight:700}}>
                  {ccySym}{Math.round(cv(mvTHB)).toLocaleString()}
                </span>
              </div>
              <div style={{borderTop:"1px solid var(--line)", paddingTop:10,
                            display:"flex", justifyContent:"space-between", alignItems:"center"}}>
                <span style={{fontSize:13, fontWeight:700}}>พอร์ตคุณ{portBetter>=0?" ดีกว่า":" แย่กว่า"}</span>
                <span className="num" style={{
                  fontSize:18, fontWeight:800,
                  color: portBetter>=0 ? "var(--up)" : "var(--down)",
                }}>
                  {portBetter>=0?"+":"−"}{ccySym}{Math.round(Math.abs(cv(portBetter))).toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          {/* Asset class allocation */}
          <div className="card">
            <div className="card-title" style={{marginBottom:12}}>🗂️ สัดส่วนสินทรัพย์</div>
            {Object.entries(byClass).filter(([,v])=>v>0).sort((a,b)=>b[1]-a[1]).map(([k,v]) => {
              const pct = mvTHB > 0 ? (v/mvTHB)*100 : 0;
              return (
                <div key={k} style={{marginBottom:10}}>
                  <div style={{display:"flex", justifyContent:"space-between", fontSize:12, marginBottom:3}}>
                    <span style={{fontWeight:600}}>{classLabels[k]||k}</span>
                    <span className="num" style={{fontWeight:700}}>{pct.toFixed(1)}%</span>
                  </div>
                  <div style={{height:8, background:"var(--line)", borderRadius:4, overflow:"hidden"}}>
                    <div style={{
                      height:"100%", borderRadius:4, transition:"width .5s",
                      background: classColors[k]||"var(--accent)",
                      width: pct+"%",
                    }}/>
                  </div>
                  <div style={{fontSize:11, color:"var(--muted)", marginTop:2, textAlign:"right"}}>
                    {ccySym}{Math.round(cv(v)).toLocaleString()}
                  </div>
                </div>
              );
            })}
            {/* Diversification bar */}
            <div style={{borderTop:"1px solid var(--line)", marginTop:10, paddingTop:10}}>
              <div style={{display:"flex", justifyContent:"space-between", fontSize:12, marginBottom:4}}>
                <span style={{color:"var(--muted)"}}>คะแนนการกระจายความเสี่ยง</span>
                <span className="num" style={{fontWeight:700, color:"var(--accent-ink)"}}>{divScore}/100</span>
              </div>
              <div style={{height:8, background:"var(--line)", borderRadius:4, overflow:"hidden"}}>
                <div style={{height:"100%", borderRadius:4, background:"var(--accent)",
                              width: divScore+"%", transition:"width .5s"}}/>
              </div>
              <div style={{fontSize:11, color:"var(--muted)", marginTop:4}}>
                {divScore >= 80 ? "✅ กระจายดีมาก" : divScore >= 50 ? "⚠️ ควรเพิ่มความหลากหลาย" : "❌ กระจุกตัวสูง"}
              </div>
            </div>
          </div>

        </div>
      </div>
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

// ─────── Portfolio View ───────
function PortfolioView({ ccy, onOpenAsset, onAddHolding, onAddTx, onEditHolding }) {
  const store    = window.useStore();
  const holdings = store.holdings || [];
  const FX       = store.fx || 35.8;
  const ccySym   = ccy === "THB" ? "฿" : "$";
  const cv       = (thb) => ccy === "THB" ? thb : thb / FX;

  const [confirm, setConfirm] = React.useState(null);

  const totals = React.useMemo(() => {
    let mvTHB = 0, costTHB = 0, dayChgTHB = 0;
    holdings.forEach(h => {
      const mv   = h.qty * h.price;
      const cost = h.qty * h.costAvg;
      const day  = mv * ((h.chg1d || 0) / 100);
      const f    = h.ccy === "THB" ? 1 : FX;
      mvTHB    += mv   * f;
      costTHB  += cost * f;
      dayChgTHB += day  * f;
    });
    return { mvTHB, costTHB, dayChgTHB };
  }, [holdings, FX]);

  const unrealTHB = totals.mvTHB - totals.costTHB;
  const unrealPct = totals.costTHB > 0 ? (unrealTHB / totals.costTHB) * 100 : 0;
  const dayPct    = totals.mvTHB > 0   ? (totals.dayChgTHB / (totals.mvTHB - totals.dayChgTHB)) * 100 : 0;

  return (
    <PageShell
      title="พอร์ตการลงทุน"
      sub={`${holdings.length} สินทรัพย์ · คลิกแถวเพื่อดูรายละเอียด · ราคาอัพเดตทุก 60 วิ`}
      actions={
        <div style={{display:"flex", gap:8}}>
          <button className="btn sm" onClick={onAddHolding}>
            <Ico name="plus" size={13}/> เพิ่มสินทรัพย์
          </button>
          <button className="btn sm accent" onClick={onAddTx}>
            <Ico name="plus" size={13}/> บันทึกธุรกรรม
          </button>
        </div>
      }
    >
      {/* KPI strip */}
      <div className="kpi-grid" style={{marginBottom:20}}>
        <div className="kpi">
          <div className="label">มูลค่าพอร์ต</div>
          <div className="value">{ccySym}{Math.round(cv(totals.mvTHB)).toLocaleString()}</div>
          <div className="delta" style={{color:"var(--muted)"}}>ราคาตลาด</div>
        </div>
        <div className="kpi">
          <div className="label">ต้นทุนรวม</div>
          <div className="value">{ccySym}{Math.round(cv(totals.costTHB)).toLocaleString()}</div>
          <div className="delta" style={{color:"var(--muted)"}}>ลงทุนสะสม</div>
        </div>
        <div className="kpi">
          <div className="label">กำไร / ขาดทุน</div>
          <div className="value" style={{color: unrealPct >= 0 ? "var(--up)" : "var(--down)"}}>
            {unrealPct >= 0 ? "+" : "−"}{ccySym}{Math.round(Math.abs(cv(unrealTHB))).toLocaleString()}
          </div>
          <div className={`delta ${unrealPct >= 0 ? "up" : "down"}`}>{fmtPct(unrealPct)}</div>
        </div>
        <div className="kpi">
          <div className="label">เปลี่ยนวันนี้</div>
          <div className="value" style={{color: dayPct >= 0 ? "var(--up)" : "var(--down)"}}>
            {dayPct >= 0 ? "+" : "−"}{ccySym}{Math.round(Math.abs(cv(totals.dayChgTHB))).toLocaleString()}
          </div>
          <div className={`delta ${dayPct >= 0 ? "up" : "down"}`}>{fmtPct(dayPct)}</div>
        </div>
      </div>

      {/* Holdings table */}
      {holdings.length === 0 ? (
        <div className="card" style={{padding:48, textAlign:"center"}}>
          <div style={{fontSize:36, marginBottom:10}}>💼</div>
          <div style={{fontWeight:700, fontSize:15, marginBottom:8}}>ยังไม่มีสินทรัพย์ในพอร์ต</div>
          <button className="btn primary" onClick={onAddHolding}>
            <Ico name="plus" size={14}/> เพิ่มสินทรัพย์แรก
          </button>
        </div>
      ) : (
        <div className="card holdings" style={{padding:0}}>
          <div className="holdings-head">
            <div>สินทรัพย์</div>
            <div>ราคา / ต้นทุน</div>
            <div>จำนวน</div>
            <div>มูลค่า ({ccy})</div>
            <div>กำไร / ขาดทุน</div>
            <div style={{textAlign:"right"}}>7 วัน</div>
            <div></div>
          </div>
          {holdings.map(h => {
            const mvNative   = h.qty * h.price;
            const costNative = h.qty * h.costAvg;
            const plNative   = mvNative - costNative;
            const plPct      = costNative > 0 ? (plNative / costNative) * 100 : 0;
            const mvTHB      = h.ccy === "THB" ? mvNative : mvNative * FX;
            const plTHB      = h.ccy === "THB" ? plNative : plNative * FX;
            const mvDisp     = cv(mvTHB);
            const plDisp     = cv(plTHB);
            const classLabel = { us:"US", th:"TH", crypto:"CRYPTO", gold:"GOLD" }[h.classKey];
            return (
              <div className="holdings-row" key={h.id} onClick={() => onOpenAsset(h)}>
                <div className="asset-name">
                  <AssetIcon ticker={h.ticker} classKey={h.classKey} size={32}/>
                  <div className="asset-meta">
                    <div className="asset-ticker">
                      {h.ticker}<span className="asset-class-tag">{classLabel}</span>
                    </div>
                    <div className="asset-co">{h.name}</div>
                  </div>
                </div>
                <div>
                  <div className="num" style={{fontWeight:600}}>
                    {h.ccy==="THB"?"฿":"$"}{fmtNum(h.price,2)}
                  </div>
                  <div className="num" style={{fontSize:11, color:"var(--muted)"}}>
                    ต้นทุน {h.ccy==="THB"?"฿":"$"}{fmtNum(h.costAvg,2)}
                  </div>
                </div>
                <div className="num" style={{fontSize:13}}>
                  {h.qty.toLocaleString("en-US",{maximumFractionDigits:4})}
                  <div style={{fontSize:11, color:"var(--muted)"}}>
                    {h.classKey==="gold"?"oz":h.classKey==="crypto"?h.ticker:"หุ้น"}
                  </div>
                </div>
                <div className="num" style={{fontWeight:700}}>
                  {ccySym}{ccy==="THB"?Math.round(mvDisp).toLocaleString():fmtNum(mvDisp,2)}
                </div>
                <div>
                  <div className="num" style={{fontWeight:700, color: plDisp>=0?"var(--up)":"var(--down)"}}>
                    {plDisp>=0?"+":"−"}{ccySym}{ccy==="THB"?Math.round(Math.abs(plDisp)).toLocaleString():fmtNum(Math.abs(plDisp),2)}
                  </div>
                  <div className="num" style={{fontSize:11, color: plDisp>=0?"var(--up)":"var(--down)"}}>
                    {fmtPct(plPct)}
                  </div>
                </div>
                <div style={{textAlign:"right"}}>
                  <Sparkline data={h.spark || [h.price]}/>
                </div>
                <div onClick={e => e.stopPropagation()}>
                  <Menu items={[
                    { label:"ดูรายละเอียด", icon:"chev-r", onClick:() => onOpenAsset(h) },
                    { label:"แก้ไข",         icon:"edit",   onClick:() => onEditHolding(h) },
                    { label:"บันทึกธุรกรรม", icon:"plus",   onClick: onAddTx },
                    { sep:true },
                    { label:"ลบสินทรัพย์", icon:"trash", danger:true,
                      onClick:() => setConfirm({
                        title:`ลบ ${h.ticker} ออกจากพอร์ต?`,
                        body:`${h.name} จำนวน ${h.qty.toLocaleString("en-US",{maximumFractionDigits:4})} หน่วย จะถูกลบออก`,
                        requireType: h.ticker,
                        confirmLabel:"ลบสินทรัพย์",
                        onConfirm:() => window.removeHolding(h.id),
                      })
                    },
                  ]}/>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <ConfirmDialog open={!!confirm} title={confirm?.title} body={confirm?.body}
                     requireType={confirm?.requireType} confirmLabel={confirm?.confirmLabel}
                     onCancel={() => setConfirm(null)}
                     onConfirm={() => { confirm?.onConfirm(); setConfirm(null); }}/>
    </PageShell>
  );
}

// Inject styles once
if (!document.getElementById("views-styles")) {
  const s = document.createElement("style");
  s.id = "views-styles";
  s.textContent = PAGE_STYLES;
  document.head.appendChild(s);
}

Object.assign(window, { DCAView, EarnView, HistoryView, PortfolioView, BenchView, PageShell });
