// Main Dashboard view — store-backed

// ─────── Beach scene cloud ───────
function BeachCloud({ style, animName, duration, delay }) {
  return (
    <div style={{
      position:"absolute", pointerEvents:"none",
      animation:`${animName} ${duration}s linear ${delay}s infinite`,
      ...style,
    }}>
      {/* Main cloud body */}
      <div style={{
        position:"relative",
        width:style.width || 70,
        height: (style.width || 70) * 0.4,
        background:"rgba(255,255,255,0.92)",
        borderRadius: 999,
        boxShadow:"0 2px 8px rgba(255,255,255,0.5)",
      }}>
        {/* Left puff */}
        <div style={{
          position:"absolute", top:"-40%", left:"10%",
          width:"38%", height:"80%",
          background:"rgba(255,255,255,0.95)",
          borderRadius:"50%",
        }}/>
        {/* Centre puff */}
        <div style={{
          position:"absolute", top:"-55%", left:"30%",
          width:"45%", height:"95%",
          background:"white",
          borderRadius:"50%",
        }}/>
        {/* Right puff */}
        <div style={{
          position:"absolute", top:"-30%", left:"55%",
          width:"32%", height:"70%",
          background:"rgba(255,255,255,0.9)",
          borderRadius:"50%",
        }}/>
      </div>
    </div>
  );
}

