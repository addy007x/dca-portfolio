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
function HistoryView({ ccy, onEditTx }) {
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
                        onClick: () => window.removeTransaction(t.id) },
                      { label: "แก้ไขธุรกรรม", icon: "edit", onClick: () => onEditTx && onEditTx(t) }
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
function EarnView({ ccy, onAddEarn, onEditEarn }) {
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
  const earnedAddedToTotalUSD = accumulatedEarnedUSD;
  const totalWithEarnedUSD = totalUSD + earnedAddedToTotalUSD;
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
          <div className="delta up" style={{marginTop:-2, marginBottom:4, fontWeight:700}}>
            รวมดอกเบี้ยสะสม +{ccySym}{ccy === "THB" ? fmtNum(earnedAddedToTotalUSD*FX,2) : fmtNum(earnedAddedToTotalUSD,4)}
          </div>
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
                          { label: "แก้ไข Earn", icon: "edit", onClick: () => onEditEarn?.(p) },
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

const REBALANCE_PROFILES = {
  balanced: {
    label: "Balanced",
    note: "เน้นกระจายความเสี่ยงแบบพอดี ไม่ไล่ผลตอบแทนเกินไป",
    targets: { us: 40, th: 20, crypto: 25, gold: 15 },
  },
  growth: {
    label: "Growth",
    note: "เน้นสินทรัพย์เติบโต แต่ยังมีทองช่วยกันสะเทือน",
    targets: { us: 50, th: 15, crypto: 25, gold: 10 },
  },
  defensive: {
    label: "Defensive",
    note: "ลดความผันผวน เพิ่มทองและหุ้นไทยให้มากขึ้น",
    targets: { us: 35, th: 25, crypto: 10, gold: 30 },
  },
  momentum: {
    label: "Momentum",
    note: "รับความเสี่ยงสูงขึ้นเพื่อจับเทรนด์แรง",
    targets: { us: 35, th: 10, crypto: 40, gold: 15 },
  },
};

const REBALANCE_META = {
  us: { label: "US Stocks", anchor: "VOO", color: "var(--c-us)" },
  th: { label: "Thai Stocks", anchor: "PTT", color: "var(--c-th)" },
  crypto: { label: "Crypto", anchor: "BTC", color: "var(--c-crypto)" },
  gold: { label: "Gold", anchor: "XAUT", color: "var(--c-gold)" },
};

function RebalanceView({ ccy, onOpenAsset, onAddDCA }) {
  const store = window.useStore();
  const holdings = store.holdings || [];
  const FX = store.fx || 35.8;
  const settings = store.settings || {};
  const ccySym = ccy === "THB" ? "฿" : "$";
  const [profile, setProfile] = React.useState(settings.rebalanceProfile || "balanced");
  const [tolerance, setTolerance] = React.useState(Number(settings.rebalanceTolerance ?? 5));
  const [capital, setCapital] = React.useState(Number(settings.rebalanceCapitalTHB ?? 0));
  const [assetTargets, setAssetTargets] = React.useState(() => settings.rebalanceAssetTargets || {});
  const [yearPlans, setYearPlans] = React.useState(() => settings.rebalanceYearPlans || {});
  const [planYear, setPlanYear] = React.useState(() => String(new Date().getFullYear() + 543));

  React.useEffect(() => {
    const nextProfile = settings.rebalanceProfile || "balanced";
    const nextTol = Number(settings.rebalanceTolerance ?? 5);
    const nextCapital = Number(settings.rebalanceCapitalTHB ?? 0);
    if (nextProfile !== profile || nextTol !== Number(tolerance) || nextCapital !== Number(capital)) {
      window.updateSettings?.({
        rebalanceProfile: profile,
        rebalanceTolerance: Number(tolerance),
        rebalanceCapitalTHB: Number(capital),
      });
    }
  }, [profile, settings.rebalanceProfile, settings.rebalanceTolerance, settings.rebalanceCapitalTHB, tolerance, capital]);

  const nextDCA = React.useMemo(() => {
    return (store.dca || [])
      .filter(d => !d.paused && d.nextDate)
      .sort((a, b) => a.nextDate.localeCompare(b.nextDate))[0] || null;
  }, [store.dca]);

  const plan = React.useMemo(() => {
    const byClass = {};
    let totalTHB = 0;
    holdings.forEach(h => {
      const valueTHB = h.qty * h.price * (h.ccy === "THB" ? 1 : FX);
      totalTHB += valueTHB;
      byClass[h.classKey] = (byClass[h.classKey] || 0) + valueTHB;
    });

    const targetSet = REBALANCE_PROFILES[profile]?.targets || REBALANCE_PROFILES.balanced.targets;
    const rows = Object.entries(targetSet).map(([classKey, targetPct]) => {
      const meta = REBALANCE_META[classKey];
      const currentTHB = byClass[classKey] || 0;
      const currentPct = totalTHB > 0 ? (currentTHB / totalTHB) * 100 : 0;
      const driftPct = currentPct - targetPct;
      const deltaTHB = totalTHB * (targetPct - currentPct) / 100;
      const action = Math.abs(driftPct) <= tolerance ? "hold" : deltaTHB > 0 ? "buy" : "sell";
      const classHoldings = holdings
        .filter(h => h.classKey === classKey)
        .map(h => ({ ...h, valueTHB: h.qty * h.price * (h.ccy === "THB" ? 1 : FX) }))
        .sort((a, b) => b.valueTHB - a.valueTHB);
      const anchorHolding = classHoldings[0] || null;
      const anchorTicker = anchorHolding?.ticker || meta.anchor;
      return {
        classKey,
        label: meta.label,
        anchorTicker,
        color: meta.color,
        currentTHB,
        currentPct,
        targetPct,
        driftPct,
        deltaTHB,
        absDeltaTHB: Math.abs(deltaTHB),
        action,
        classHoldings,
      };
    }).sort((a, b) => Math.abs(b.driftPct) - Math.abs(a.driftPct));

    const totalBuyTHB = rows.filter(r => r.action === "buy").reduce((s, r) => s + r.absDeltaTHB, 0);
    const totalSellTHB = rows.filter(r => r.action === "sell").reduce((s, r) => s + r.absDeltaTHB, 0);
    const activeRows = rows.filter(r => r.action !== "hold");
    const topAction = rows[0] || null;

    return { byClass, totalTHB, rows, totalBuyTHB, totalSellTHB, activeRows, topAction };
  }, [FX, holdings, profile, tolerance]);

  const turnoverTHB = Math.max(plan.totalBuyTHB, plan.totalSellTHB);
  const buyCount = plan.rows.filter(r => r.action === "buy").length;
  const sellCount = plan.rows.filter(r => r.action === "sell").length;
  const profileMeta = REBALANCE_PROFILES[profile] || REBALANCE_PROFILES.balanced;
  const topBuy = plan.rows.find(r => r.action === "buy") || null;
  const topSell = plan.rows.find(r => r.action === "sell") || null;
  const capitalTHB = Math.max(0, Number(capital) || 0);
  const buyPowerTHB = Math.max(0, capitalTHB - plan.totalTHB);
  const needMoreTHB = Math.max(0, plan.totalTHB - capitalTHB);
  const targetBasisTHB = Math.max(plan.totalTHB, capitalTHB);

  const assetRows = React.useMemo(() => {
    return holdings.map(h => {
      const valueTHB = h.qty * h.price * (h.ccy === "THB" ? 1 : FX);
      const currentPct = plan.totalTHB > 0 ? (valueTHB / plan.totalTHB) * 100 : 0;
      const savedTarget = assetTargets[h.ticker];
      const hasTarget = savedTarget !== undefined && savedTarget !== "";
      const targetPct = hasTarget ? Math.max(0, Number(savedTarget) || 0) : currentPct;
      const targetValueTHB = targetBasisTHB * targetPct / 100;
      const gapTHB = targetValueTHB - valueTHB;
      return {
        ...h,
        valueTHB,
        currentPct,
        targetPct,
        targetValueTHB,
        gapTHB,
        buyNeedTHB: Math.max(0, gapTHB),
        overTHB: Math.max(0, -gapTHB),
        hasTarget,
      };
    }).sort((a, b) => b.buyNeedTHB - a.buyNeedTHB || b.valueTHB - a.valueTHB);
  }, [FX, assetTargets, holdings, plan.totalTHB, targetBasisTHB]);

  const targetPctSum = assetRows.reduce((s, h) => s + (Number(h.targetPct) || 0), 0);
  const totalAssetNeedTHB = assetRows.reduce((s, h) => s + h.buyNeedTHB, 0);
  const allAssetTargetsEntered = assetRows.length > 0 && assetRows.every(h => h.hasTarget);
  const assetTargetsComplete = allAssetTargetsEntered && Math.abs(targetPctSum - 100) <= 0.05;
  const annualPlanReady = assetTargetsComplete && capitalTHB > 0;
  const targetStatusText = !allAssetTargetsEntered
    ? "กรอกเป้าให้ครบทุกตัวก่อนบันทึก"
    : !assetTargetsComplete
      ? targetPctSum < 100
        ? `ยังขาดอีก ${(100 - targetPctSum).toFixed(1)}%`
        : `เกินเป้า ${(targetPctSum - 100).toFixed(1)}%`
      : capitalTHB <= 0
        ? "ใส่เงินทุนปีนี้ก่อนบันทึก"
        : "เป้าหมายครบ 100% พร้อมบันทึก";
  const savedPlan = yearPlans[String(planYear)] || null;

  const setProfileAndPersist = (next) => {
    setProfile(next);
    window.updateSettings?.({ rebalanceProfile: next });
  };

  const setToleranceAndPersist = (next) => {
    setTolerance(next);
    window.updateSettings?.({ rebalanceTolerance: Number(next) });
  };

  const setCapitalAndPersist = (next) => {
    const normalized = Math.max(0, Number(next) || 0);
    setCapital(normalized);
    window.updateSettings?.({ rebalanceCapitalTHB: normalized });
  };

  const setAssetTargetAndPersist = (ticker, next) => {
    const clean = next === "" ? "" : Math.min(100, Math.max(0, Number(next) || 0));
    const updated = { ...assetTargets };
    if (clean === "") delete updated[ticker];
    else updated[ticker] = clean;
    setAssetTargets(updated);
    window.updateSettings?.({ rebalanceAssetTargets: updated });
  };

  const saveAnnualPlan = () => {
    if (!annualPlanReady) return;
    const key = String(planYear || new Date().getFullYear() + 543);
    const snapshot = {
      year: key,
      savedAt: new Date().toISOString(),
      capitalTHB,
      totalTHB: plan.totalTHB,
      buyPowerTHB,
      targetPctSum,
      assetTargets: { ...assetTargets },
      assets: assetRows.map(h => ({
        ticker: h.ticker,
        classKey: h.classKey,
        currentPct: Number(h.currentPct.toFixed(4)),
        targetPct: Number(h.targetPct.toFixed(4)),
        valueTHB: Math.round(h.valueTHB),
        buyNeedTHB: Math.round(h.buyNeedTHB),
        overTHB: Math.round(h.overTHB),
      })),
    };
    const updated = { ...yearPlans, [key]: snapshot };
    setYearPlans(updated);
    window.updateSettings?.({ rebalanceYearPlans: updated });
  };

  const deleteAnnualPlan = (year) => {
    const key = String(year);
    const updated = { ...yearPlans };
    delete updated[key];
    setYearPlans(updated);
    window.updateSettings?.({ rebalanceYearPlans: updated });
  };

  return (
    <PageShell
      title="Rebalance"
      sub="คำนวณสัดส่วนพอร์ตจริง เทียบ target mix แล้วแนะนำว่าควรซื้อหรือขายตรงไหนก่อน"
      actions={
        <div style={{display:"flex", gap:8, flexWrap:"wrap"}}>
          <button className="btn sm" onClick={() => { location.hash = "#rebalance-history"; }}>
            <Ico name="history" size={13}/> ประวัติแผน
          </button>
          <button className="btn sm" onClick={() => { location.hash = "#portfolio"; }}>
            <Ico name="wallet" size={13}/> ดูพอร์ต
          </button>
          <button className="btn sm accent" onClick={() => onAddDCA?.()}>
            <Ico name="plus" size={13}/> ตั้ง DCA
          </button>
        </div>
      }
    >
      <div className="kpi-grid rebalance-kpis" style={{marginBottom:20}}>
        <div className="kpi">
          <div className="label">มูลค่าพอร์ต</div>
          <div className="value">{ccySym}{ccy === "THB" ? Math.round(plan.totalTHB).toLocaleString() : fmtNum(plan.totalTHB / FX, 2)}</div>
          <div className="delta" style={{color:"var(--muted)"}}>ยอดถือครองทั้งหมด</div>
        </div>
        <div className="kpi">
          <div className="label">เงินทุนรอบนี้ (THB)</div>
          <div style={{display:"flex", flexDirection:"column", gap:8, marginTop:2}}>
            <input
              className="form-input"
              type="number"
              min="0"
              step="1000"
              inputMode="decimal"
              value={capitalTHB > 0 ? capitalTHB : ""}
              placeholder={Math.round(plan.totalTHB).toLocaleString()}
              onChange={e => setCapitalAndPersist(e.target.value)}
              style={{height:40, fontSize:16, fontWeight:700, fontFamily:"var(--font-num)"}}
            />
            <div className="delta" style={{color:"var(--muted)"}}>
              ฟิกเป็นเงินบาท ไม่เปลี่ยนตามปุ่มสกุลเงิน
            </div>
          </div>
        </div>
        <div className="kpi">
          <div className="label">ซื้อเพิ่มได้</div>
          <div className="value" style={{color: buyPowerTHB > 0 ? "var(--up)" : "var(--muted)"}}>
            {ccySym}{ccy === "THB" ? Math.round(buyPowerTHB).toLocaleString() : fmtNum(buyPowerTHB / FX, 2)}
          </div>
          <div className="delta" style={{color:"var(--muted)"}}>
            {needMoreTHB > 0
              ? `ต้องเติมอีก ${ccySym}${ccy === "THB" ? Math.round(needMoreTHB).toLocaleString() : fmtNum(needMoreTHB / FX, 2)}`
              : `เหลือจากพอร์ต ${ccySym}${ccy === "THB" ? Math.round(buyPowerTHB).toLocaleString() : fmtNum(buyPowerTHB / FX, 2)}`}
          </div>
        </div>
        <div className="kpi">
          <div className="label">ต้องหมุนเงิน</div>
          <div className="value" style={{color: turnoverTHB > 0 ? "var(--accent-ink)" : "var(--muted)"}}>
            {ccySym}{ccy === "THB" ? Math.round(turnoverTHB).toLocaleString() : fmtNum(turnoverTHB / FX, 2)}
          </div>
          <div className="delta">ซื้อ {buyCount} หมวด · ขาย {sellCount} หมวด</div>
        </div>
        <div className="kpi">
          <div className="label">สิ่งที่ควรทำก่อนสุด</div>
          <div className="value" style={{fontSize:18}}>
            {plan.topAction
              ? plan.topAction.action === "buy"
                ? `ซื้อ ${plan.topAction.anchorTicker}`
                : plan.topAction.action === "sell"
                  ? `ลด ${plan.topAction.anchorTicker}`
                  : "ปล่อยไว้ได้"
              : "ยังไม่ต้อง rebalance"}
          </div>
          <div className="delta" style={{color:"var(--muted)"}}>
            {plan.topAction ? `${plan.topAction.label} drift ${plan.topAction.driftPct >= 0 ? "+" : ""}${plan.topAction.driftPct.toFixed(1)}pts` : "ไม่มีข้อมูลพอ"}
          </div>
        </div>
      </div>

      <div className="rebalance-grid">
        <div className="card rebalance-main">
          <div className="card-head">
            <div>
              <div className="card-title">แผน Rebalance ตาม target mix</div>
              <div className="card-sub">{profileMeta.label} · {profileMeta.note}</div>
            </div>
          </div>

          <div className="rebalance-toolbar">
            <div className="rebalance-profile-tabs">
              {Object.entries(REBALANCE_PROFILES).map(([key, p]) => (
                <button key={key}
                        className={profile === key ? "is-on" : ""}
                        onClick={() => setProfileAndPersist(key)}>
                  {p.label}
                </button>
              ))}
            </div>
            <div className="rebalance-tolerance">
              <label>
                <span>Band / threshold</span>
                <b>{Number(tolerance).toFixed(0)} pts</b>
              </label>
              <input
                type="range"
                min="2"
                max="12"
                step="1"
                value={tolerance}
                onChange={e => setToleranceAndPersist(Number(e.target.value))}
              />
            </div>
          </div>

          <div className="asset-target-panel">
            <div className="asset-target-head">
              <div>
                <div className="card-title">เป้าหมายรายสินทรัพย์ที่ถืออยู่</div>
                <div className="card-sub">
                  ตั้งว่าแต่ละตัวอยากให้เป็นกี่ % แล้วระบบจะบอกว่าขาดอีกเท่าไรถึงเป้า
                </div>
              </div>
              <div className="asset-target-summary">
                <span>รวมเป้า {targetPctSum.toFixed(1)}%</span>
                <b>{ccySym}{ccy === "THB" ? Math.round(totalAssetNeedTHB).toLocaleString() : fmtNum(totalAssetNeedTHB / FX, 2)}</b>
              </div>
            </div>
            <div className={`annual-plan-save ${annualPlanReady ? "is-ready" : ""}`}>
              <div>
                <b>{targetStatusText}</b>
                <span>
                  ทุนปีนี้ ฿{Math.round(capitalTHB).toLocaleString()} ·
                  {savedPlan ? ` บันทึกปี ${planYear} แล้ว` : " ยังไม่ได้บันทึกปีนี้"}
                </span>
              </div>
              <div className="annual-plan-actions">
                <input
                  className="form-input"
                  type="number"
                  min="2500"
                  step="1"
                  value={planYear}
                  onChange={e => setPlanYear(e.target.value)}
                  aria-label="ปีแผน Rebalance"
                />
                <button
                  type="button"
                  className={`btn sm ${annualPlanReady ? "accent" : ""}`}
                  disabled={!annualPlanReady}
                  onClick={saveAnnualPlan}
                >
                  บันทึกแผนปีนี้
                </button>
              </div>
            </div>
            {Object.keys(yearPlans).length > 0 && (
              <div className="annual-plan-history">
                {Object.keys(yearPlans).sort((a, b) => Number(b) - Number(a)).slice(0, 4).map(y => {
                  const item = yearPlans[y];
                  return (
                    <button
                      type="button"
                      key={y}
                      className={`annual-plan-chip ${String(planYear) === String(y) ? "is-on" : ""}`}
                      onClick={() => {
                        setPlanYear(String(y));
                        if (item?.assetTargets) {
                          setAssetTargets(item.assetTargets);
                          window.updateSettings?.({ rebalanceAssetTargets: item.assetTargets });
                        }
                        if (item?.capitalTHB != null) setCapitalAndPersist(item.capitalTHB);
                      }}
                    >
                      <b>{y}</b>
                      <span
                        className="annual-plan-delete"
                        role="button"
                        tabIndex={0}
                        aria-label={`delete plan ${y}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteAnnualPlan(y);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            e.stopPropagation();
                            deleteAnnualPlan(y);
                          }
                        }}
                      >
                        &times;
                      </span>
                      <span>฿{Math.round(item?.capitalTHB || 0).toLocaleString()}</span>
                    </button>
                  );
                })}
              </div>
            )}
            <div className="asset-target-list">
              {assetRows.length === 0 ? (
                <div className="rebalance-empty">ยังไม่มีสินทรัพย์ในพอร์ต</div>
              ) : assetRows.map(h => {
                const displayNeed = ccy === "THB" ? Math.round(h.buyNeedTHB).toLocaleString() : fmtNum(h.buyNeedTHB / FX, 2);
                const displayOver = ccy === "THB" ? Math.round(h.overTHB).toLocaleString() : fmtNum(h.overTHB / FX, 2);
                const displayValue = ccy === "THB" ? Math.round(h.valueTHB).toLocaleString() : fmtNum(h.valueTHB / FX, 2);
                const canFill = buyPowerTHB > 0 ? Math.min(h.buyNeedTHB, buyPowerTHB) : 0;
                const displayCanFill = ccy === "THB" ? Math.round(canFill).toLocaleString() : fmtNum(canFill / FX, 2);
                return (
                  <div className="asset-target-row" key={h.id || h.ticker}>
                    <button type="button" className="asset-target-name" onClick={() => onOpenAsset?.(h)}>
                      <AssetIcon ticker={h.ticker} classKey={h.classKey} size={32}/>
                      <span>
                        <b>{h.ticker}</b>
                        <small>{ccySym}{displayValue} · ตอนนี้ {h.currentPct.toFixed(1)}%</small>
                      </span>
                    </button>
                    <div className="asset-target-input">
                      <input
                        className="form-input"
                        type="number"
                        min="0"
                        max="100"
                        step="0.5"
                        inputMode="decimal"
                        value={assetTargets[h.ticker] ?? ""}
                        placeholder={h.currentPct.toFixed(1)}
                        onChange={e => setAssetTargetAndPersist(h.ticker, e.target.value)}
                      />
                      <span>%</span>
                    </div>
                    <div className="asset-target-gap">
                      <b style={{color: h.buyNeedTHB > 0 ? "var(--up)" : "var(--muted)"}}>
                        {h.buyNeedTHB > 0 ? `${ccySym}${displayNeed}` : "ถึงเป้าแล้ว"}
                      </b>
                      <small>
                        {h.buyNeedTHB > 0
                          ? `ซื้อได้ตอนนี้ ${ccySym}${displayCanFill}`
                          : h.overTHB > 0
                            ? `เกินเป้า ${ccySym}${displayOver}`
                            : "น้ำหนักพอดี"}
                      </small>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rebalance-list">
            {plan.rows.map(row => {
              const isHold = row.action === "hold";
              const actionLabel = row.action === "buy" ? "ซื้อเพิ่ม" : row.action === "sell" ? "ลดน้ำหนัก" : "อยู่ใน band";
              const suggestionText = row.action === "buy"
                ? `เติม ${fmtCcy(row.absDeltaTHB, ccy)} เข้า ${row.anchorTicker}`
                : row.action === "sell"
                  ? `ลด ${fmtCcy(row.absDeltaTHB, ccy)} ออกจาก ${row.anchorTicker}`
                  : "สัดส่วนใกล้ target แล้ว";
              return (
                <div className={`rebalance-item ${row.action}`} key={row.classKey}>
                  <div className="rebalance-item-head">
                    <div className="rebalance-item-title">
                      <span className="rebalance-dot" style={{background: row.color}} />
                      <div>
                        <div className="rebalance-item-name">{row.label}</div>
                        <div className="rebalance-item-sub">แนะนำหลัก: {row.anchorTicker}</div>
                      </div>
                    </div>
                    <div className="rebalance-item-meta">
                      <div className="rebalance-current">{row.currentPct.toFixed(1)}%</div>
                      <div className="rebalance-target">target {row.targetPct.toFixed(1)}%</div>
                    </div>
                  </div>

                  <div className="rebalance-bar">
                    <div className="rebalance-fill" style={{width: `${Math.min(row.currentPct, 100)}%`, background: row.color}} />
                    <span className="rebalance-marker" style={{left: `${Math.min(row.targetPct, 100)}%`}} />
                  </div>

                  <div className="rebalance-item-foot">
                    <span className={`rebalance-action ${row.action}`}>{actionLabel}</span>
                    <span className="rebalance-drift">
                      {row.driftPct >= 0 ? "+" : ""}{row.driftPct.toFixed(1)} pts
                    </span>
                    <span className="rebalance-amount">
                      {isHold ? "ไม่มี trade เพิ่ม" : suggestionText}
                    </span>
                  </div>

                  <div className="rebalance-holdings">
                    {(row.classHoldings.length > 0 ? row.classHoldings.slice(0, 3) : [{ ticker: row.anchorTicker, placeholder: true }]).map(h => {
                      const label = h.placeholder
                        ? h.ticker
                        : `${h.ticker} · ${ccySym}${ccy === "THB" ? Math.round(h.valueTHB).toLocaleString() : fmtNum(h.valueTHB / FX, 2)}`;
                      const chip = <span className="rebalance-chip-text">{label}</span>;
                      return h.placeholder ? (
                        <span className="rebalance-chip" key={h.ticker}>{chip}</span>
                      ) : (
                        <button
                          type="button"
                          className="rebalance-chip"
                          key={h.id}
                          onClick={() => onOpenAsset?.(h)}
                        >
                          {chip}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rebalance-side">
          <div className="card rebalance-rule-card">
            <div className="card-head" style={{marginBottom:12}}>
              <div>
                <div className="card-title">กฎที่ใช้</div>
                <div className="card-sub">กฎง่าย ๆ ที่ช่วยไม่ให้ rebalance ถี่เกินไป</div>
              </div>
            </div>
            <div className="rebalance-rule-list">
              <div className="rebalance-rule">
                <span>1</span>
                <div>
                  <b>Trim ก่อนเติม</b>
                  <p>ขายหมวดที่เกิน target ก่อน แล้วค่อยเติมหมวดที่ขาด</p>
                </div>
              </div>
              <div className="rebalance-rule">
                <span>2</span>
                <div>
                  <b>ใช้ DCA เป็นเชื้อเพลิง</b>
                  <p>ถ้ามีเงินเข้าใหม่ ให้เติมหมวดที่ underweight มากสุดก่อน</p>
                </div>
              </div>
              <div className="rebalance-rule">
                <span>3</span>
                <div>
                  <b>อย่าขยับถี่เกินไป</b>
                  <p>ตั้ง band ไว้ที่ {Number(tolerance).toFixed(0)} pts แล้วค่อยเช็กซ้ำรอบถัดไป</p>
                </div>
              </div>
            </div>
          </div>

          <div className="card rebalance-alert-card">
            <div className="card-head" style={{marginBottom:12}}>
              <div>
                <div className="card-title">Rebalance alerts</div>
                <div className="card-sub">รายการเตือนที่ปักหมุดไว้จาก store</div>
              </div>
            </div>
            <div className="rebalance-alert-list">
              {(store.rebalanceAlerts || []).length === 0 ? (
                <div className="rebalance-empty">ยังไม่มี alert</div>
              ) : (
                (store.rebalanceAlerts || []).map(a => (
                  <div className="rebalance-alert" key={a.id}>
                    <div className="rebalance-alert-head">
                      <div>
                        <b>{a.ticker}</b>
                        <span>{a.action === "sell" ? "ควรลด" : "ควรเพิ่ม"} · {a.delta}</span>
                      </div>
                      <button type="button" className="rebalance-dismiss" onClick={() => window.dismissAlert?.(a.id)}>
                        <Ico name="x" size={12}/>
                      </button>
                    </div>
                    <p>{a.reason}</p>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="card rebalance-tip-card">
            <div className="card-title" style={{marginBottom:8}}>คำแนะนำเพิ่ม</div>
            <div className="rebalance-tip">
              <b>เริ่มจาก class ที่ drift สูงสุด</b>
              <span>ถ้าจะใช้ cash flow เดือนนี้ ให้เริ่มจาก {topBuy ? topBuy.anchorTicker : "หมวดที่ขาดสุด"} ก่อน แล้วค่อยไล่รองลงมา</span>
            </div>
            <div className="rebalance-tip">
              <b>ดูพร้อมกับพอร์ตจริง</b>
              <span>ถ้าต้องการลงลึก เปิดหน้า Portfolio เพื่อดูรายสินทรัพย์ก่อนตัดสินใจขายหรือเติม</span>
            </div>
            <div className="rebalance-tip">
              <b>ใช้ DCA เป็นตัวช่วย</b>
              <span>
                {nextDCA
                  ? `DCA ถัดไปคือ ${nextDCA.ticker} ใน ${Math.max(0, window.daysBetween(window.todayISO(), nextDCA.nextDate))} วัน`
                  : "ยังไม่มี DCA active ให้ใช้เติมพอร์ต"}
              </span>
            </div>
            <div className="rebalance-tip">
              <b>สรุปทุนที่ตั้งไว้</b>
              <span>
                ทุนทั้งหมด ฿{Math.round(capitalTHB).toLocaleString()} ·
                ซื้อเพิ่มได้ ฿{Math.round(buyPowerTHB).toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      </div>
    </PageShell>
  );
}

// ─────── CSS for page layouts ───────
function RebalanceHistoryView({ ccy, onBack }) {
  const store = window.useStore();
  const FX = Number(store.fx || 35.8);
  const settings = store.settings || {};
  const yearPlans = settings.rebalanceYearPlans || {};
  const years = Object.keys(yearPlans).sort((a, b) => Number(b) - Number(a));
  const [selectedYear, setSelectedYear] = React.useState(() => years[0] || "");

  React.useEffect(() => {
    if (!years.length) {
      if (selectedYear) setSelectedYear("");
      return;
    }
    if (!selectedYear || !yearPlans[selectedYear]) setSelectedYear(years[0]);
  }, [years.join("|"), selectedYear]);

  const plan = selectedYear ? yearPlans[selectedYear] : null;
  const assets = (plan?.assets || []).slice().sort((a, b) => Number(b.targetPct || 0) - Number(a.targetPct || 0));
  const money = (value) => {
    const n = Number(value) || 0;
    return ccy === "THB" ? "\u0E3F" + Math.round(n).toLocaleString("th-TH") : "$" + fmtNum(n / FX, 2);
  };
  const totalNeed = assets.reduce((sum, a) => sum + Math.max(0, Number(a.buyNeedTHB || 0)), 0);
  const totalOver = assets.reduce((sum, a) => sum + Math.max(0, Number(a.overTHB || 0)), 0);
  const topNeed = assets.filter(a => Number(a.buyNeedTHB || 0) > 0).slice(0, 3);
  const targetSum = Number(plan?.targetPctSum || assets.reduce((sum, a) => sum + Number(a.targetPct || 0), 0));
  const progressPct = Number(plan?.capitalTHB || 0) > 0 ? Math.min(100, (Number(plan?.totalTHB || 0) / Number(plan?.capitalTHB || 0)) * 100) : 0;
  const savedAt = plan?.savedAt ? new Date(plan.savedAt).toLocaleString("th-TH", { dateStyle: "medium", timeStyle: "short" }) : "-";

  const loadPlan = () => {
    if (!plan) return;
    window.updateSettings?.({
      rebalanceAssetTargets: plan.assetTargets || {},
      rebalanceCapitalTHB: Number(plan.capitalTHB || 0),
    });
    location.hash = "#rebalance";
  };

  const deletePlan = () => {
    if (!selectedYear) return;
    const updated = { ...yearPlans };
    delete updated[selectedYear];
    window.updateSettings?.({ rebalanceYearPlans: updated });
    setSelectedYear(Object.keys(updated).sort((a, b) => Number(b) - Number(a))[0] || "");
  };

  return (
    <PageShell
      title="ประวัติแผน Rebalance"
      sub="ดูแผนที่บันทึกไว้แต่ละปี พร้อมทุนที่ใช้ สัดส่วนเป้าหมาย และสินทรัพย์ในแผน"
      actions={
        <div style={{display:"flex", gap:8, flexWrap:"wrap"}}>
          <button className="btn sm" onClick={onBack || (() => { location.hash = "#rebalance"; })}>
            <Ico name="swap" size={13}/> กลับ Rebalance
          </button>
          {plan && (
            <button className="btn sm accent" onClick={loadPlan}>
              <Ico name="swap" size={13}/> โหลดแผนนี้
            </button>
          )}
        </div>
      }
    >
      {!years.length ? (
        <div className="card rebalance-history-empty">
          <div className="rebalance-history-empty-icon">%</div>
          <b>ยังไม่มีประวัติแผนรายปี</b>
          <span>กลับไปหน้า Rebalance ตั้งเป้าให้ครบ 100% แล้วกดบันทึกแผนปีนี้</span>
          <button className="btn primary" onClick={onBack || (() => { location.hash = "#rebalance"; })}>
            เปิดหน้า Rebalance
          </button>
        </div>
      ) : (
        <div className="rebalance-history-page">
          <div className="rebalance-year-rail">
            {years.map((year) => {
              const item = yearPlans[year] || {};
              return (
                <button
                  type="button"
                  key={year}
                  className={String(selectedYear) === String(year) ? "is-on" : ""}
                  onClick={() => setSelectedYear(year)}
                >
                  <b>{year}</b>
                  <span>{money(item.capitalTHB || 0)}</span>
                  <small>{(item.assets || []).length || 0} สินทรัพย์</small>
                </button>
              );
            })}
          </div>

          <div className="rebalance-history-main">
            <div className="kpi-grid rebalance-history-kpis" style={{marginBottom:20}}>
              <div className="kpi">
                <div className="label">ปีแผน</div>
                <div className="value">{selectedYear || "-"}</div>
                <div className="delta" style={{color:"var(--muted)"}}>บันทึก {savedAt}</div>
              </div>
              <div className="kpi">
                <div className="label">เงินทุนที่ตั้งไว้</div>
                <div className="value">{money(plan?.capitalTHB || 0)}</div>
                <div className="delta" style={{color:"var(--muted)"}}>ทุนประจำปีที่ล็อกไว้</div>
              </div>
              <div className="kpi">
                <div className="label">ทุนที่ใช้ในพอร์ต</div>
                <div className="value">{money(plan?.totalTHB || 0)}</div>
                <div className="delta" style={{color:"var(--muted)"}}>มูลค่าพอร์ตตอนบันทึก</div>
              </div>
              <div className="kpi">
                <div className="label">ซื้อเพิ่มได้</div>
                <div className="value" style={{color:"var(--up)"}}>{money(plan?.buyPowerTHB || 0)}</div>
                <div className="delta" style={{color:"var(--muted)"}}>เงินเหลือเทียบทุนปีนั้น</div>
              </div>
            </div>

            <div className="rebalance-history-grid">
              <div className="card rebalance-history-summary">
                <div className="card-head" style={{marginBottom:12}}>
                  <div>
                    <div className="card-title">สรุปสัดส่วนแผน</div>
                    <div className="card-sub">รวมเป้า {targetSum.toFixed(1)}% · ใช้ทุน {progressPct.toFixed(1)}%</div>
                  </div>
                </div>
                <div className="rebalance-history-progress">
                  <div className="rebalance-history-progress-fill" style={{width: `${Math.max(2, Math.min(100, progressPct)).toFixed(0)}%`}} />
                </div>
                <div className="rebalance-history-metrics">
                  <div><span>ขาดซื้อรวม</span><b style={{color:"var(--up)"}}>{money(totalNeed)}</b></div>
                  <div><span>เกินเป้ารวม</span><b style={{color: totalOver > 0 ? "var(--down)" : "var(--muted)"}}>{money(totalOver)}</b></div>
                  <div><span>จำนวนสินทรัพย์</span><b>{assets.length} ตัว</b></div>
                </div>
                <div className="rebalance-history-callout">
                  <b>รายการที่ควรเติมก่อน</b>
                  {topNeed.length
                    ? topNeed.map(a => <span key={a.ticker}>{a.ticker} ขาดอีก {money(a.buyNeedTHB)}</span>)
                    : <span>แผนนี้ไม่มีรายการที่ขาดเป้า</span>}
                </div>
              </div>

              <div className="card rebalance-history-actions">
                <div className="card-title">จัดการแผนปีนี้</div>
                <div className="card-sub" style={{marginBottom:12}}>โหลดกลับไปแก้ไขในหน้า Rebalance หรือลบเฉพาะปีนี้ได้</div>
                <button className="btn primary" onClick={loadPlan}>
                  <Ico name="swap" size={14}/> โหลดแผนนี้ไปแก้
                </button>
                <button className="btn" onClick={deletePlan}>
                  <Ico name="x" size={14}/> ลบแผนปี {selectedYear}
                </button>
              </div>
            </div>

            <div className="card rebalance-history-assets">
              <div className="card-head" style={{marginBottom:12}}>
                <div>
                  <div className="card-title">สินทรัพย์ในแผนปี {selectedYear}</div>
                  <div className="card-sub">เทียบสัดส่วนตอนบันทึกกับเป้าหมายรายสินทรัพย์</div>
                </div>
              </div>
              {assets.length === 0 ? (
                <div className="rebalance-empty">แผนนี้ยังไม่มีรายการสินทรัพย์</div>
              ) : (
                <div className="rebalance-history-asset-list">
                  {assets.map((asset) => {
                    const currentPct = Number(asset.currentPct || 0);
                    const targetPct = Number(asset.targetPct || 0);
                    const need = Math.max(0, Number(asset.buyNeedTHB || 0));
                    const over = Math.max(0, Number(asset.overTHB || 0));
                    const status = need > 0 ? "ขาดเป้า" : over > 0 ? "เกินเป้า" : "พอดี";
                    const statusClass = need > 0 ? "buy" : over > 0 ? "sell" : "hold";
                    return (
                      <div className="rebalance-history-asset" key={asset.ticker}>
                        <div className="rebalance-history-asset-head">
                          <div>
                            <b>{asset.ticker}</b>
                            <span>{asset.classKey || "asset"} · มูลค่า {money(asset.valueTHB || 0)}</span>
                          </div>
                          <em className={statusClass}>{status}</em>
                        </div>
                        <div className="rebalance-history-bars">
                          <div>
                            <span>ตอนบันทึก {currentPct.toFixed(1)}%</span>
                            <div><i style={{width:`${Math.max(2, Math.min(100, currentPct)).toFixed(0)}%`}} /></div>
                          </div>
                          <div>
                            <span>เป้าหมาย {targetPct.toFixed(1)}%</span>
                            <div><i className="target" style={{width:`${Math.max(2, Math.min(100, targetPct)).toFixed(0)}%`}} /></div>
                          </div>
                        </div>
                        <div className="rebalance-history-asset-foot">
                          <span>ขาดอีก {money(need)}</span>
                          <span>เกินเป้า {money(over)}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </PageShell>
  );
}

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

/* Rebalance page */
.rebalance-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.55fr) minmax(300px, .9fr);
  gap: 20px;
  align-items: start;
}
.rebalance-main,
.rebalance-side {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.rebalance-toolbar {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(240px, 320px);
  gap: 14px;
  margin-bottom: 16px;
}
.rebalance-profile-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.rebalance-profile-tabs button {
  border: 1px solid var(--line);
  background: var(--surface-2);
  color: var(--ink-2);
  border-radius: 999px;
  padding: 7px 12px;
  font-size: 12px;
  font-weight: 700;
  transition: transform .15s ease, border-color .15s ease, background .15s ease, color .15s ease;
}
.rebalance-profile-tabs button:hover { transform: translateY(-1px); border-color: var(--accent); }
.rebalance-profile-tabs button.is-on {
  background: var(--accent-soft);
  color: var(--accent-ink);
  border-color: var(--accent);
}
.rebalance-tolerance {
  border: 1px solid var(--line);
  border-radius: 16px;
  background: var(--surface-2);
  padding: 10px 12px 11px;
}
.rebalance-tolerance label {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 10px;
  font-size: 12px;
  margin-bottom: 8px;
}
.rebalance-tolerance label b {
  color: var(--accent-ink);
  font-size: 13px;
}
.rebalance-tolerance input[type="range"] {
  width: 100%;
  accent-color: var(--accent);
}
.rebalance-list {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.asset-target-panel {
  border: 1px solid var(--line);
  border-radius: 18px;
  padding: 14px;
  margin-bottom: 16px;
  background: linear-gradient(135deg, var(--surface), var(--surface-2));
}
.asset-target-head {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: flex-start;
  margin-bottom: 12px;
}
.asset-target-summary {
  text-align: right;
  flex-shrink: 0;
}
.asset-target-summary span {
  display: block;
  font-size: 11px;
  color: var(--muted);
}
.asset-target-summary b {
  display: block;
  margin-top: 2px;
  font-family: var(--font-num);
  font-size: 18px;
  color: var(--accent-ink);
}
.annual-plan-save {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 12px;
  align-items: center;
  border: 1px solid var(--line);
  border-radius: 14px;
  padding: 10px 12px;
  margin-bottom: 10px;
  background: var(--surface);
}
.annual-plan-save.is-ready {
  border-color: color-mix(in oklab, var(--up) 38%, var(--line));
  background: color-mix(in oklab, var(--up-soft) 48%, var(--surface));
}
.annual-plan-save b {
  display: block;
  font-size: 12px;
  color: var(--ink);
}
.annual-plan-save span {
  display: block;
  margin-top: 2px;
  color: var(--muted);
  font-size: 11px;
}
.annual-plan-actions {
  display: grid;
  grid-template-columns: 86px auto;
  gap: 8px;
  align-items: center;
}
.annual-plan-actions .form-input {
  height: 32px;
  padding: 6px 8px;
  font-family: var(--font-num);
  font-weight: 800;
}
.annual-plan-history {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;
}
.annual-plan-history .annual-plan-chip {
  position: relative;
  border: 1px solid var(--line);
  border-radius: 12px;
  background: var(--surface);
  color: var(--ink);
  padding: 7px 34px 7px 10px;
  min-width: 114px;
  text-align: left;
}
.annual-plan-history .annual-plan-chip.is-on {
  border-color: var(--accent);
  background: var(--accent-soft);
}
.annual-plan-history b {
  display: block;
  font-size: 12px;
}
.annual-plan-history span {
  display: block;
  margin-top: 1px;
  color: var(--muted);
  font-size: 11px;
}
.annual-plan-delete {
  position: absolute;
  right: 7px;
  top: 50%;
  transform: translateY(-50%);
  display: grid !important;
  place-items: center;
  width: 22px;
  height: 22px;
  margin: 0 !important;
  border-radius: 999px;
  color: var(--down) !important;
  background: color-mix(in oklab, var(--down-soft) 58%, transparent);
  font-size: 18px !important;
  font-weight: 900;
  line-height: 1;
}
.annual-plan-delete:hover {
  color: #fff !important;
  background: var(--down);
}
.asset-target-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.asset-target-row {
  display: grid;
  grid-template-columns: minmax(180px, 1fr) 112px minmax(145px, .65fr);
  gap: 12px;
  align-items: center;
  border: 1px solid var(--line);
  border-radius: 14px;
  padding: 10px 12px;
  background: var(--surface);
}
.asset-target-name {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--ink);
  text-align: left;
}
.asset-target-name b {
  display: block;
  font-family: var(--font-mono);
  font-size: 13px;
}
.asset-target-name small {
  display: block;
  margin-top: 1px;
  color: var(--muted);
  font-size: 11px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.asset-target-input {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 6px;
}
.asset-target-input .form-input {
  height: 34px;
  padding: 6px 9px;
  font-family: var(--font-num);
  font-weight: 800;
  text-align: right;
}
.asset-target-input span {
  color: var(--muted);
  font-size: 12px;
  font-weight: 800;
}
.asset-target-gap {
  text-align: right;
  min-width: 0;
}
.asset-target-gap b {
  display: block;
  font-family: var(--font-num);
  font-size: 14px;
}
.asset-target-gap small {
  display: block;
  margin-top: 1px;
  color: var(--muted);
  font-size: 11px;
}
.rebalance-item {
  border: 1px solid var(--line);
  border-radius: 18px;
  padding: 14px 14px 12px;
  background: linear-gradient(135deg, var(--surface), var(--surface-2));
}
.rebalance-item.buy { background: linear-gradient(135deg, var(--surface), var(--up-soft)); }
.rebalance-item.sell { background: linear-gradient(135deg, var(--surface), var(--down-soft)); }
.rebalance-item.hold { background: linear-gradient(135deg, var(--surface), var(--surface-2)); }
.rebalance-item-head {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: flex-start;
}
.rebalance-item-title {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  min-width: 0;
}
.rebalance-dot {
  width: 14px;
  height: 14px;
  border-radius: 5px;
  flex-shrink: 0;
  margin-top: 2px;
}
.rebalance-item-name {
  font-size: 15px;
  font-weight: 800;
  color: var(--ink);
}
.rebalance-item-sub {
  font-size: 11px;
  color: var(--muted);
  margin-top: 2px;
}
.rebalance-item-meta {
  text-align: right;
  flex-shrink: 0;
}
.rebalance-current {
  font-family: var(--font-num);
  font-size: 20px;
  font-weight: 900;
  color: var(--ink);
}
.rebalance-target {
  font-size: 11px;
  color: var(--muted);
  margin-top: 2px;
}
.rebalance-bar {
  position: relative;
  height: 12px;
  border-radius: 999px;
  background: var(--line);
  margin-top: 12px;
  overflow: hidden;
}
.rebalance-fill {
  height: 100%;
  border-radius: inherit;
  opacity: .9;
}
.rebalance-marker {
  position: absolute;
  top: -3px;
  width: 3px;
  height: 18px;
  border-radius: 999px;
  background: var(--ink);
  box-shadow: 0 0 0 2px rgba(255,255,255,.5);
  transform: translateX(-1px);
}
.rebalance-item-foot {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 10px;
  align-items: center;
  margin-top: 10px;
}
.rebalance-action {
  display: inline-flex;
  align-items: center;
  min-height: 22px;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 10.5px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: .04em;
}
.rebalance-action.buy { background: var(--up-soft); color: var(--up); }
.rebalance-action.sell { background: var(--down-soft); color: var(--down); }
.rebalance-action.hold { background: var(--surface-2); color: var(--muted); }
.rebalance-drift {
  font-family: var(--font-num);
  font-size: 12px;
  font-weight: 800;
  color: var(--accent-ink);
}
.rebalance-amount {
  font-size: 12px;
  color: var(--ink-2);
}
.rebalance-holdings {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 12px;
}
.rebalance-chip {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  border: 1px solid var(--line);
  border-radius: 999px;
  background: var(--surface);
  color: var(--ink);
  padding: 6px 10px;
  font-size: 11px;
  font-weight: 700;
}
.rebalance-chip-text { white-space: nowrap; }
.rebalance-rule-list,
.rebalance-alert-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.rebalance-rule {
  display: grid;
  grid-template-columns: 24px minmax(0, 1fr);
  gap: 10px;
  align-items: start;
  border: 1px solid var(--line);
  border-radius: 14px;
  padding: 10px 12px;
  background: var(--surface-2);
}
.rebalance-rule span {
  width: 24px;
  height: 24px;
  border-radius: 8px;
  display: grid;
  place-items: center;
  background: var(--accent-soft);
  color: var(--accent-ink);
  font-weight: 800;
  font-size: 11px;
}
.rebalance-rule b {
  display: block;
  font-size: 12px;
  color: var(--ink);
}
.rebalance-rule p {
  margin: 2px 0 0;
  font-size: 11px;
  color: var(--muted);
  line-height: 1.45;
}
.rebalance-alert {
  border: 1px solid var(--line);
  border-radius: 14px;
  padding: 10px 12px;
  background: var(--surface-2);
}
.rebalance-alert-head {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  align-items: flex-start;
}
.rebalance-alert-head b {
  display: block;
  font-size: 13px;
}
.rebalance-alert-head span {
  display: block;
  margin-top: 1px;
  font-size: 11px;
  color: var(--muted);
}
.rebalance-alert p {
  margin: 8px 0 0;
  font-size: 11px;
  line-height: 1.45;
  color: var(--ink-2);
}
.rebalance-dismiss {
  width: 24px;
  height: 24px;
  border-radius: 999px;
  border: 1px solid var(--line);
  background: var(--surface);
  color: var(--muted);
  display: grid;
  place-items: center;
}
.rebalance-tip {
  border-top: 1px solid var(--line);
  padding-top: 10px;
  margin-top: 10px;
}
.rebalance-tip:first-of-type {
  border-top: 0;
  padding-top: 0;
  margin-top: 0;
}
.rebalance-tip b {
  display: block;
  font-size: 12px;
  color: var(--ink);
}
.rebalance-tip span {
  display: block;
  margin-top: 2px;
  font-size: 11px;
  line-height: 1.45;
  color: var(--muted);
}
.rebalance-history-page {
  display: grid;
  grid-template-columns: 180px minmax(0, 1fr);
  gap: 18px;
  align-items: start;
}
.rebalance-year-rail {
  display: flex;
  flex-direction: column;
  gap: 10px;
  position: sticky;
  top: 86px;
}
.rebalance-year-rail button {
  border: 1px solid var(--line);
  border-radius: 14px;
  background: var(--surface);
  color: var(--ink);
  padding: 12px 14px;
  text-align: left;
  box-shadow: var(--shadow-sm);
}
.rebalance-year-rail button.is-on {
  border-color: var(--accent);
  background: linear-gradient(135deg, var(--accent-soft), var(--surface));
}
.rebalance-year-rail b,
.rebalance-year-rail span,
.rebalance-year-rail small {
  display: block;
}
.rebalance-year-rail b {
  font-size: 18px;
  font-family: var(--font-num);
}
.rebalance-year-rail span {
  margin-top: 3px;
  font-weight: 800;
  color: var(--accent-ink);
}
.rebalance-year-rail small {
  margin-top: 2px;
  color: var(--muted);
  font-size: 11px;
}
.rebalance-history-main {
  min-width: 0;
}
.rebalance-history-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.45fr) minmax(250px, .55fr);
  gap: 18px;
  margin-bottom: 18px;
}
.rebalance-history-progress {
  height: 12px;
  border-radius: 999px;
  overflow: hidden;
  background: var(--line);
}
.rebalance-history-progress-fill {
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, var(--accent), var(--up));
}
.rebalance-history-metrics {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
  margin-top: 14px;
}
.rebalance-history-metrics div {
  border: 1px solid var(--line);
  border-radius: 12px;
  padding: 10px;
  background: var(--surface-2);
}
.rebalance-history-metrics span,
.rebalance-history-callout span {
  display: block;
  color: var(--muted);
  font-size: 11px;
}
.rebalance-history-metrics b {
  display: block;
  margin-top: 3px;
  font-family: var(--font-num);
  font-size: 15px;
}
.rebalance-history-callout {
  margin-top: 14px;
  border: 1px dashed var(--line);
  border-radius: 14px;
  padding: 12px;
  background: var(--surface-2);
}
.rebalance-history-callout b {
  display: block;
  margin-bottom: 6px;
}
.rebalance-history-actions {
  display: flex;
  flex-direction: column;
  gap: 10px;
  align-self: stretch;
}
.rebalance-history-actions .btn {
  justify-content: center;
}
.rebalance-history-assets {
  padding-bottom: 16px;
}
.rebalance-history-asset-list {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}
.rebalance-history-asset {
  border: 1px solid var(--line);
  border-radius: 14px;
  padding: 12px;
  background: var(--surface);
}
.rebalance-history-asset-head,
.rebalance-history-asset-foot {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  align-items: center;
}
.rebalance-history-asset-head b {
  display: block;
  font-family: var(--font-mono);
  font-size: 14px;
}
.rebalance-history-asset-head span,
.rebalance-history-asset-foot span {
  color: var(--muted);
  font-size: 11px;
}
.rebalance-history-asset-head em {
  flex-shrink: 0;
  border-radius: 999px;
  padding: 4px 8px;
  font-size: 11px;
  font-style: normal;
  font-weight: 800;
}
.rebalance-history-asset-head em.buy { background: var(--up-soft); color: var(--up); }
.rebalance-history-asset-head em.sell { background: var(--down-soft); color: var(--down); }
.rebalance-history-asset-head em.hold { background: var(--surface-2); color: var(--muted); }
.rebalance-history-bars {
  display: grid;
  gap: 8px;
  margin: 12px 0;
}
.rebalance-history-bars span {
  display: block;
  margin-bottom: 3px;
  color: var(--muted);
  font-size: 11px;
}
.rebalance-history-bars div div {
  height: 8px;
  border-radius: 999px;
  overflow: hidden;
  background: var(--line);
}
.rebalance-history-bars i {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: var(--accent);
}
.rebalance-history-bars i.target {
  background: var(--up);
}
.rebalance-history-empty {
  display: grid;
  gap: 10px;
  place-items: center;
  padding: 44px 20px;
  text-align: center;
}
.rebalance-history-empty-icon {
  display: grid;
  place-items: center;
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: var(--accent-soft);
  color: var(--accent-ink);
  font-size: 24px;
  font-weight: 900;
}
.rebalance-history-empty span {
  color: var(--muted);
  font-size: 13px;
}
.rebalance-empty {
  padding: 18px 12px;
  text-align: center;
  color: var(--muted);
  font-size: 12px;
  border: 1px dashed var(--line);
  border-radius: 14px;
  background: var(--surface-2);
}
@media (max-width: 1080px) {
  .rebalance-grid { grid-template-columns: 1fr; }
  .rebalance-history-page { grid-template-columns: 1fr; }
  .rebalance-year-rail {
    position: static;
    flex-direction: row;
    overflow-x: auto;
    padding-bottom: 4px;
  }
  .rebalance-year-rail button { min-width: 150px; }
  .rebalance-history-grid { grid-template-columns: 1fr; }
}
@media (max-width: 720px) {
  .rebalance-toolbar { grid-template-columns: 1fr; }
  .asset-target-head { flex-direction: column; }
  .asset-target-summary { text-align: left; }
  .annual-plan-save { grid-template-columns: 1fr; }
  .annual-plan-actions { grid-template-columns: 86px minmax(0, 1fr); }
  .asset-target-row {
    grid-template-columns: 1fr 94px;
    gap: 10px;
  }
  .asset-target-gap {
    grid-column: 1 / -1;
    text-align: left;
  }
  .rebalance-history-kpis { grid-template-columns: 1fr; }
  .rebalance-history-metrics { grid-template-columns: 1fr; }
  .rebalance-history-asset-list { grid-template-columns: 1fr; }
}

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
                  {fmtQty(h.qty)}
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

Object.assign(window, { DCAView, EarnView, HistoryView, PortfolioView, BenchView, RebalanceView, RebalanceHistoryView, PageShell });
