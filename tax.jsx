// SiamFolio — Tax Report View (ภาษี)

// ─── Thai PIT brackets 2024 ───────────────────────────────────────────────
const PIT_BRACKETS = [
  { from: 0,       to: 150000,   rate: 0    },
  { from: 150000,  to: 300000,   rate: 0.05 },
  { from: 300000,  to: 500000,   rate: 0.10 },
  { from: 500000,  to: 750000,   rate: 0.15 },
  { from: 750000,  to: 1000000,  rate: 0.20 },
  { from: 1000000, to: 2000000,  rate: 0.25 },
  { from: 2000000, to: 5000000,  rate: 0.30 },
  { from: 5000000, to: Infinity, rate: 0.35 },
];
function calcPIT(income) {
  return PIT_BRACKETS.reduce((tax, b) => {
    const slice = Math.max(0, Math.min(income, b.to === Infinity ? income : b.to) - b.from);
    return tax + slice * b.rate;
  }, 0);
}

const TAX_GUIDES = [
  { key:"th",     icon:"🇹🇭", label:"หุ้นไทย (SET)",       exempt:true,  desc:"ยกเว้น CGT — ไม่เสียภาษีกำไรจากทุนสำหรับหุ้นในตลาดหลักทรัพย์ไทย" },
  { key:"us",     icon:"🇺🇸", label:"หุ้น US / ETF",       exempt:false, desc:"เงินได้ ม.40(4) — ภาษีอัตราก้าวหน้า หรือหัก ณ ที่จ่าย 15%" },
  { key:"crypto", icon:"₿",   label:"คริปโทเคอร์เรนซี",   exempt:false, desc:"เงินได้ ม.40(4) — ต้องแจ้งในแบบ ภ.ง.ด.90/91 ทุกปีภาษี" },
  { key:"gold",   icon:"🥇",  label:"ทองคำ",               exempt:false, desc:"เงินได้ ม.40(8) — กำไรจากการขายทองต้องนำคำนวณภาษี" },
];