// ─────── Mascot walking sprite with full beach scene ───────
function HeroMascot({ dayPct }) {
  const containerRef = React.useRef(null);
  const [vis, setVis] = React.useState(true);
  const stRef = React.useRef({ pos: -100, dir: 1, frame: 0, tick: 0 });
  const [rs, setRs]   = React.useState({ pos: -100, dir: 1, frame: 0 });

  const isUp = dayPct >= 0;

  // Frame mapping: TL=0 beach-ball  TR=1 swim-ring  BL=2 water-gun  BR=3 surfing
  const FRAME_SEQ = isUp ? [0, 3, 1, 3] : [2, 2, 0, 2];
  const FRAME_POS = [
    { bx:"0%",   by:"0%" },
    { bx:"100%", by:"0%" },
    { bx:"0%",   by:"100%" },
    { bx:"100%", by:"100%" },
  ];

  React.useEffect(() => {
    const SPEED = 2.4, FRAME_TKS = 8, SIZE = 96;
    const id = setInterval(() => {
      const st = stRef.current;
      const w  = containerRef.current?.offsetWidth || 500;
      st.pos += st.dir * SPEED;
      if (st.pos > w + SIZE * 0.3)  st.dir = -1;
      if (st.pos < -SIZE)            st.dir =  1;
      st.tick++;
      if (st.tick >= FRAME_TKS) { st.frame = (st.frame + 1) % 4; st.tick = 0; }
      setRs({ pos: st.pos, dir: st.dir, frame: st.frame });
    }, 50);
    return () => clearInterval(id);
  }, []);

  if (!vis) return null;
  const fp = FRAME_POS[FRAME_SEQ[rs.frame]];

  // Sky colours change based on performance
  const skyTop    = isUp ? "#5BC8F5" : "#7896B4";
  const skyBot    = isUp ? "#A8DFFF" : "#B0C8D8";
  const seaTop    = isUp ? "#1E9ECC" : "#5077A0";
  const seaBot    = isUp ? "#1578A8" : "#3A5F80";
  const sandTop   = isUp ? "#F9DC72" : "#D4BC5A";
  const sandBot   = isUp ? "#EEC845" : "#C0A848";

  return (
    <div ref={containerRef} style={{
      position:"absolute", bottom:0, left:0, right:0, height:148,
      overflow:"hidden", borderRadius:"0 0 var(--radius) var(--radius)",
      pointerEvents:"none",
    }}>

      {/* ── Sky ── */}
      <div style={{
        position:"absolute", inset:0,
        background:`linear-gradient(180deg, ${skyTop} 0%, ${skyBot} 100%)`,
        transition:"background 1.2s",
      }}/>

      {/* ── Sun (only when up) ── */}
      {isUp && (
        <div style={{
          position:"absolute", top:14, right:56,
          width:30, height:30, borderRadius:"50%",
          background:"radial-gradient(circle, #FFF176 0%, #FFD740 60%, #FFC107 100%)",
          animation:"mascot-sun-pulse 3s ease-in-out infinite",
        }}>
          {/* Sun rays */}
          {[0,45,90,135].map(deg => (
            <div key={deg} style={{
              position:"absolute", top:"50%", left:"50%",
              width:38, height:2,
              background:"linear-gradient(90deg,rgba(255,220,50,0.7),transparent)",
              transformOrigin:"0 50%",
              transform:`translate(12px,-1px) rotate(${deg}deg)`,
              borderRadius:2,
            }}/>
          ))}
        </div>
      )}

      {/* ── Stars (only when down — night/storm mood) ── */}
      {!isUp && [
        {x:"12%",y:12,d:"0s"},{x:"28%",y:7,d:"0.6s"},{x:"55%",y:14,d:"1.1s"},
        {x:"72%",y:8,d:"0.3s"},{x:"88%",y:16,d:"0.8s"},
      ].map((s,i) => (
        <div key={i} style={{
          position:"absolute", left:s.x, top:s.y,
          width:4, height:4, borderRadius:"50%",
          background:"white",
          animation:`mascot-star-twinkle 2s ease-in-out ${s.d} infinite`,
        }}/>
      ))}

      {/* ── Clouds ── */}
      <BeachCloud
        style={{ top:10, left:"-80px", width:90 }}
        animName="mascot-cloud-a" duration={38} delay={0}/>
      <BeachCloud
        style={{ top:6, left:"-160px", width:70, opacity:0.85 }}
        animName="mascot-cloud-a" duration={52} delay={-18}/>
      <BeachCloud
        style={{ top:18, left:"-220px", width:60, opacity:0.7 }}
        animName="mascot-cloud-b" duration={44} delay={-32}/>

      {/* ── Distant hills / horizon glow ── */}
      <div style={{
        position:"absolute", bottom:58, left:0, right:0, height:18,
        background:`linear-gradient(180deg, transparent 0%, ${isUp?"rgba(30,158,204,0.3)":"rgba(50,77,100,0.3)"} 100%)`,
        transition:"background 1.2s",
      }}/>

      {/* ── Sea ── */}
      <div style={{
        position:"absolute", bottom:36, left:0, right:0, height:56,
        background:`linear-gradient(180deg, ${seaTop} 0%, ${seaBot} 100%)`,
        transition:"background 1.2s",
      }}>
        {/* subtle sea shimmer */}
        <div style={{
          position:"absolute", inset:0,
          backgroundImage:"repeating-linear-gradient(90deg,rgba(255,255,255,0.06) 0px,rgba(255,255,255,0.06) 2px,transparent 2px,transparent 24px)",
          animation:"mascot-wave 8s linear infinite",
        }}/>
      </div>

      {/* ── Wave crest (animated scroll) ── */}
      <div style={{
        position:"absolute", bottom:54, left:0, right:0, height:22,
        overflow:"hidden",
      }}>
        <div style={{
          position:"absolute", top:0, left:0,
          width:"300%", height:"100%",
          animation:"mascot-wave 4s linear infinite",
          backgroundImage:`
            radial-gradient(ellipse 40px 14px at 40px 100%, rgba(255,255,255,${isUp?0.55:0.25}) 0%, transparent 70%),
            radial-gradient(ellipse 28px 10px at 95px 100%, rgba(255,255,255,${isUp?0.4:0.18}) 0%, transparent 70%),
            radial-gradient(ellipse 35px 12px at 150px 100%, rgba(255,255,255,${isUp?0.5:0.22}) 0%, transparent 70%)
          `,
          backgroundSize:"160px 100%",
        }}/>
      </div>
      {/* Wave foam edge */}
      <div style={{
        position:"absolute", bottom:50, left:0, right:0, height:8,
        overflow:"hidden",
      }}>
        <div style={{
          position:"absolute", top:0, left:0,
          width:"200%", height:"100%",
          animation:"mascot-wave 3.2s linear infinite",
          background:`repeating-linear-gradient(90deg,
            rgba(255,255,255,${isUp?0.7:0.3}) 0px, rgba(255,255,255,0) 24px,
            transparent 24px, transparent 60px)`,
        }}/>
      </div>

      {/* ── Sand ── */}
      <div style={{
        position:"absolute", bottom:0, left:0, right:0, height:38,
        background:`linear-gradient(180deg, ${sandTop} 0%, ${sandBot} 100%)`,
        transition:"background 1.2s",
      }}>
        {/* Sand pebble texture */}
        <div style={{
          position:"absolute", inset:0,
          backgroundImage:"radial-gradient(circle,rgba(0,0,0,0.05) 1px,transparent 1px)",
          backgroundSize:"10px 10px",
          backgroundPosition:"0 0",
        }}/>
        {/* Sand wet edge (darker near water) */}
        <div style={{
          position:"absolute", top:0, left:0, right:0, height:8,
          background:`linear-gradient(180deg, ${isUp?"rgba(200,160,40,0.45)":"rgba(150,120,40,0.45)"} 0%, transparent 100%)`,
        }}/>
      </div>

      {/* ── Mascot shadow ── */}
      <div style={{
        position:"absolute",
        bottom:30,
        left: rs.pos + 8,
        width:72, height:10,
        borderRadius:"50%",
        background:"rgba(0,0,0,0.14)",
        filter:"blur(5px)",
        transform:`scaleX(${rs.dir})`,
        transformOrigin:"36px 5px",
      }}/>

      {/* ── Mascot sprite ── */}
      <div style={{
        position:"absolute",
        bottom:26,
        left: rs.pos,
        width:96, height:96,
        backgroundImage:"url('mascot.png')",
        backgroundSize:"200% 200%",
        backgroundPosition:`${fp.bx} ${fp.by}`,
        backgroundRepeat:"no-repeat",
        transform:`scaleX(${rs.dir})`,
        transformOrigin:"48px 48px",
        filter: isUp
          ? "drop-shadow(0 3px 8px rgba(0,0,0,0.28))"
          : "saturate(0.55) brightness(0.9) drop-shadow(0 3px 8px rgba(0,0,0,0.3))",
        transition:"filter 1s",
      }} onError={() => setVis(false)}/>

    </div>
  );
}

