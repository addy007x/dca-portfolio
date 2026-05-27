// Main Dashboard view

function Dashboard({ ccy, scenario, onOpenAsset, accent }) {
  const M = window.MOCK;

  // Local state for mutable lists (delete actions)
  const [holdings, setHoldings] = React.useState(() => M.makeScenario(scenario));
  const [dcaList, setDcaList] = React.useState(() => M.DCA_SCHEDULES);
  const [earnList, setEarnList] = React.useState(() => M.EARN_POSITIONS);
  const [alerts, setAlerts] = React.useState(() => M.REBALANCE_ALERTS);
  const [confirm, setConfirm] = React.useState(null);

  // Reset whenever scenario changes
  React.useEffect(() => {
    setHoldings(M.makeScenario(scenario));
    setDcaList(M.DCA_SCHEDULES);
    setEarnList(M.EARN_POSITIONS);
    setAlerts(M.REBALANCE_ALERTS);
  }, [scenario]);

  const askConfirm = (cfg) => setConfirm(cfg);
  const closeConfirm = () => setConfirm(null);
  const doConfirm = () => {
    if (confirm?.onConfirm) confirm.onConfirm();
    setConfirm(null);
  };

  // Aggregate metrics, all converted to THB then displayed in chosen ccy
  const totals = React.useMemo(() => {
    let mvTHB = 0, costTHB = 0, dayChgTHB = 0;
    const byClass = { us: 0, th: 0, crypto: 0, gold: 0 };
    holdings.forEach(h => {
      const mv = h.qty * h.price;
      const cost = h.qty * h.costAvg;
      const dayChg = mv * (h.chg1d / 100);
      const mvT = h.ccy === "THB" ? mv : mv * M.FX;
      const costT = h.ccy === "THB" ? cost : cost * M.FX;
      const dayT = h.ccy === "THB" ? dayChg : dayChg * M.FX;
      mvTHB += mvT;
      costTHB += costT;
      dayChgTHB += dayT;
      byClass[h.classKey] += mvT;
    });
    return { mvTHB, costTHB, dayChgTHB, byClass };
  }, [holdings]);

  const unrealTHB = totals.mvTHB - totals.costTHB;
  const unrealPct = (unrealTHB / totals.costTHB) * 100;
  const dayPct = (totals.dayChgTHB / (totals.mvTHB - totals.dayChgTHB)) * 100;

  const cv = (vTHB) => ccy === "THB" ? vTHB : vTHB / M.FX;
  const ccySym = ccy === "THB" ? "฿" : "$";

  const [range, setRange] = React.useState("6M");
  const histTHB = M.PORTFOLIO_HISTORY[range];
  const histDisp = histTHB.map(v => cv(v));

  const allocSegs = [
    { key:"us", label:"หุ้น US", color:"var(--c-us)", value: totals.byClass.us },
    { key:"th", label:"หุ้นไทย", color:"var(--c-th)", value: totals.byClass.th },
    { key:"crypto", label:"คริปโต", color:"var(--c-crypto)", value: totals.byClass.crypto },
    { key:"gold", label:"ทองคำ", color:"var(--c-gold)", value: totals.byClass.gold },
  ];

  return (
    <>
      {/* ===== Hero ===== */}
      <section className="hero">
        <div className="card hero-main tint">
          <div className="hero-eye">
            <Ico name="eye" size={14}/> มูลค่าพอร์ตรวม (ทุกสินทรัพย์)
          </div>
          <div className="hero-total num">
            <span>{ccySym}{ccy === "THB" ? Math.round(totals.mvTHB).toLocaleString() : (totals.mvTHB / M.FX).toLocaleString("en-US", {minimumFractionDigits:2, maximumFractionDigits:2})}</span>
            <span className="ccy">{ccy}</span>
          </div>
          <div className="hero-sub">
            ≈ {ccy === "THB"
              ? "$" + (totals.mvTHB / M.FX).toLocaleString("en-US", {minimumFractionDigits:2, maximumFractionDigits:2}) + " USD"
              : "฿" + Math.round(totals.mvTHB).toLocaleString() + " THB"}
            {"  ·  อัตราแลกเปลี่ยน 1 USD = "}<span className="num">{M.FX.toFixed(2)}</span>{" บาท"}
          </div>

          <div className="hero-pills">
            <div className={`hero-pill ${dayPct >= 0 ? "up" : "down"}`}>
              <Ico name={dayPct >= 0 ? "arrow-up" : "arrow-dn"} size={14}/>
              <span>วันนี้</span>
              <span className="num">{fmtPct(dayPct)}</span>
              <span className="num" style={{opacity:0.8}}>
                ({dayPct >= 0 ? "+" : "−"}{ccySym}{Math.round(Math.abs(cv(totals.dayChgTHB))).toLocaleString()})
              </span>
            </div>
            <div className={`hero-pill ${unrealPct >= 0 ? "up" : "down"}`}>
              <Ico name="spark" size={13}/>
              <span>กำไรสะสม</span>
              <span className="num">{fmtPct(unrealPct)}</span>
              <span className="num" style={{opacity:0.8}}>
                ({unrealPct >= 0 ? "+" : "−"}{ccySym}{Math.round(Math.abs(cv(unrealTHB))).toLocaleString()})
              </span>
            </div>
            <div className="hero-pill">
              <span className="dot"></span>
              <span>เชื่อมต่อ Real-time</span>
              <span style={{color:"var(--muted)", fontSize:12}}>· 4 แหล่งข้อมูล</span>
            </div>
          </div>
        </div>

        <div className="kpi-grid">
          <div className="kpi">
            <div className="label">ต้นทุนรวม</div>
            <div className="value">{ccySym}{Math.round(cv(totals.costTHB)).toLocaleString()}</div>
            <div className="delta" style={{color:"var(--muted)"}}>ลงทุนสะสมตั้งแต่เริ่ม</div>
          </div>
          <div className="kpi">
            <div className="label">กำไร/ขาดทุนยังไม่รับรู้</div>
            <div className="value" style={{color: unrealPct >= 0 ? "var(--up)" : "var(--down)"}}>
              {unrealPct >= 0 ? "+" : "−"}{ccySym}{Math.round(Math.abs(cv(unrealTHB))).toLocaleString()}
            </div>
            <div className={`delta ${unrealPct >= 0 ? "up" : "down"}`}>{fmtPct(unrealPct)} จากต้นทุน</div>
          </div>
          <div className="kpi">
            <div className="label">รับ DCA อัตโนมัติ</div>
            <div className="value">5 รายการ</div>
            <div className="delta" style={{color:"var(--accent-ink)"}}>ครั้งถัดไป: VOO ใน 3 วัน</div>
          </div>
          <div className="kpi">
            <div className="label">เงินสดพร้อมลงทุน</div>
            <div className="value">{ccySym}{ccy === "THB" ? "182,400" : "5,094"}</div>
            <div className="delta" style={{color:"var(--muted)"}}>กระเป๋า THB + USD รวม</div>
          </div>
        </div>
      </section>

      {/* ===== Chart + Allocation ===== */}
      <section className="row-2">
        <div className="card">
          <div className="card-head">
            <div>
              <div className="card-title">มูลค่าพอร์ตย้อนหลัง</div>
              <div className="card-sub">มูลค่าตลาดในสกุล {ccy} ตามช่วงเวลา</div>
            </div>
            <div className="card-act">
              <div className="range-tabs">
                {["1M","3M","6M","1Y","ALL"].map(r => (
                  <button key={r} className={range === r ? "is-on" : ""}
                          onClick={() => setRange(r)}>{r}</button>
                ))}
              </div>
            </div>
          </div>
          <LineChart data={histDisp} height={260} accent={accent} animateKey={range + ccy}/>
        </div>

        <div className="card">
          <div className="card-head">
            <div>
              <div className="card-title">การจัดสรรสินทรัพย์</div>
              <div className="card-sub">แยกตามประเภท</div>
            </div>
            <div className="card-act">
              <button className="btn sm ghost"><Ico name="edit" size={14}/> ตั้งเป้า</button>
            </div>
          </div>

          <div className="alloc">
            <div style={{display:"flex", alignItems:"center", gap:18, padding:"4px 0 8px"}}>
              <Donut size={130} thickness={20} segments={allocSegs}/>
              <div style={{flex:1, minWidth:0}}>
                <div style={{fontSize:12, color:"var(--muted)"}}>4 ประเภทสินทรัพย์</div>
                <div className="num" style={{fontSize:26, fontWeight:700, letterSpacing:"-0.015em", marginTop:2}}>
                  {ccySym}{Math.round(cv(totals.mvTHB)).toLocaleString()}
                </div>
                <div style={{fontSize:12, color:"var(--muted)"}}>มูลค่ารวม</div>
              </div>
            </div>

            <div className="alloc-rows">
              {allocSegs.map(s => {
                const pct = (s.value / totals.mvTHB) * 100;
                return (
                  <div className="alloc-row" key={s.key}>
                    <span className="alloc-dot" style={{background:s.color}}></span>
                    <span style={{minWidth:60}}>{s.label}</span>
                    <div className="alloc-bar">
                      <div className="alloc-fill" style={{width: pct + "%", background: s.color}}></div>
                    </div>
                    <span className="alloc-pct">{pct.toFixed(1)}%</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* ===== Holdings ===== */}
      <section className="card holdings">
        <div className="card-head" style={{padding:"18px 22px 12px", marginBottom:0}}>
          <div>
            <div className="card-title">สินทรัพย์ที่ถืออยู่</div>
            <div className="card-sub">{holdings.length} รายการ · คลิกเพื่อดูรายละเอียด</div>
          </div>
          <div className="card-act">
            <button className="btn sm ghost">ทั้งหมด</button>
            <button className="btn sm ghost">หุ้น</button>
            <button className="btn sm ghost">คริปโต</button>
            <button className="btn sm"><Ico name="plus" size={13}/> เพิ่ม</button>
          </div>
        </div>

        <div className="holdings-head">
          <div>สินทรัพย์</div>
          <div>ราคา / ต้นทุน</div>
          <div>จำนวน</div>
          <div>มูลค่า ({ccy})</div>
          <div>กำไร/ขาดทุน</div>
          <div style={{textAlign:"right"}}>7 วัน</div>
          <div></div>
        </div>

        {holdings.map(h => {
          const mvNative = h.qty * h.price;
          const costNative = h.qty * h.costAvg;
          const plNative = mvNative - costNative;
          const plPct = (plNative / costNative) * 100;
          const mvTHB = h.ccy === "THB" ? mvNative : mvNative * M.FX;
          const plTHB = h.ccy === "THB" ? plNative : plNative * M.FX;
          const mvDisp = cv(mvTHB);
          const plDisp = cv(plTHB);
          const classLabel = { us:"US", th:"TH", crypto:"CRYPTO", gold:"GOLD" }[h.classKey];

          return (
            <div className="holdings-row" key={h.ticker} onClick={() => onOpenAsset(h)}>
              <div className="asset-name">
                <div className={`asset-logo ${h.classKey}`}>
                  {h.classKey === "gold" ? "Au" : h.ticker.slice(0,2)}
                </div>
                <div className="asset-meta">
                  <div className="asset-ticker">
                    {h.ticker}
                    <span className="asset-class-tag">{classLabel}</span>
                  </div>
                  <div className="asset-co">{h.name}</div>
                </div>
              </div>
              <div>
                <div className="num" style={{fontWeight:600}}>
                  {h.ccy === "THB" ? "฿" : "$"}{fmtNum(h.price, h.price < 10 ? 2 : 2)}
                </div>
                <div className="num" style={{fontSize:11, color:"var(--muted)"}}>
                  ต้นทุน {h.ccy === "THB" ? "฿" : "$"}{fmtNum(h.costAvg, 2)}
                </div>
              </div>
              <div className="num" style={{fontSize:13}}>
                {h.qty.toLocaleString("en-US", { maximumFractionDigits: 4 })}
                <div style={{fontSize:11, color:"var(--muted)"}}>{h.ticker === "BTC" ? "BTC" : h.ticker === "ETH" ? "ETH" : h.ticker === "SOL" ? "SOL" : h.ticker === "XAUT" ? "oz" : "หุ้น"}</div>
              </div>
              <div className="num" style={{fontWeight:700}}>
                {ccySym}{ccy === "THB" ? Math.round(mvDisp).toLocaleString() : fmtNum(mvDisp, 2)}
              </div>
              <div>
                <div className="num" style={{fontWeight:700, color: plDisp >= 0 ? "var(--up)" : "var(--down)"}}>
                  {plDisp >= 0 ? "+" : "−"}{ccySym}{ccy === "THB" ? Math.round(Math.abs(plDisp)).toLocaleString() : fmtNum(Math.abs(plDisp), 2)}
                </div>
                <div className="num" style={{fontSize:11, color: plDisp >= 0 ? "var(--up)" : "var(--down)"}}>
                  {fmtPct(plPct)}
                </div>
              </div>
              <div style={{textAlign:"right"}}>
                <Sparkline data={h.spark}/>
              </div>
              <div onClick={(e) => e.stopPropagation()}>
                <Menu items={[
                  { label: "ดูรายละเอียด", icon: "chev-r", onClick: () => onOpenAsset(h) },
                  { label: "ตั้ง DCA", icon: "dca", onClick: () => {} },
                  { label: "ขายทั้งหมด", icon: "swap", onClick: () => {} },
                  { sep: true },
                  { label: "ลบสินทรัพย์", icon: "trash", danger: true,
                    onClick: () => askConfirm({
                      title: `ลบ ${h.ticker} ออกจากพอร์ต?`,
                      body: `${h.name} จำนวน ${h.qty.toLocaleString("en-US", {maximumFractionDigits:4})} ${h.classKey === "gold" ? "oz" : "หน่วย"} จะถูกลบออก รวมถึงประวัติธุรกรรมที่เกี่ยวข้อง การดำเนินการนี้ไม่สามารถยกเลิกได้`,
                      requireType: h.ticker,
                      confirmLabel: "ลบสินทรัพย์",
                      onConfirm: () => setHoldings(prev => prev.filter(x => x.ticker !== h.ticker))
                    })
                  },
                ]}/>
              </div>
            </div>
          );
        })}
      </section>

      {/* ===== DCA + P&L bars ===== */}
      <section className="row-2">
        <div className="card">
          <div className="card-head">
            <div>
              <div className="card-title">ตารางลงทุนอัตโนมัติ (DCA)</div>
              <div className="card-sub">{dcaList.length} รายการกำลังทำงาน · ระบบจะซื้อให้อัตโนมัติ</div>
            </div>
            <div className="card-act">
              <button className="btn sm accent"><Ico name="plus" size={13}/> ตั้ง DCA ใหม่</button>
            </div>
          </div>
          <div className="dca-list">
            {dcaList.length === 0 && (
              <div style={{padding:"24px 8px", textAlign:"center", color:"var(--muted)", fontSize:13}}>
                ยังไม่มีตาราง DCA — ลองตั้งซื้ออัตโนมัติเพื่อทยอยลงทุน
              </div>
            )}
            {dcaList.map(d => (
              <div className="dca-item" key={d.ticker}>
                <div className={`asset-logo ${d.classKey}`}>
                  {d.ticker === "XAUT" ? "Au" : d.ticker.slice(0,2)}
                </div>
                <div>
                  <div className="ticker">{d.ticker}</div>
                  <div className="schedule">
                    ทุก{d.freq} · เริ่ม {d.since} · ทำไปแล้ว <b className="num">{d.executed}</b> ครั้ง
                  </div>
                  <div className="next-in">⏱ ครั้งถัดไป {d.nextIn}</div>
                </div>
                <div>
                  <div className="amount">
                    {d.ccy === "THB" ? "฿" : "$"}{fmtNum(d.amount, 0)}
                  </div>
                  <div style={{fontSize:11, color:"var(--muted)", textAlign:"right", marginTop:2}}>
                    /{d.freq}
                  </div>
                </div>
                <Menu items={[
                  { label: "แก้ไขจำนวนเงิน", icon: "edit", onClick: () => {} },
                  { label: "หยุดชั่วคราว", icon: "pause", onClick: () => {} },
                  { sep: true },
                  { label: "ลบตาราง DCA", icon: "trash", danger: true,
                    onClick: () => askConfirm({
                      title: `หยุดและลบ DCA สำหรับ ${d.ticker}?`,
                      body: `ตารางลงทุนอัตโนมัติ ${d.ccy === "THB" ? "฿" : "$"}${fmtNum(d.amount, 0)} ทุก${d.freq} จะถูกยกเลิก ระบบจะไม่ซื้อ ${d.ticker} ในรอบถัดไปอีก สินทรัพย์ที่เคยซื้อไปแล้วจะยังคงอยู่ในพอร์ต`,
                      confirmLabel: "ลบ DCA",
                      onConfirm: () => setDcaList(prev => prev.filter(x => x.ticker !== d.ticker))
                    })
                  },
                ]}/>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="card-head">
            <div>
              <div className="card-title">กำไร/ขาดทุนรายตัว</div>
              <div className="card-sub">มูลค่าใน {ccy} (ยังไม่รับรู้)</div>
            </div>
            <div className="card-act">
              <span className="tag">เรียงตามมูลค่า P&L</span>
            </div>
          </div>
          <PLBars holdings={holdings} ccy={ccy} FX={M.FX}/>
        </div>
      </section>

      {/* ===== Earn + Bench + Rebalance ===== */}
      <section className="row-2">
        <EarnPanel ccy={ccy} positions={earnList} setPositions={setEarnList} askConfirm={askConfirm}/>
        <div style={{display:"flex", flexDirection:"column", gap:20}}>
          <BenchmarkCard/>
          <RebalanceCard alerts={alerts} setAlerts={setAlerts}/>
        </div>
      </section>

      <ConfirmDialog open={!!confirm}
                     title={confirm?.title}
                     body={confirm?.body}
                     requireType={confirm?.requireType}
                     confirmLabel={confirm?.confirmLabel}
                     onCancel={closeConfirm}
                     onConfirm={doConfirm}/>
    </>
  );
}

function PLBars({ holdings, ccy, FX }) {
  const rows = holdings.map(h => {
    const plNative = h.qty * (h.price - h.costAvg);
    const plTHB = h.ccy === "THB" ? plNative : plNative * FX;
    const plDisp = ccy === "THB" ? plTHB : plTHB / FX;
    return { ticker: h.ticker, plDisp, classKey: h.classKey };
  }).sort((a,b) => Math.abs(b.plDisp) - Math.abs(a.plDisp));

  const maxAbs = Math.max(...rows.map(r => Math.abs(r.plDisp)));

  return (
    <div className="pl-bars">
      {rows.map(r => {
        const w = Math.abs(r.plDisp) / maxAbs * 48; // half-width %
        const up = r.plDisp >= 0;
        const ccySym = ccy === "THB" ? "฿" : "$";
        return (
          <div className="pl-row" key={r.ticker}>
            <div className="ticker">{r.ticker}</div>
            <div className="pl-track">
              <div className={`pl-fill ${up ? "up" : "down"}`}
                   style={{
                     left: up ? "50%" : `${50 - w}%`,
                     width: `${w}%`
                   }}></div>
            </div>
            <div className={`pl-value ${up ? "up" : "down"}`}>
              {up ? "+" : "−"}{ccySym}{Math.round(Math.abs(r.plDisp)).toLocaleString()}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function EarnPanel({ ccy, positions, setPositions, askConfirm }) {
  const M = window.MOCK;
  const [apy, setApy] = React.useState(15);

  // total earn balance in USD then convert
  const totalUSD = positions.reduce((s, p) => {
    if (p.sym === "USDT" || p.sym === "USDC") return s + p.qty;
    if (p.sym === "BTC") return s + p.qty * 67200;
    if (p.sym === "ETH") return s + p.qty * 3480;
    if (p.sym === "SOL") return s + p.qty * 145.2;
    return s;
  }, 0);
  const stakedDisp = ccy === "THB" ? totalUSD * M.FX : totalUSD;
  const earnedTodayUSD = positions.reduce((s, p) => s + (p.earnedToday || 0), 0);
  const earnedTodayDisp = ccy === "THB" ? earnedTodayUSD * M.FX : earnedTodayUSD;

  // Projected annual yield based on slider APY applied to USDT only
  const usdtPos = positions.find(p => p.sym === "USDT");
  const usdtBal = usdtPos ? usdtPos.qty : 0;
  const projAnnualUSD = usdtBal * (apy / 100);
  const projDailyUSD = projAnnualUSD / 365;
  const projDisp = ccy === "THB" ? projAnnualUSD * M.FX : projAnnualUSD;
  const projDailyDisp = ccy === "THB" ? projDailyUSD * M.FX : projDailyUSD;
  const ccySym = ccy === "THB" ? "฿" : "$";

  return (
    <div className="card earn">
      <div className="card-head">
        <div>
          <div className="card-title">💰 Earn — สร้างผลตอบแทนจากสินทรัพย์</div>
          <div className="card-sub">รวมยอดที่กำลังสร้างดอกเบี้ย · ดอกเบี้ยทบต้นรายวัน</div>
        </div>
        <div className="card-act">
          <button className="btn sm">ฝากเพิ่ม</button>
          <button className="btn sm ghost">ถอน</button>
        </div>
      </div>

      <div className="earn-grid">
        <div>
          <div style={{fontSize:12, color:"var(--muted)"}}>ยอดรวมที่กำลัง Earn</div>
          <div className="earn-amt">
            {ccySym}{ccy === "THB" ? Math.round(stakedDisp).toLocaleString() : fmtNum(stakedDisp, 2)}
            <span className="ccy">{ccy}</span>
          </div>
          <div style={{fontSize:12, color:"var(--up)", marginTop:6, fontFamily:"var(--font-num)", fontWeight:600}}>
            +{ccySym}{ccy === "THB" ? Math.round(earnedTodayDisp).toLocaleString() : fmtNum(earnedTodayDisp, 2)} ดอกเบี้ยวันนี้
          </div>

          <div className="earn-rows">
            {positions.map(p => (
              <div className="earn-row" key={p.sym}>
                <div>
                  <span className="sym">{p.sym}</span>
                  <span style={{color:"var(--muted)", fontSize:11, marginLeft:8}}>
                    {p.kind === "ล็อก 30 วัน" && <Ico name="lock" size={10}/>} {p.kind}
                  </span>
                </div>
                <div className="num" style={{fontWeight:600, fontSize:12}}>
                  {p.qty.toLocaleString("en-US", { maximumFractionDigits: 4 })}
                </div>
                <div className="apy">{p.apy.toFixed(2)}%</div>
                <Menu items={[
                  { label: "ฝากเพิ่ม", icon: "plus", onClick: () => {} },
                  { label: "ถอนทั้งหมด", icon: "swap", onClick: () => {} },
                  { sep: true },
                  { label: "ปิดบัญชี Earn", icon: "trash", danger: true,
                    onClick: () => askConfirm({
                      title: `ปิดบัญชี Earn ${p.sym}?`,
                      body: `${p.qty.toLocaleString("en-US", {maximumFractionDigits:4})} ${p.sym} (${p.kind}) จะถูกถอนกลับเข้ากระเป๋าหลัก และหยุดรับดอกเบี้ย ${p.apy.toFixed(2)}% APY ทันที${p.kind === "ล็อก 30 วัน" ? " — อาจมีค่าธรรมเนียมการถอนก่อนกำหนด" : ""}`,
                      confirmLabel: "ปิดบัญชี",
                      onConfirm: () => setPositions(prev => prev.filter(x => x.sym !== p.sym))
                    })
                  },
                ]}/>
              </div>
            ))}
          </div>
        </div>

        <div className="earn-slider">
          <div style={{fontSize:12, color:"var(--muted)"}}>เป้าหมาย APY ที่ต้องการ</div>
          <div className="target num">
            {apy.toFixed(1)}<sup>%</sup>
          </div>
          <div className="desc">
            ปรับเพื่อจำลองว่าหากได้ผลตอบแทนเท่านี้ จะได้รับเท่าไหร่
          </div>

          <input className="apy-slider" type="range" min="1" max="50" step="0.5"
                 value={apy} onChange={e => setApy(parseFloat(e.target.value))}/>
          <div className="apy-ticks">
            <span>1%</span><span>15%</span><span>30%</span><span>50%</span>
          </div>

          <div className="apy-projection">
            <div>
              <div style={{fontSize:11, color:"var(--muted)"}}>ดอกเบี้ยที่คาดว่าจะได้รับ</div>
              <div className="v">
                {ccySym}{ccy === "THB" ? Math.round(projDisp).toLocaleString() : fmtNum(projDisp, 2)} <span style={{fontSize:11, fontWeight:500, color:"var(--muted)"}}>/ปี</span>
              </div>
            </div>
            <div style={{textAlign:"right"}}>
              <div style={{fontSize:11, color:"var(--muted)"}}>เฉลี่ย/วัน</div>
              <div className="v" style={{fontSize:14}}>
                {ccySym}{ccy === "THB" ? Math.round(projDailyDisp).toLocaleString() : fmtNum(projDailyDisp, 2)}
              </div>
            </div>
          </div>

          <button className="btn primary" style={{width:"100%", justifyContent:"center", marginTop:10}}>
            <Ico name="plus" size={14}/> ฝาก USDT เพิ่มเพื่อรับ {apy.toFixed(1)}% APY
          </button>
        </div>
      </div>
    </div>
  );
}

function BenchmarkCard() {
  const M = window.MOCK;
  const max = Math.max(...M.BENCHMARKS.map(b => Math.abs(b.ytd)));
  return (
    <div className="card">
      <div className="card-head">
        <div>
          <div className="card-title">เปรียบเทียบผลตอบแทน YTD</div>
          <div className="card-sub">พอร์ตของคุณ vs ดัชนีอ้างอิง</div>
        </div>
      </div>
      <div className="bench">
        {M.BENCHMARKS.map(b => {
          const w = (b.ytd / max) * 100;
          return (
            <div className="bench-row" key={b.ticker}>
              <div className="ticker" style={{fontWeight: b.isYou ? 700 : 600, color: b.isYou ? "var(--accent-ink)" : undefined}}>
                {b.ticker}
              </div>
              <div className="bench-track">
                <div className={`bench-fill ${b.isYou ? "you" : ""}`}
                     style={{width: w + "%"}}></div>
              </div>
              <div className="pct" style={{color: b.isYou ? "var(--accent-ink)" : (b.ytd >= 0 ? "var(--up)" : "var(--down)")}}>
                {fmtPct(b.ytd)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function RebalanceCard({ alerts, setAlerts }) {
  return (
    <div className="card">
      <div className="card-head">
        <div>
          <div className="card-title">
            <Ico name="alert" size={14}/> แจ้งเตือนปรับสมดุล
          </div>
          <div className="card-sub">
            {alerts.length > 0 ? "สัดส่วนเบี่ยงจากเป้า · แนะนำให้ดำเนินการ" : "พอร์ตอยู่ในสมดุลที่ตั้งไว้ 🎯"}
          </div>
        </div>
      </div>
      <div className="reb-list">
        {alerts.length === 0 && (
          <div style={{padding:"12px 8px", textAlign:"center", color:"var(--muted)", fontSize:12}}>
            ไม่มีการแจ้งเตือนในขณะนี้
          </div>
        )}
        {alerts.map((r, i) => (
          <div className="reb-row" key={r.ticker}>
            <div>
              <div style={{display:"flex", alignItems:"center", gap:8}}>
                <span style={{fontWeight:700, fontFamily:"var(--font-mono)", fontSize:13}}>{r.ticker}</span>
                <span className="num" style={{fontSize:12, color:"var(--muted)"}}>{r.delta}</span>
              </div>
              <div className="reason">{r.reason}</div>
            </div>
            <span className={`pill ${r.action}`}>{r.action === "buy" ? "ซื้อเพิ่ม" : "ขายบางส่วน"}</span>
            <button className="row-action danger"
                    title="ปิดการแจ้งเตือน"
                    onClick={() => setAlerts(prev => prev.filter(a => a.ticker !== r.ticker))}>
              <Ico name="x" size={14}/>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

window.Dashboard = Dashboard;