// ─────── Tax View ───────────────────────────────────────────────────────────
function TaxView({ ccy }) {
  const store    = window.useStore();
  const FX       = store.fx || 35.8;
  const thisYear = new Date().getFullYear();
  const [year, setYear] = React.useState(thisYear);
  const ccySym = ccy === "THB" ? "฿" : "$";
  const cv = (usd) => ccy === "THB" ? usd * FX : usd;

  const transactions = store.transactions || [];
  const holdings     = store.holdings     || [];

  // Available years from transaction history
  const years = React.useMemo(() => {
    const ys = new Set(transactions.map(t => t.date?.slice(0,4)).filter(Boolean));
    ys.add(String(thisYear));
    return [...ys].sort().reverse();
  }, [transactions]);

  // Quick lookup for cost basis
  const costMap = React.useMemo(() => {
    const m = {};
    holdings.forEach(h => { m[h.ticker] = h; });
    return m;
  }, [holdings]);

  // Sell transactions for selected year
  const yearSells = transactions.filter(t =>
    t.kind === "sell" && t.date?.startsWith(String(year))
  );

  // Enrich with tax info
  const taxEvents = yearSells.map(t => {
    const h         = costMap[t.ticker];
    const qtyAbs    = Math.abs(t.qty || 0);
    const costBasisUSD = h
      ? (h.ccy === "THB" ? h.costAvg * qtyAbs / FX : h.costAvg * qtyAbs)
      : 0;
    const proceedsUSD = Math.abs(t.valUSD || 0);
    const gainUSD     = proceedsUSD - costBasisUSD;
    const classKey    = h?.classKey || "us";
    return { ...t, h, costBasisUSD, proceedsUSD, gainUSD,
             gainTHB: gainUSD * FX, classKey, isTaxable: classKey !== "th" };
  });

  // Aggregates
  const totalGainUSD   = taxEvents.filter(e => e.gainUSD > 0).reduce((s,e) => s + e.gainUSD, 0);
  const totalLossUSD   = taxEvents.filter(e => e.gainUSD < 0).reduce((s,e) => s + e.gainUSD, 0);
  const netGainUSD     = taxEvents.reduce((s,e) => s + e.gainUSD, 0);
  const taxableGainTHB = taxEvents.filter(e => e.isTaxable && e.gainUSD > 0)
                                   .reduce((s,e) => s + e.gainTHB, 0);
  const estPIT  = calcPIT(taxableGainTHB);
  const estFlat = taxableGainTHB * 0.15;

  // Unrealized P&L per holding
  const unrealized = holdings.map(h => {
    const plNative = h.qty * (h.price - h.costAvg);
    const plTHB    = h.ccy === "THB" ? plNative : plNative * FX;
    return { ...h, plTHB, plUSD: plTHB / FX };
  }).sort((a,b) => Math.abs(b.plTHB) - Math.abs(a.plTHB));
  const totalUnrealTHB = unrealized.reduce((s,r) => s + r.plTHB, 0);

  // ── CSV helpers ──
  const q  = (v) => `"${String(v == null ? "" : v).replace(/"/g,'""')}"`;
  const row = (...cells) => cells.map(q).join(",");

  // Export full tax report as CSV (3 sections)
  const exportCSV = () => {
    const thaiYear = year + 543;
    const lines = [];

    // ── Section 1: Header ──
    lines.push(row(`รายงานภาษีการลงทุน SiamFolio — ปีภาษี ${year} (พ.ศ. ${thaiYear})`));
    lines.push(row(`สร้างเมื่อ: ${new Date().toLocaleDateString("th-TH",{dateStyle:"full"})}`, `อัตราแลกเปลี่ยน: 1 USD = ${FX} THB`));
    lines.push("");

    // ── Section 2: Realized gains (ธุรกรรมขาย) ──
    lines.push(row("=== ส่วนที่ 1: รายการขาย (Realized Gains/Losses) ==="));
    lines.push(row("วันที่","Ticker","ประเภทสินทรัพย์","จำนวนที่ขาย",
      "ต้นทุนรวม (USD)","ต้นทุนรวม (THB)",
      "ราคาขายรวม (USD)","ราคาขายรวม (THB)",
      "กำไร/ขาดทุน (USD)","กำไร/ขาดทุน (THB)","% กำไร/ขาดทุน",
      "ต้องเสียภาษี","หมายเหตุ"));
    taxEvents.forEach(e => {
      const pct = e.costBasisUSD > 0 ? ((e.gainUSD/e.costBasisUSD)*100).toFixed(2)+"%" : "—";
      lines.push(row(
        e.date, e.ticker, e.classKey?.toUpperCase(),
        Math.abs(e.qty||0).toFixed(6),
        e.costBasisUSD.toFixed(2), (e.costBasisUSD*FX).toFixed(2),
        e.proceedsUSD.toFixed(2),  (e.proceedsUSD*FX).toFixed(2),
        e.gainUSD.toFixed(2),       e.gainTHB.toFixed(2), pct,
        e.isTaxable ? "ใช่" : "ไม่ (SET ยกเว้น)",
        e.note || "",
      ));
    });
    // Realized summary row
    lines.push(row(
      "รวม", "", "", "",
      taxEvents.reduce((s,e)=>s+e.costBasisUSD,0).toFixed(2),
      (taxEvents.reduce((s,e)=>s+e.costBasisUSD,0)*FX).toFixed(2),
      taxEvents.reduce((s,e)=>s+e.proceedsUSD,0).toFixed(2),
      (taxEvents.reduce((s,e)=>s+e.proceedsUSD,0)*FX).toFixed(2),
      netGainUSD.toFixed(2), (netGainUSD*FX).toFixed(2), "", "", "",
    ));
    lines.push("");

    // ── Section 3: Unrealized positions ──
    lines.push(row("=== ส่วนที่ 2: กำไร/ขาดทุนยังไม่รับรู้ (Unrealized) ==="));
    lines.push(row("Ticker","ชื่อ","ประเภท","จำนวนที่ถือ",
      "ต้นทุนเฉลี่ย","ราคาตลาดปัจจุบัน",
      "มูลค่าตลาด (USD)","มูลค่าตลาด (THB)",
      "กำไร/ขาดทุน (USD)","กำไร/ขาดทุน (THB)","% กำไร/ขาดทุน",
      "ต้องเสียภาษีเมื่อขาย"));
    unrealized.forEach(h => {
      const mvUSD  = h.qty * h.price;
      const mvTHB  = h.ccy==="THB" ? mvUSD : mvUSD*FX;
      const pct    = h.costAvg > 0 ? (((h.price-h.costAvg)/h.costAvg)*100).toFixed(2)+"%" : "—";
      lines.push(row(
        h.ticker, h.name, h.classKey?.toUpperCase(),
        h.qty.toFixed(6),
        `${h.ccy==="THB"?"฿":"$"}${h.costAvg.toFixed(4)}`,
        `${h.ccy==="THB"?"฿":"$"}${h.price.toFixed(4)}`,
        (h.ccy==="THB" ? mvUSD/FX : mvUSD).toFixed(2),
        (h.ccy==="THB" ? mvUSD    : mvUSD*FX).toFixed(2),
        h.plUSD.toFixed(2), h.plTHB.toFixed(2), pct,
        h.classKey==="th" ? "ไม่ (SET ยกเว้น)" : "ใช่ (เมื่อขาย)",
      ));
    });
    lines.push("");

    // ── Section 4: Earn income ──
    const earnList = store.earn || [];
    if (earnList.length > 0) {
      lines.push(row("=== ส่วนที่ 3: รายได้จาก Earn ==="));
      lines.push(row("Ticker","จำนวนที่ฝาก","APY (%)","ประเภท",
        "คาดการณ์รายได้/ปี (Token)","คาดการณ์รายได้/ปี (USD)","คาดการณ์รายได้/ปี (THB)",
        "หมายเหตุ"));
      earnList.forEach(p => {
        const annualToken = p.qty * (p.apy/100);
        const priceUSD    = (store.holdings||[]).find(h=>h.ticker===p.sym)?.price || 1;
        const annualUSD   = annualToken * priceUSD;
        lines.push(row(
          p.sym, p.qty.toFixed(6), p.apy.toFixed(2), p.kind||"",
          annualToken.toFixed(6), annualUSD.toFixed(2), (annualUSD*FX).toFixed(2),
          "รายได้จากดอกเบี้ย — ต้องรายงานตาม ม.40(4)",
        ));
      });
      lines.push("");
    }

    // ── Section 5: Tax summary ──
    lines.push(row("=== ส่วนที่ 4: สรุปภาษีประมาณการ ==="));
    lines.push(row("รายการ","จำนวน (THB)","หมายเหตุ"));
    lines.push(row("กำไรรับรู้แล้วทั้งหมด",     (totalGainUSD*FX).toFixed(2), "รวมทุกประเภทสินทรัพย์"));
    lines.push(row("ขาดทุนรับรู้แล้วทั้งหมด",    (totalLossUSD*FX).toFixed(2), ""));
    lines.push(row("กำไรสุทธิ",                  (netGainUSD*FX).toFixed(2),  ""));
    lines.push(row("กำไรที่ต้องเสียภาษี",         taxableGainTHB.toFixed(2),   "ไม่รวม SET"));
    lines.push(row("ภาษีประมาณการ (PIT อัตราก้าวหน้า)", estPIT.toFixed(2), "ไม่รวมค่าลดหย่อน"));
    lines.push(row("ภาษีทางเลือก (15% flat)",    estFlat.toFixed(2), "หัก ณ ที่จ่าย"));
    lines.push(row("อัตราแลกเปลี่ยนที่ใช้",      `1 USD = ${FX} THB`, `ณ วันที่สร้างรายงาน`));
    lines.push("");
    lines.push(row("⚠️ ข้อควรระวัง: รายงานนี้เป็นเพียงการประมาณการเบื้องต้น ไม่รวมค่าลดหย่อนส่วนตัว กรุณาปรึกษานักบัญชีหรือกรมสรรพากร (rd.go.th)"));

    const csv  = lines.join("\n");
    const blob = new Blob(["﻿" + csv], { type:"text/csv;charset=utf-8;" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href = url; a.download = `siamfolio-tax-${year}-BE${thaiYear}.csv`;
    document.body.appendChild(a); a.click();
    setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 300);
  };

  return (
    <PageShell
      title="📋 รายงานภาษี"
      sub={`ปีภาษี ${year} · ข้อมูลประมาณการ — ควรปรึกษานักบัญชีหรือกรมสรรพากร`}
      actions={
        <div style={{display:"flex", gap:8, alignItems:"center"}}>
          <div className="range-tabs">
            {years.map(y => (
              <button key={y}
                      className={year === parseInt(y) ? "is-on" : ""}
                      onClick={() => setYear(parseInt(y))}>
                {y}
              </button>
            ))}
          </div>
          <button className="btn primary" onClick={exportCSV}>⬇ Export CSV</button>
        </div>
      }
    >
      {/* ── KPI row ── */}
      <div className="kpi-grid" style={{marginBottom:20}}>
        <div className="kpi">
          <div className="label">กำไรรับรู้แล้วในปี</div>
          <div className="value" style={{color:"var(--up)"}}>
            {ccySym}{ccy==="THB" ? Math.round(cv(totalGainUSD)).toLocaleString() : fmtNum(totalGainUSD,2)}
          </div>
          <div className="delta up">Realized gain {year}</div>
        </div>
        <div className="kpi">
          <div className="label">ขาดทุนรับรู้แล้ว</div>
          <div className="value" style={{color:"var(--down)"}}>
            −{ccySym}{ccy==="THB" ? Math.round(cv(Math.abs(totalLossUSD))).toLocaleString() : fmtNum(Math.abs(totalLossUSD),2)}
          </div>
          <div className="delta down">Realized loss {year}</div>
        </div>
        <div className="kpi">
          <div className="label">ภาษีประเมิน (PIT)</div>
          <div className="value" style={{color:"var(--accent-ink)"}}>
            ฿{Math.round(estPIT).toLocaleString()}
          </div>
          <div className="delta" style={{color:"var(--muted)"}}>บนกำไรที่ต้องเสีย ฿{Math.round(taxableGainTHB).toLocaleString()}</div>
        </div>
        <div className="kpi">
          <div className="label">กำไรยังไม่รับรู้รวม</div>
          <div className="value" style={{color: totalUnrealTHB>=0 ? "var(--up)" : "var(--down)"}}>
            {totalUnrealTHB>=0?"+":"−"}{ccySym}{ccy==="THB" ? Math.round(Math.abs(totalUnrealTHB)).toLocaleString() : fmtNum(Math.abs(totalUnrealTHB/FX),2)}
          </div>
          <div className="delta" style={{color:"var(--muted)"}}>ยังไม่ต้องเสียภาษี</div>
        </div>
      </div>

      <div style={{display:"flex", gap:20, flexWrap:"wrap", alignItems:"flex-start"}}>

        {/* ── Left column: tables ── */}
        <div style={{flex:"2 1 500px", display:"flex", flexDirection:"column", gap:20}}>

          {/* Realized events table */}
          <div>
            <div style={{fontWeight:700, fontSize:14, marginBottom:10}}>
              รายการขายในปี {year}
              <span style={{fontWeight:400, color:"var(--muted)", fontSize:12, marginLeft:8}}>
                {taxEvents.length} รายการ
              </span>
            </div>
            <div className="card" style={{padding:0, overflow:"visible"}}>
              {taxEvents.length === 0 ? (
                <div style={{padding:48, textAlign:"center", color:"var(--muted)"}}>
                  <div style={{fontSize:36, marginBottom:10}}>📋</div>
                  <div style={{fontWeight:700, fontSize:15, marginBottom:6}}>ไม่มีรายการขายในปี {year}</div>
                  <div style={{fontSize:13}}>บันทึกธุรกรรม "ขาย" เพื่อให้ระบบคำนวณภาษีอัตโนมัติ</div>
                </div>
              ) : (
                <>
                  <div className="tax-head">
                    <div>วันที่</div><div>สินทรัพย์</div><div>จำนวน</div>
                    <div>ต้นทุน (USD)</div><div>ราคาขาย (USD)</div>
                    <div>กำไร / ขาดทุน</div><div>สถานะ</div>
                  </div>
                  {taxEvents.map(e => (
                    <div className="tax-row" key={e.id}>
                      <div style={{fontSize:12, color:"var(--muted)"}}>{e.date}</div>
                      <div>
                        <div style={{fontWeight:700, fontFamily:"var(--font-mono)", fontSize:13}}>{e.ticker}</div>
                        <div style={{fontSize:10, color:"var(--muted)"}}>{e.classKey?.toUpperCase()}</div>
                      </div>
                      <div className="num" style={{fontSize:12}}>{Math.abs(e.qty||0).toFixed(4)}</div>
                      <div className="num" style={{fontSize:12}}>${fmtNum(e.costBasisUSD, 2)}</div>
                      <div className="num" style={{fontSize:12}}>${fmtNum(e.proceedsUSD, 2)}</div>
                      <div>
                        <div className="num" style={{fontWeight:700, fontSize:13,
                             color: e.gainUSD>=0 ? "var(--up)" : "var(--down)"}}>
                          {e.gainUSD>=0?"+":"−"}{ccySym}{fmtNum(cv(Math.abs(e.gainUSD)), ccy==="THB"?0:2)}
                        </div>
                        <div style={{fontSize:10, color:"var(--muted)"}}>
                          {e.costBasisUSD > 0 ? ((e.gainUSD/e.costBasisUSD)*100).toFixed(1)+"%" : "—"}
                        </div>
                      </div>
                      <div>
                        <span style={{
                          display:"inline-block", fontSize:10, padding:"3px 9px", borderRadius:20, fontWeight:600,
                          background: e.isTaxable ? "var(--down-soft)" : "var(--up-soft)",
                          color:       e.isTaxable ? "var(--down)"     : "var(--up)",
                        }}>
                          {e.isTaxable ? "ต้องเสีย" : "ยกเว้น"}
                        </span>
                      </div>
                    </div>
                  ))}
                  {/* Summary footer */}
                  <div className="tax-row" style={{background:"var(--surface-2)", fontWeight:700, borderTop:"2px solid var(--line)"}}>
                    <div style={{color:"var(--muted)", fontSize:12}}>รวม {taxEvents.length} รายการ</div>
                    <div/><div/>
                    <div className="num" style={{fontSize:12}}>
                      ${fmtNum(taxEvents.reduce((s,e) => s+e.costBasisUSD, 0), 2)}
                    </div>
                    <div className="num" style={{fontSize:12}}>
                      ${fmtNum(taxEvents.reduce((s,e) => s+e.proceedsUSD, 0), 2)}
                    </div>
                    <div className="num" style={{fontWeight:800, color: netGainUSD>=0 ? "var(--up)" : "var(--down)"}}>
                      {netGainUSD>=0?"+":"−"}{ccySym}{fmtNum(cv(Math.abs(netGainUSD)), ccy==="THB"?0:2)}
                    </div>
                    <div/>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Unrealized gains table */}
          <div>
            <div style={{fontWeight:700, fontSize:14, marginBottom:10}}>
              กำไร / ขาดทุนยังไม่รับรู้
              <span style={{fontWeight:400, color:"var(--muted)", fontSize:12, marginLeft:8}}>
                ยังไม่ต้องเสียภาษีจนกว่าจะขาย
              </span>
            </div>
            <div className="card" style={{padding:0}}>
              <div style={{
                padding:"10px 20px", background:"var(--surface-2)", borderBottom:"1px solid var(--line)",
                display:"grid", gridTemplateColumns:"1.4fr 0.7fr 0.9fr 0.9fr 1fr", gap:12,
                fontSize:11, color:"var(--muted)", textTransform:"uppercase", letterSpacing:"0.06em",
                borderRadius:"calc(var(--radius) - 1px) calc(var(--radius) - 1px) 0 0", overflow:"hidden",
              }}>
                <div>สินทรัพย์</div><div>ประเภท</div>
                <div>ต้นทุนเฉลี่ย</div><div>ราคาตลาด</div><div>กำไร / ขาดทุน</div>
              </div>
              {unrealized.map(h => (
                <div key={h.ticker} style={{
                  padding:"10px 20px", borderBottom:"1px solid var(--line)",
                  display:"grid", gridTemplateColumns:"1.4fr 0.7fr 0.9fr 0.9fr 1fr",
                  gap:12, alignItems:"center", transition:"background .15s",
                }}>
                  <div>
                    <div style={{fontWeight:700, fontFamily:"var(--font-mono)", fontSize:13}}>{h.ticker}</div>
                    <div style={{fontSize:11, color:"var(--muted)"}}>{h.name}</div>
                  </div>
                  <div>
                    <span style={{
                      display:"inline-block", fontSize:10, padding:"2px 7px", borderRadius:20, fontWeight:600,
                      background: h.classKey==="th" ? "var(--up-soft)" : "var(--surface-2)",
                      color:      h.classKey==="th" ? "var(--up)"      : "var(--muted)",
                    }}>
                      {h.classKey==="th" ? "ยกเว้น" : h.classKey?.toUpperCase()}
                    </span>
                  </div>
                  <div className="num" style={{fontSize:12}}>
                    {h.ccy==="THB"?"฿":"$"}{fmtNum(h.costAvg, 2)}
                  </div>
                  <div className="num" style={{fontSize:12}}>
                    {h.ccy==="THB"?"฿":"$"}{fmtNum(h.price, 2)}
                  </div>
                  <div className="num" style={{fontWeight:700, fontSize:13, color: h.plTHB>=0 ? "var(--up)" : "var(--down)"}}>
                    {h.plTHB>=0?"+":"−"}{ccySym}{ccy==="THB" ? Math.round(Math.abs(h.plTHB)).toLocaleString() : fmtNum(Math.abs(h.plUSD),2)}
                  </div>
                </div>
              ))}
              <div style={{
                padding:"10px 20px", background:"var(--surface-2)", borderTop:"2px solid var(--line)",
                display:"flex", justifyContent:"space-between", fontWeight:700, fontSize:13,
              }}>
                <span>กำไร / ขาดทุนยังไม่รับรู้รวม</span>
                <span className="num" style={{color: totalUnrealTHB>=0 ? "var(--up)" : "var(--down)"}}>
                  {totalUnrealTHB>=0?"+":"−"}{ccySym}{ccy==="THB" ? Math.round(Math.abs(totalUnrealTHB)).toLocaleString() : fmtNum(Math.abs(totalUnrealTHB/FX),2)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Right column ── */}
        <div style={{flex:"1 1 270px", display:"flex", flexDirection:"column", gap:16}}>

          {/* PIT Estimation card */}
          <div className="card">
            <div className="card-title" style={{marginBottom:4}}>ประมาณการ ภ.ง.ด. บุคคลธรรมดา</div>
            <div style={{fontSize:12, color:"var(--muted)", marginBottom:16}}>
              ฐานกำไรที่ต้องเสีย:{" "}
              <b className="num" style={{color:"var(--ink)"}}>฿{Math.round(taxableGainTHB).toLocaleString()}</b>
            </div>

            {PIT_BRACKETS.slice(0,7).map((b, i) => {
              const slice = Math.max(0,
                Math.min(taxableGainTHB, b.to === Infinity ? taxableGainTHB : b.to) - b.from
              );
              const tax = slice * b.rate;
              if (b.from >= taxableGainTHB && slice === 0 && i > 0) return null;
              return (
                <div key={i} style={{marginBottom:9}}>
                  <div style={{display:"flex", justifyContent:"space-between", fontSize:11, marginBottom:3}}>
                    <span style={{color: slice > 0 ? "var(--ink)" : "var(--muted)"}}>
                      {b.rate*100}% · ฿{b.from.toLocaleString()}–{b.to===Infinity?"∞":b.to.toLocaleString()}
                    </span>
                    <span className="num" style={{
                      color: slice>0 ? "var(--accent-ink)" : "var(--muted)",
                      fontWeight: slice>0 ? 700 : 400
                    }}>
                      ฿{Math.round(tax).toLocaleString()}
                    </span>
                  </div>
                  <div style={{height:5, background:"var(--line)", borderRadius:3}}>
                    <div style={{
                      height:"100%", borderRadius:3, transition:"width .5s",
                      background: slice>0 ? "var(--accent)" : "transparent",
                      width: taxableGainTHB>0 ? Math.min((slice/taxableGainTHB)*100,100)+"%" : "0%",
                    }}/>
                  </div>
                </div>
              );
            })}

            <div style={{borderTop:"2px solid var(--line)", marginTop:14, paddingTop:14}}>
              <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6}}>
                <span style={{fontSize:13, fontWeight:700}}>ภาษีรวม (PIT)</span>
                <span className="num" style={{fontSize:22, fontWeight:800, color:"var(--accent-ink)"}}>
                  ฿{Math.round(estPIT).toLocaleString()}
                </span>
              </div>
              <div style={{display:"flex", justifyContent:"space-between", fontSize:12, color:"var(--muted)"}}>
                <span>ทางเลือก: หัก ณ ที่จ่าย 15% flat</span>
                <span className="num">฿{Math.round(estFlat).toLocaleString()}</span>
              </div>
            </div>
            <div style={{
              marginTop:10, padding:"9px 11px",
              background:"var(--surface-2)", borderRadius:7,
              fontSize:10, color:"var(--muted)", lineHeight:1.65,
            }}>
              ⚠️ ประมาณการเท่านั้น ไม่รวมค่าลดหย่อนส่วนตัว เงินได้จากแหล่งอื่น และสิทธิประโยชน์ต่างๆ
              กรุณาปรึกษานักบัญชีหรือกรมสรรพากรก่อนยื่นแบบ
            </div>
          </div>

          {/* Asset class tax guide */}
          <div className="card">
            <div className="card-title" style={{marginBottom:14}}>กฎภาษีตามประเภทสินทรัพย์</div>
            {TAX_GUIDES.map(item => (
              <div key={item.key} style={{display:"flex", gap:10, padding:"10px 0", borderBottom:"1px solid var(--line)"}}>
                <div style={{fontSize:20, width:28, textAlign:"center", flexShrink:0, lineHeight:1.2}}>{item.icon}</div>
                <div style={{flex:1, minWidth:0}}>
                  <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", gap:8}}>
                    <span style={{fontWeight:600, fontSize:13}}>{item.label}</span>
                    <span style={{
                      display:"inline-block", fontSize:10, padding:"2px 9px", borderRadius:20, fontWeight:700, flexShrink:0,
                      background: item.exempt ? "var(--up-soft)"   : "var(--down-soft)",
                      color:      item.exempt ? "var(--up)"        : "var(--down)",
                    }}>
                      {item.exempt ? "ยกเว้น" : "ต้องเสีย"}
                    </span>
                  </div>
                  <div style={{fontSize:11, color:"var(--muted)", marginTop:3, lineHeight:1.5}}>{item.desc}</div>
                </div>
              </div>
            ))}
            <div style={{
              marginTop:12, padding:"9px 11px", background:"var(--surface-2)",
              borderRadius:7, fontSize:11, color:"var(--muted)", lineHeight:1.6,
            }}>
              📎 อ้างอิง: ประมวลรัษฎากร ม.40 ·{" "}
              <a href="https://www.rd.go.th" target="_blank" rel="noopener"
                 style={{color:"var(--accent-ink)"}}>rd.go.th</a>
            </div>
          </div>

          {/* Effective rate summary */}
          {taxEvents.length > 0 && taxableGainTHB > 0 && (
            <div className="card">
              <div className="card-title" style={{marginBottom:12}}>อัตราภาษีที่แท้จริง</div>
              {[
                { label:"อัตราก้าวหน้า (PIT)", tax: estPIT,  rate: estPIT/taxableGainTHB },
                { label:"หัก ณ ที่จ่าย 15%",  tax: estFlat, rate: 0.15 },
              ].map((row,i) => (
                <div key={i} style={{marginBottom:12}}>
                  <div style={{display:"flex", justifyContent:"space-between", fontSize:12, marginBottom:4}}>
                    <span style={{color:"var(--muted)"}}>{row.label}</span>
                    <span className="num" style={{fontWeight:700, color:"var(--accent-ink)"}}>
                      {(row.rate*100).toFixed(1)}%
                    </span>
                  </div>
                  <div style={{height:8, background:"var(--line)", borderRadius:4}}>
                    <div style={{
                      height:"100%", borderRadius:4, background:"var(--accent)",
                      width: (row.rate*100).toFixed(1)+"%", transition:"width .5s",
                    }}/>
                  </div>
                  <div style={{fontSize:11, color:"var(--muted)", marginTop:3, textAlign:"right"}}>
                    ฿{Math.round(row.tax).toLocaleString()} / ฿{Math.round(taxableGainTHB).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </PageShell>
  );
}

// ─────── CSS injection ───────────────────────────────────────────────────────
const TAX_STYLES = `
.tax-head, .tax-row {
  display: grid;
  grid-template-columns: 0.7fr 0.9fr 0.65fr 0.95fr 0.95fr 1.1fr 0.75fr;
  align-items: center;
  gap: 12px;
  padding: 10px 20px;
}
.tax-head {
  font-size: 11px; color: var(--muted); text-transform: uppercase;
  letter-spacing: 0.06em; border-bottom: 1px solid var(--line);
  background: var(--surface-2);
  border-radius: calc(var(--radius) - 1px) calc(var(--radius) - 1px) 0 0;
  overflow: hidden;
}
.tax-row { border-bottom: 1px solid var(--line); transition: background .15s; }
.tax-row:last-child { border-bottom: 0; }
.tax-row:hover { background: var(--surface-2); }
@media (max-width: 768px) {
  .tax-head { display: none; }
  .tax-row  { grid-template-columns: 1fr 1fr; grid-template-rows: auto auto auto; }
}
`;

if (!document.getElementById("tax-styles")) {
  const s = document.createElement("style");
  s.id = "tax-styles";
  s.textContent = TAX_STYLES;
  document.head.appendChild(s);
}

window.TaxView = TaxView;