function Dashboard({ ccy, onOpenAsset, onAddHolding, onAddTx, onAddDCA, onAddEarn, onEditHolding, accent, searchQuery }) {
  const store = window.useStore();
  const M = window.MOCK; // still used for portfolio history baseline
  const allHoldings = store.holdings;
  const [selectedAllocKey, setSelectedAllocKey] = React.useState(null);
  const searchedHoldings = searchQuery
    ? allHoldings.filter(h =>
        h.ticker.toUpperCase().includes(searchQuery.toUpperCase()) ||
        (h.name || "").toUpperCase().includes(searchQuery.toUpperCase())
      )
    : allHoldings;
  const activeAllocKey = selectedAllocKey && allHoldings.some(h => (h.id || h.ticker) === selectedAllocKey)
    ? selectedAllocKey
    : null;
  const selectedAllocHolding = activeAllocKey
    ? allHoldings.find(h => (h.id || h.ticker) === activeAllocKey)
    : null;
  const holdings = activeAllocKey
    ? searchedHoldings.filter(h => (h.id || h.ticker) === activeAllocKey)
    : searchedHoldings;
  const dcaList = store.dca;
  const earnList = store.earn;
  const benchmarks = store.benchmarks || M.BENCHMARKS;
  const FX = store.fx || 35.8;

  const [confirm, setConfirm] = React.useState(null);
  const askConfirm = (cfg) => setConfirm(cfg);
  const closeConfirm = () => setConfirm(null);
  const doConfirm = () => {
    if (confirm?.onConfirm) confirm.onConfirm();
    setConfirm(null);
  };

  // Aggregate metrics (always use full list, not filtered)
  const totals = React.useMemo(() => {
    let mvTHB = 0, costTHB = 0, dayChgTHB = 0;
    const byClass = { us: 0, th: 0, crypto: 0, gold: 0 };
    allHoldings.forEach(h => {
      const mv = h.qty * h.price;
      const cost = h.qty * h.costAvg;
      const dayChg = mv * ((h.chg1d || 0) / 100);
      const mvT = h.ccy === "THB" ? mv : mv * FX;
      const costT = h.ccy === "THB" ? cost : cost * FX;
      const dayT = h.ccy === "THB" ? dayChg : dayChg * FX;
      mvTHB += mvT;
      costTHB += costT;
      dayChgTHB += dayT;
      if (byClass[h.classKey] != null) byClass[h.classKey] += mvT;
    });
    return { mvTHB, costTHB, dayChgTHB, byClass };
  }, [allHoldings, FX]);

  const unrealTHB = totals.mvTHB - totals.costTHB;
  const unrealPct = totals.costTHB > 0 ? (unrealTHB / totals.costTHB) * 100 : 0;
  const dayPct = totals.mvTHB > 0 ? (totals.dayChgTHB / (totals.mvTHB - totals.dayChgTHB)) * 100 : 0;

  const cv = (vTHB) => ccy === "THB" ? vTHB : vTHB / FX;
  const ccySym = ccy === "THB" ? "฿" : "$";

  const [range, setRange] = React.useState("6M");
  const histTHB = M.PORTFOLIO_HISTORY[range];
  // Scale baseline history to current portfolio value
  const baselineLast = histTHB[histTHB.length - 1];
  const scale = totals.mvTHB > 0 && baselineLast > 0 ? totals.mvTHB / baselineLast : 1;
  const histDisp = histTHB.map(v => cv(v * scale));

  const allocPalette = [
    "#f2b94b", "#5aa7ff", "#ff8a5c", "#87d37c", "#b88cff", "#ffc857",
    "#45c4b0", "#ff6f91", "#6f8cff", "#d6a85f", "#77dd77", "#ffb347",
  ];
  const assetAllocSegs = allHoldings
    .map((h, i) => {
      const mvNative = h.qty * h.price;
      const mvTHB = h.ccy === "THB" ? mvNative : mvNative * FX;
      return {
        key: h.id || h.ticker,
        ticker: h.ticker,
        name: h.name,
        classKey: h.classKey,
        value: mvTHB,
        color: allocPalette[i % allocPalette.length],
        valueDisplay: `${ccySym}${Math.round(cv(mvTHB)).toLocaleString()}`,
      };
    })
    .filter(s => s.value > 0)
    .sort((a, b) => b.value - a.value);
  const topAlloc = assetAllocSegs[0] || null;
  const topAllocPct = topAlloc && totals.mvTHB > 0 ? (topAlloc.value / totals.mvTHB) * 100 : 0;
  const concentration = topAllocPct >= 40
    ? { tone: "high", label: "กระจุกสูง", hint: "ตัวเดียวกินสัดส่วนเยอะ ควรเฝ้าดูความเสี่ยง" }
    : topAllocPct >= 25
      ? { tone: "watch", label: "เริ่มกระจุก", hint: "ยังรับได้ แต่ควรมีแผนกระจายเพิ่ม" }
      : { tone: "ok", label: "กระจายดี", hint: "น้ำหนักตัวหลักยังไม่สูงเกินไป" };

  // Find next DCA
  const nextDCA = dcaList
    .filter(d => !d.paused && d.nextDate)
    .sort((a, b) => a.nextDate.localeCompare(b.nextDate))[0];
  const nextDCALabel = nextDCA
    ? `${nextDCA.ticker} ใน ${Math.max(0, window.daysBetween(window.todayISO(), nextDCA.nextDate))} วัน`
    : "ไม่มีรายการ";

  // ─────── Empty portfolio? Show onboarding ───────
  if (allHoldings.length === 0) {
    return (
      <section className="card" style={{padding:40, textAlign:"center"}}>
        <div className="empty-state">
          <div className="ico"><Ico name="wallet" size={28}/></div>
          <div className="title">ยังไม่มีสินทรัพย์ในพอร์ต</div>
          <div>เริ่มต้นโดยการเพิ่มสินทรัพย์แรก หรือนำเข้าจากไฟล์ JSON</div>
          <button className="btn primary" onClick={onAddHolding} style={{marginTop:14}}>
            <Ico name="plus" size={14}/> เพิ่มสินทรัพย์แรก
          </button>
        </div>
      </section>
    );
  }

  return (
    <>
      {/* ===== Hero ===== */}
      <section className="hero">
        <div className="card hero-main tint" style={{position:"relative", paddingBottom:160, overflow:"hidden"}}>
          <div className="hero-eye">
            <Ico name="eye" size={14}/> มูลค่าพอร์ตรวม (ทุกสินทรัพย์)
          </div>
          <div className="hero-total num">
            <span>{ccySym}{ccy === "THB" ? Math.round(totals.mvTHB).toLocaleString() : (totals.mvTHB / FX).toLocaleString("en-US", {minimumFractionDigits:2, maximumFractionDigits:2})}</span>
            <span className="ccy">{ccy}</span>
          </div>
          <div className="hero-sub">
            ≈ {ccy === "THB"
              ? "$" + (totals.mvTHB / FX).toLocaleString("en-US", {minimumFractionDigits:2, maximumFractionDigits:2}) + " USD"
              : "฿" + Math.round(totals.mvTHB).toLocaleString() + " THB"}
            {"  ·  อัตราแลกเปลี่ยน 1 USD = "}<span className="num">{FX.toFixed(2)}</span>{" บาท"}
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
              <span style={{color:"var(--muted)", fontSize:12}}>· CoinGecko · Yahoo · Frankfurter</span>
            </div>
          </div>

          {/* Walking mascot at the bottom of hero card */}
          <HeroMascot dayPct={dayPct}/>
        </div>

        <div className="kpi-grid">

          {/* ── Card 1: ต้นทุนรวม ── */}
          <div className="kpi">
            <div className="label">ต้นทุนรวม</div>
            <div className="value">{ccySym}{Math.round(cv(totals.costTHB)).toLocaleString()}</div>
            <div className="delta">ลงทุนสะสมตั้งแต่เริ่ม</div>
            {/* cost vs unrealised gain bar */}
            <div className="kpi-bar" style={{marginTop:"auto", paddingTop:12}}>
              <div className="kpi-bar-seg" style={{
                flex: Math.max(totals.costTHB, 1),
                background:"var(--muted-2)",
              }}/>
              {unrealTHB > 0 && (
                <div className="kpi-bar-seg" style={{
                  flex: unrealTHB,
                  background:"var(--up)",
                }}/>
              )}
            </div>
            <div style={{display:"flex", justifyContent:"space-between", marginTop:4, fontSize:10.5, color:"var(--muted)"}}>
              <span>ต้นทุน {fmtPct(totals.costTHB / Math.max(totals.mvTHB,1) * 100)}</span>
              {unrealTHB > 0 && <span style={{color:"var(--up)"}}>กำไร +{fmtPct(unrealPct)}</span>}
              {unrealTHB < 0 && <span style={{color:"var(--down)"}}>ขาดทุน {fmtPct(unrealPct)}</span>}
            </div>
          </div>

          {/* ── Card 2: กำไร/ขาดทุน ── */}
          <div className="kpi" style={{
            background: unrealPct >= 0
              ? "linear-gradient(135deg, var(--surface) 60%, var(--up-soft) 100%)"
              : "linear-gradient(135deg, var(--surface) 60%, var(--down-soft) 100%)",
            borderColor: unrealPct >= 0 ? "oklch(0.88 0.05 155)" : "oklch(0.88 0.05 25)",
          }}>
            <div className="label">กำไร/ขาดทุน</div>
            <div className="value" style={{color: unrealPct >= 0 ? "var(--up)" : "var(--down)"}}>
              {unrealPct >= 0 ? "+" : "−"}{ccySym}{Math.round(Math.abs(cv(unrealTHB))).toLocaleString()}
            </div>
            <div className={`delta ${unrealPct >= 0 ? "up" : "down"}`} style={{marginTop:"auto"}}>
              {unrealPct >= 0 ? "↑" : "↓"} {Math.abs(unrealPct).toFixed(2)}% จากต้นทุน {ccySym}{Math.round(cv(totals.costTHB)).toLocaleString()}
            </div>
          </div>

          {/* ── Card 3: DCA อัตโนมัติ ── */}
          {(() => {
            const active = dcaList.filter(d => !d.paused).length;
            const paused = dcaList.filter(d => d.paused).length;
            return (
              <div className="kpi">
                <div className="label">DCA อัตโนมัติ</div>
                <div className="value">{dcaList.length} <span style={{fontSize:14, fontWeight:500, color:"var(--muted)"}}>รายการ</span></div>
                <div className="delta" style={{color:"var(--accent-ink)"}}>ถัดไป: {nextDCALabel}</div>
                {dcaList.length > 0 && (
                  <div style={{display:"flex", gap:6, marginTop:10}}>
                    <div style={{
                      padding:"2px 10px", borderRadius:6, fontSize:11, fontWeight:600,
                      background:"var(--up-soft)", color:"var(--up)",
                    }}>▶ {active} active</div>
                    {paused > 0 && (
                      <div style={{
                        padding:"2px 10px", borderRadius:6, fontSize:11, fontWeight:600,
                        background:"var(--surface-2)", color:"var(--muted)",
                      }}>⏸ {paused} paused</div>
                    )}
                  </div>
                )}
              </div>
            );
          })()}

          {/* ── Card 4: จำนวนสินทรัพย์ ── */}
          <div className="kpi">
            <div className="label">จำนวนสินทรัพย์</div>
            <div className="value">{allHoldings.length} <span style={{fontSize:14, fontWeight:500, color:"var(--muted)"}}>ตัว</span></div>
            <div className="delta">ใน {Object.values(totals.byClass).filter(v=>v>0).length} ประเภท</div>
            {/* class dots */}
            <div style={{display:"flex", gap:6, marginTop:10, flexWrap:"wrap"}}>
              {[
                {k:"us",    label:"US",     color:"var(--c-us)"},
                {k:"th",    label:"TH",     color:"var(--c-th)"},
                {k:"crypto",label:"CRYPTO", color:"var(--c-crypto)"},
                {k:"gold",  label:"GOLD",   color:"var(--c-gold)"},
              ].filter(c => totals.byClass[c.k] > 0).map(c => {
                const pct = (totals.byClass[c.k] / totals.mvTHB * 100).toFixed(0);
                return (
                  <div key={c.k} style={{
                    display:"flex", alignItems:"center", gap:4,
                    padding:"2px 8px", borderRadius:6, fontSize:11, fontWeight:600,
                    background:"var(--surface-2)",
                  }}>
                    <div style={{width:7, height:7, borderRadius:"50%", background:c.color, flexShrink:0}}/>
                    <span style={{color:"var(--ink-2)"}}>{c.label}</span>
                    <span style={{color:"var(--muted)"}}>{pct}%</span>
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      </section>

      {/* ===== Chart + Allocation ===== */}
      <section className="row-2">
        <div className="card">
          <div className="card-head">
            <div>
              <div className="card-title">มูลค่าพอร์ตย้อนหลัง</div>
              <div className="card-sub">มูลค่าตลาดในสกุล {ccy} ตามช่วงเวลา (อิงประวัติฐาน)</div>
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
              <div className="card-sub">แยกตามรายสินทรัพย์</div>
            </div>
          </div>

          <div className="alloc">
            <div className="alloc-donut-card">
              <AllocationDonut
                size={236}
                thickness={34}
                segments={assetAllocSegs}
                totalDisplay={`${ccySym}${Math.round(cv(totals.mvTHB)).toLocaleString()}`}
                selectedKey={activeAllocKey}
                onSelect={(key) => setSelectedAllocKey(current => current === key ? null : key)}
              />
            </div>

            {topAlloc && (
              <button type="button"
                      className={`alloc-risk-panel ${concentration.tone}`}
                      onClick={() => setSelectedAllocKey(current => current === topAlloc.key ? null : topAlloc.key)}>
                <div className="alloc-risk-main">
                  <span className="alloc-risk-dot" style={{background:topAlloc.color}}></span>
                  <div>
                    <div className="alloc-risk-label">น้ำหนักสูงสุด</div>
                    <div className="alloc-risk-title">{topAlloc.ticker}</div>
                  </div>
                </div>
                <div className="alloc-risk-metric">
                  <div className="alloc-risk-pct">{topAllocPct.toFixed(2)}%</div>
                  <div className="alloc-risk-badge">{concentration.label}</div>
                </div>
                <div className="alloc-risk-hint">{concentration.hint}</div>
              </button>
            )}

            <div className="alloc-legend-grid">
              {assetAllocSegs.slice(0, 6).map(s => {
                const pct = totals.mvTHB > 0 ? (s.value / totals.mvTHB) * 100 : 0;
                const isSelected = activeAllocKey === s.key;
                return (
                  <button type="button"
                          className={isSelected ? "alloc-legend-item is-selected" : "alloc-legend-item"}
                          key={s.key}
                          onClick={() => setSelectedAllocKey(current => current === s.key ? null : s.key)}>
                    <AssetIcon ticker={s.ticker} classKey={s.classKey} size={26}/>
                    <div className="alloc-legend-main">
                      <span>{s.ticker}</span>
                      <b>{pct.toFixed(2)}%</b>
                    </div>
                    <span className="alloc-legend-color" style={{background:s.color}}></span>
                  </button>
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
            <div className="card-sub">
              {holdings.length} รายการ
              {selectedAllocHolding ? ` · กรอง ${selectedAllocHolding.ticker}` : ""}
              {" · คลิกเพื่อดูรายละเอียด · ราคาอัพเดตอัตโนมัติทุก 60 วินาที"}
            </div>
          </div>
          <div className="card-act">
            {selectedAllocHolding && (
              <button className="btn sm" onClick={() => setSelectedAllocKey(null)}>
                ล้างตัวกรอง
              </button>
            )}
            <button className="btn sm" onClick={onAddHolding}>
              <Ico name="plus" size={13}/> เพิ่มสินทรัพย์
            </button>
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

        {holdings.length === 0 && (
          <div style={{padding:"24px", color:"var(--muted)", fontSize:13, textAlign:"center"}}>
            ไม่พบสินทรัพย์ที่ตรงกับตัวกรอง
          </div>
        )}

        {holdings.map(h => {
          const mvNative = h.qty * h.price;
          const costNative = h.qty * h.costAvg;
          const plNative = mvNative - costNative;
          const plPct = costNative > 0 ? (plNative / costNative) * 100 : 0;
          const mvTHB = h.ccy === "THB" ? mvNative : mvNative * FX;
          const plTHB = h.ccy === "THB" ? plNative : plNative * FX;
          const mvDisp = cv(mvTHB);
          const plDisp = cv(plTHB);
          const classLabel = { us:"US", th:"TH", crypto:"CRYPTO", gold:"GOLD" }[h.classKey];

          return (
            <div className="holdings-row" key={h.id} onClick={() => onOpenAsset(h)}>
              <div className="asset-name">
                <AssetIcon ticker={h.ticker} classKey={h.classKey} size={32}/>
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
                  {h.ccy === "THB" ? "฿" : "$"}{fmtNum(h.price, 2)}
                </div>
                <div className="num" style={{fontSize:11, color:"var(--muted)"}}>
                  ต้นทุน {h.ccy === "THB" ? "฿" : "$"}{fmtNum(h.costAvg, 2)}
                </div>
              </div>
              <div className="num" style={{fontSize:13}}>
                {h.qty.toLocaleString("en-US", { maximumFractionDigits: 4 })}
                <div style={{fontSize:11, color:"var(--muted)"}}>
                  {h.classKey === "gold" ? "oz" : h.classKey === "crypto" ? h.ticker : "หุ้น"}
                </div>
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
                <Sparkline data={h.spark || [h.price]}/>
              </div>
              <div onClick={(e) => e.stopPropagation()}>
                <Menu items={[
                  { label: "ดูรายละเอียด", icon: "chev-r", onClick: () => onOpenAsset(h) },
                  { label: "แก้ไข", icon: "edit", onClick: () => onEditHolding(h) },
                  { label: "บันทึกธุรกรรม", icon: "plus", onClick: onAddTx },
                  { sep: true },
                  { label: "ลบสินทรัพย์", icon: "trash", danger: true,
                    onClick: () => askConfirm({
                      title: `ลบ ${h.ticker} ออกจากพอร์ต?`,
                      body: `${h.name} จำนวน ${h.qty.toLocaleString("en-US", {maximumFractionDigits:4})} ${h.classKey === "gold" ? "oz" : "หน่วย"} จะถูกลบออก รวมถึงประวัติธุรกรรมที่เกี่ยวข้อง การดำเนินการนี้ไม่สามารถยกเลิกได้`,
                      requireType: h.ticker,
                      confirmLabel: "ลบสินทรัพย์",
                      onConfirm: () => window.removeHolding(h.id)
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
              <div className="card-sub">{dcaList.length} รายการกำลังทำงาน · ระบบจะเตือนเมื่อถึงรอบ</div>
            </div>
            <div className="card-act">
              <button className="btn sm accent" onClick={onAddDCA}>
                <Ico name="plus" size={13}/> ตั้ง DCA ใหม่
              </button>
            </div>
          </div>
          <div className="dca-list">
            {dcaList.length === 0 && (
              <div style={{padding:"24px 8px", textAlign:"center", color:"var(--muted)", fontSize:13}}>
                ยังไม่มีตาราง DCA — ลองตั้งซื้ออัตโนมัติเพื่อทยอยลงทุน
              </div>
            )}
            {dcaList.map(d => {
              const daysLeft = d.nextDate ? window.daysBetween(window.todayISO(), d.nextDate) : null;
              const freqLabel = { daily: "วัน", weekly: "สัปดาห์", biweekly: "2 สัปดาห์", monthly: "เดือน" }[d.freq] || d.freq;
              return (
                <div className="dca-item" key={d.id}>
                  <AssetIcon ticker={d.ticker} classKey={d.classKey} size={30}/>
                  <div>
                    <div className="ticker">{d.ticker}</div>
                    <div className="schedule">
                      ทุก{freqLabel} · ทำไปแล้ว <b className="num">{d.executedCount}</b> ครั้ง
                    </div>
                    <div className="next-in">
                      ⏱ ครั้งถัดไป {daysLeft != null ? (daysLeft <= 0 ? "ถึงรอบแล้ว!" : `อีก ${daysLeft} วัน`) : "—"}
                    </div>
                  </div>
                  <div>
                    <div className="amount">
                      {d.ccy === "THB" ? "฿" : "$"}{fmtNum(d.amount, 0)}
                    </div>
                    <div style={{fontSize:11, color:"var(--muted)", textAlign:"right", marginTop:2}}>
                      /{freqLabel}
                    </div>
                  </div>
                  <Menu items={[
                    { label: d.paused ? "เริ่มทำงานต่อ" : "หยุดชั่วคราว",
                      icon: "pause",
                      onClick: () => window.updateDCA(d.id, { paused: !d.paused }) },
                    { label: "บันทึก DCA วันนี้",
                      icon: "plus",
                      onClick: () => window.executeDCA(d.id) },
                    { sep: true },
                    { label: "ลบตาราง DCA", icon: "trash", danger: true,
                      onClick: () => askConfirm({
                        title: `หยุดและลบ DCA สำหรับ ${d.ticker}?`,
                        body: `ตารางลงทุนอัตโนมัติ ${d.ccy === "THB" ? "฿" : "$"}${fmtNum(d.amount, 0)} ทุก${freqLabel} จะถูกยกเลิก`,
                        confirmLabel: "ลบ DCA",
                        onConfirm: () => window.removeDCA(d.id)
                      })
                    },
                  ]}/>
                </div>
              );
            })}
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
          <PLBars holdings={holdings} ccy={ccy} FX={FX}/>
        </div>
      </section>

      {/* ===== Earn + Bench ===== */}
      <section className="row-2">
        <EarnPanel ccy={ccy} positions={earnList} FX={FX} holdings={allHoldings} askConfirm={askConfirm} onAdd={onAddEarn}/>
        <BenchmarkCard benchmarks={benchmarks}/>
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
  if (holdings.length === 0) {
    return <div style={{padding:"20px", textAlign:"center", color:"var(--muted)", fontSize:12}}>
      ยังไม่มีข้อมูล
    </div>;
  }
  const rows = holdings.map(h => {
    const plNative = h.qty * (h.price - h.costAvg);
    const plTHB = h.ccy === "THB" ? plNative : plNative * FX;
    const plDisp = ccy === "THB" ? plTHB : plTHB / FX;
    return { ticker: h.ticker, plDisp, classKey: h.classKey };
  }).sort((a,b) => Math.abs(b.plDisp) - Math.abs(a.plDisp));

  const maxAbs = Math.max(...rows.map(r => Math.abs(r.plDisp)), 1);

  return (
    <div className="pl-bars">
      {rows.map(r => {
        const w = Math.abs(r.plDisp) / maxAbs * 48;
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

function EarnPanel({ ccy, positions, FX, holdings, askConfirm, onAdd }) {
  const [apy, setApy] = React.useState(15);

  // ── Real-time tick (every second) ──
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

  // ── Get live price for a symbol ──
  const getPrice = (sym) => {
    const h = (holdings || []).find(x => x.ticker === sym);
    if (h) return h.price;
    if (sym === "USDT" || sym === "USDC" || sym === "BUSD") return 1;
    return 0;
  };

  // ── Compute real-time earned today for a position (in USD) ──
  const calcEarnedTodayUSD = (p) => {
    const dailyNative = p.qty * (p.apy / 100) / 365;
    const earnedNative = dailyNative * (secNow / 86400);
    const price = getPrice(p.sym);
    return price > 0 ? earnedNative * price : earnedNative; // fallback: treat as USD
  };
  const calcEarnedUSDForSeconds = (p, seconds) => {
    const earnedNative = p.qty * (p.apy / 100) * (Math.max(0, seconds) / (365 * 24 * 60 * 60));
    const price = getPrice(p.sym);
    return price > 0 ? earnedNative * price : earnedNative;
  };
  const storedEarnedUSD = (p) => Number(p.accruedEarnedUSD ?? p.earnedToday ?? 0) || 0;
  const pendingEarnedUSD = (p) => {
    const last = Number(p.accruedEarnedAt) || 0;
    if (!last) return calcEarnedTodayUSD(p);
    return calcEarnedUSDForSeconds(p, (Date.now() - last) / 1000);
  };

  const earnedTodayUSD = positions.reduce((s, p) => s + calcEarnedTodayUSD(p), 0);
  const accumulatedEarnedUSD = positions.reduce((s, p) => s + storedEarnedUSD(p) + pendingEarnedUSD(p), 0);
  const totalUSD = positions.reduce((s, p) => s + p.qty * (getPrice(p.sym) || (p.sym.includes("USD") ? 1 : 0)), 0);
  const totalWithEarnedUSD = totalUSD + accumulatedEarnedUSD;
  const stakedDisp = ccy === "THB" ? totalWithEarnedUSD * FX : totalWithEarnedUSD;
  const earnedTodayDisp = ccy === "THB" ? earnedTodayUSD * FX : earnedTodayUSD;
  const accumulatedEarnedDisp = ccy === "THB" ? accumulatedEarnedUSD * FX : accumulatedEarnedUSD;

  const usdtPos = positions.find(p => p.sym === "USDT");
  const usdtBal = usdtPos ? usdtPos.qty : 0;
  const projAnnualUSD = usdtBal * (apy / 100);
  const projDailyUSD = projAnnualUSD / 365;
  const projDisp = ccy === "THB" ? projAnnualUSD * FX : projAnnualUSD;
  const projDailyDisp = ccy === "THB" ? projDailyUSD * FX : projDailyUSD;
  const ccySym = ccy === "THB" ? "฿" : "$";

  return (
    <div className="card earn">
      <div className="card-head">
        <div>
          <div className="card-title">💰 Earn — สร้างผลตอบแทนจากสินทรัพย์</div>
          <div className="card-sub">รวมยอดที่กำลังสร้างดอกเบี้ย · ดอกเบี้ยทบต้นรายวัน</div>
        </div>
        <div className="card-act">
          <button className="btn sm accent" onClick={onAdd}>
            <Ico name="plus" size={13}/> เพิ่มเหรียญ
          </button>
        </div>
      </div>

      <div className="earn-grid">
        <div>
          <div style={{fontSize:12, color:"var(--muted)"}}>ยอดรวมที่กำลัง Earn</div>
          <div className="earn-amt">
            {ccySym}{ccy === "THB" ? Math.round(stakedDisp).toLocaleString() : fmtNum(stakedDisp, 2)}
            <span className="ccy">{ccy}</span>
          </div>
          <div style={{fontSize:12, color:"var(--up)", marginTop:2, fontFamily:"var(--font-num)", fontWeight:700}}>
            {"\u0E23\u0E27\u0E21\u0E14\u0E2D\u0E01\u0E40\u0E1A\u0E35\u0E49\u0E22\u0E2A\u0E30\u0E2A\u0E21"} +{ccySym}{ccy === "THB" ? fmtNum(accumulatedEarnedDisp, 2) : fmtNum(accumulatedEarnedDisp, 4)}
          </div>
          {/* Real-time earned today — pulses every second */}
          <div style={{fontSize:13, color:"var(--up)", marginTop:6, fontFamily:"var(--font-num)", fontWeight:700, display:"flex", alignItems:"center", gap:6}}>
            <span style={{width:7, height:7, borderRadius:"50%", background:"var(--up)", display:"inline-block", animation:"pulse 1.4s ease-in-out infinite"}}/>
            +{ccySym}{ccy === "THB" ? fmtNum(earnedTodayDisp, 2) : fmtNum(earnedTodayDisp, 4)} วันนี้
          </div>
          <div className="earn-rows">
            {positions.length === 0 && (
              <div style={{padding:"14px 8px", color:"var(--muted)", fontSize:12, textAlign:"center"}}>
                ยังไม่มีสินทรัพย์ที่ฝากใน Earn —{" "}
                <button className="btn-link" onClick={onAdd} style={{color:"var(--accent-ink)", background:"none", border:"none", cursor:"pointer", fontSize:12, padding:0}}>
                  เพิ่มเลย
                </button>
              </div>
            )}
            {positions.map(p => {
              const earnedNativeToday = p.qty * (p.apy / 100) / 365 * (secNow / 86400);
              const earnedUSD = calcEarnedTodayUSD(p);
              const earnedDisp = ccy === "THB" ? earnedUSD * FX : earnedUSD;
              const isLocked = p.kind && p.kind.includes("ล็อก");
              return (
                <div className="earn-row" key={p.id || p.sym}>
                  <div style={{flex:1, minWidth:0}}>
                    <div style={{display:"flex", alignItems:"center", gap:6}}>
                      <span className="sym">{p.sym}</span>
                      <span style={{color:"var(--muted)", fontSize:10}}>
                        {isLocked && <Ico name="lock" size={10}/>} {p.kind}
                      </span>
                    </div>
                    <div style={{fontSize:11, color:"var(--muted)", marginTop:2}}>
                      {p.qty.toLocaleString("en-US", { maximumFractionDigits: 4 })} {p.sym}
                    </div>
                  </div>
                  <div style={{textAlign:"right", minWidth:0}}>
                    <div className="apy">{p.apy.toFixed(2)}%</div>
                    <div style={{fontSize:11, color:"var(--up)", fontFamily:"var(--font-num)", fontWeight:600, marginTop:2}}>
                      +{earnedNativeToday.toFixed(6)} {p.sym}
                      <span style={{color:"var(--muted)", fontWeight:400}}> ({ccySym}{fmtNum(earnedDisp, ccy === "THB" ? 2 : 4)})</span>
                    </div>
                  </div>
                  <Menu items={[
                    { label: "ปิดบัญชี Earn", icon: "trash", danger: true,
                      onClick: () => askConfirm({
                        title: `ปิดบัญชี Earn ${p.sym}?`,
                        body: `${p.qty.toLocaleString("en-US", {maximumFractionDigits:4})} ${p.sym} จะถูกถอนกลับ`,
                        confirmLabel: "ปิดบัญชี",
                        onConfirm: () => window.removeEarn(p.id || p.sym)
                      })
                    },
                  ]}/>
                </div>
              );
            })}
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
        </div>
      </div>
    </div>
  );
}

function BenchmarkCard({ benchmarks }) {
  const max = Math.max(...benchmarks.map(b => Math.abs(b.ytd)), 1);
  return (
    <div className="card">
      <div className="card-head">
        <div>
          <div className="card-title">เปรียบเทียบผลตอบแทน YTD</div>
          <div className="card-sub">พอร์ตของคุณ vs ดัชนีอ้างอิง</div>
        </div>
      </div>
      <div className="bench">
        {benchmarks.map(b => {
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

window.Dashboard = Dashboard;
