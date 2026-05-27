// Portfolio Detail view — opened when clicking a holding

function Detail({ asset, ccy, onBack, accent }) {
  const M = window.MOCK;
  const [tx, setTx] = React.useState(() => M.TX_NVDA);
  const [confirm, setConfirm] = React.useState(null);
  if (!asset) return null;

  const askConfirm = (cfg) => setConfirm(cfg);
  const closeConfirm = () => setConfirm(null);
  const doConfirm = () => { if (confirm?.onConfirm) confirm.onConfirm(); setConfirm(null); };

  const mvNative = asset.qty * asset.price;
  const costNative = asset.qty * asset.costAvg;
  const plNative = mvNative - costNative;
  const plPct = (plNative / costNative) * 100;
  const mvTHB = asset.ccy === "THB" ? mvNative : mvNative * M.FX;
  const mvDisp = ccy === "THB" ? mvTHB : mvTHB / M.FX;
  const plTHB = asset.ccy === "THB" ? plNative : plNative * M.FX;
  const plDisp = ccy === "THB" ? plTHB : plTHB / M.FX;
  const ccySym = ccy === "THB" ? "฿" : "$";
  const nativeSym = asset.ccy === "THB" ? "฿" : "$";

  const classLabel = { us:"หุ้นสหรัฐ", th:"หุ้นไทย (SET)", crypto:"คริปโตเคอเรนซี", gold:"ทองคำดิจิทัล" }[asset.classKey];

  // Generate detail history line
  const baseHist = M.PORTFOLIO_HISTORY["6M"];
  const minH = Math.min(...baseHist), maxH = Math.max(...baseHist);
  // normalize and scale around asset price
  const normHist = baseHist.map((v, i) => {
    const p = (v - minH) / (maxH - minH);
    // create a trajectory ending at current price, starting near costAvg
    return asset.costAvg + (asset.price - asset.costAvg) * p
           + (Math.sin(i / 9) * asset.price * 0.02);
  });
  const histDisp = normHist.map(v => ccy === asset.ccy ? v : (asset.ccy === "USD" ? v * M.FX : v / M.FX));

  // DCA stats for this asset (if scheduled)
  const sched = M.DCA_SCHEDULES.find(d => d.ticker === asset.ticker);

  return (
    <div className="detail-wrap">
      <button className="detail-back" onClick={onBack}>
        <Ico name="back" size={16}/> กลับสู่หน้าหลัก
      </button>

      <div className="detail-head">
        <div className={`asset-logo ${asset.classKey}`}>
          {asset.classKey === "gold" ? "Au" : asset.ticker.slice(0,2)}
        </div>
        <div style={{flex:1, minWidth:0}}>
          <div style={{display:"flex", alignItems:"center", gap:10}}>
            <h2>{asset.ticker}</h2>
            <span className="tag">{classLabel}</span>
            <span className="tag">{asset.ccy}</span>
          </div>
          <div className="co">{asset.name}</div>
        </div>
        <div style={{display:"flex", gap:8}}>
          <button className="btn"><Ico name="swap" size={14}/> ขาย</button>
          <button className="btn accent"><Ico name="plus" size={14}/> ซื้อเพิ่ม</button>
          <Menu items={[
            { label: "แก้ไขต้นทุนเฉลี่ย", icon: "edit", onClick: () => {} },
            { label: "ตั้งการแจ้งเตือนราคา", icon: "bell", onClick: () => {} },
            { sep: true },
            { label: "ลบสินทรัพย์ทั้งหมด", icon: "trash", danger: true,
              onClick: () => askConfirm({
                title: `ลบ ${asset.ticker} ออกจากพอร์ต?`,
                body: `${asset.name} จำนวน ${asset.qty.toLocaleString("en-US", {maximumFractionDigits:4})} หน่วย พร้อมประวัติธุรกรรมทั้งหมด ${tx.length} รายการ จะถูกลบถาวร — กระทบการคำนวณภาษีย้อนหลัง การดำเนินการนี้ไม่สามารถยกเลิกได้`,
                requireType: asset.ticker,
                confirmLabel: "ลบสินทรัพย์",
                onConfirm: () => { onBack(); /* in real app, also remove from portfolio */ }
              })
            },
          ]}/>
        </div>
      </div>

      {/* Stats */}
      <div className="detail-stats">
        <div className="stat-cell">
          <div className="l">ราคาปัจจุบัน</div>
          <div className="v num">{nativeSym}{fmtNum(asset.price, 2)}</div>
          <div className={`d ${asset.chg1d >= 0 ? "up" : "down"}`}>{fmtPct(asset.chg1d)} วันนี้</div>
        </div>
        <div className="stat-cell">
          <div className="l">จำนวนที่ถือ</div>
          <div className="v num">{asset.qty.toLocaleString("en-US", { maximumFractionDigits: 4 })}</div>
          <div className="d" style={{color:"var(--muted)"}}>
            มูลค่า {ccySym}{ccy === "THB" ? Math.round(mvDisp).toLocaleString() : fmtNum(mvDisp, 2)}
          </div>
        </div>
        <div className="stat-cell">
          <div className="l">ต้นทุนเฉลี่ย</div>
          <div className="v num">{nativeSym}{fmtNum(asset.costAvg, 2)}</div>
          <div className="d" style={{color:"var(--muted)"}}>
            รวม {ccySym}{ccy === "THB" ? Math.round(ccy === "THB" ? (asset.ccy === "THB" ? costNative : costNative * M.FX) : costNative).toLocaleString() : fmtNum(asset.ccy === "USD" ? costNative : costNative / M.FX, 2)}
          </div>
        </div>
        <div className="stat-cell">
          <div className="l">กำไร/ขาดทุน</div>
          <div className="v num" style={{color: plDisp >= 0 ? "var(--up)" : "var(--down)"}}>
            {plDisp >= 0 ? "+" : "−"}{ccySym}{ccy === "THB" ? Math.round(Math.abs(plDisp)).toLocaleString() : fmtNum(Math.abs(plDisp), 2)}
          </div>
          <div className={`d ${plDisp >= 0 ? "up" : "down"}`}>{fmtPct(plPct)}</div>
        </div>
      </div>

      {/* Chart + DCA panel */}
      <div className="row-2">
        <div className="card">
          <div className="card-head">
            <div>
              <div className="card-title">ราคา & ต้นทุนเฉลี่ย</div>
              <div className="card-sub">6 เดือนล่าสุด · เส้นแนวนอน = ต้นทุนของคุณ</div>
            </div>
            <div className="card-act">
              <div className="range-tabs">
                {["1M","3M","6M","1Y"].map(r => (
                  <button key={r} className={r === "6M" ? "is-on" : ""}>{r}</button>
                ))}
              </div>
            </div>
          </div>
          <LineChart data={histDisp} height={240} accent={accent}/>
          <div style={{fontSize:12, color:"var(--muted)", marginTop:8, display:"flex", gap:16}}>
            <span><span style={{display:"inline-block", width:14, borderTop:"2px solid var(--accent)", verticalAlign:"middle", marginRight:6}}></span>ราคาตลาด</span>
            <span><span style={{display:"inline-block", width:14, borderTop:"2px dashed var(--muted)", verticalAlign:"middle", marginRight:6}}></span>ต้นทุนเฉลี่ย {nativeSym}{fmtNum(asset.costAvg, 2)}</span>
          </div>
        </div>

        <div className="card tint">
          <div className="card-head">
            <div>
              <div className="card-title">DCA สำหรับ {asset.ticker}</div>
              <div className="card-sub">{sched ? "กำลังทำงาน" : "ยังไม่ได้ตั้ง"}</div>
            </div>
          </div>

          {sched ? (
            <>
              <div style={{display:"flex", alignItems:"baseline", gap:8, marginTop:4}}>
                <div className="num" style={{fontSize:32, fontWeight:700, letterSpacing:"-0.02em"}}>
                  {sched.ccy === "THB" ? "฿" : "$"}{fmtNum(sched.amount, 0)}
                </div>
                <div style={{color:"var(--muted)", fontSize:13}}>ทุก{sched.freq}</div>
              </div>
              <div style={{fontSize:12, color:"var(--muted)", marginTop:2}}>
                เริ่มเมื่อ {sched.since} · ทำมาแล้ว {sched.executed} ครั้ง · ใช้เงินรวม {sched.ccy === "THB" ? "฿" : "$"}{fmtNum(sched.total, 0)}
              </div>

              <div style={{
                marginTop:16, padding:"14px 16px", borderRadius:14,
                background:"var(--surface)", border:"1px solid var(--line)"
              }}>
                <div style={{display:"flex", justifyContent:"space-between", alignItems:"center"}}>
                  <div>
                    <div style={{fontSize:12, color:"var(--muted)"}}>ครั้งถัดไป</div>
                    <div style={{fontWeight:700, marginTop:2}}>{sched.nextIn}</div>
                  </div>
                  <div style={{
                    width:48, height:48, borderRadius:"50%",
                    background:"var(--accent-soft)", color:"var(--accent-ink)",
                    display:"grid", placeItems:"center", fontSize:20
                  }}>⏱</div>
                </div>
              </div>

              <div style={{display:"flex", gap:8, marginTop:14}}>
                <button className="btn sm" style={{flex:1, justifyContent:"center"}}><Ico name="edit" size={13}/> แก้ไข</button>
                <button className="btn sm" style={{flex:1, justifyContent:"center"}}>หยุดชั่วคราว</button>
              </div>
            </>
          ) : (
            <div style={{padding:"20px 0"}}>
              <div style={{fontSize:13, color:"var(--muted)", marginBottom:14}}>
                ยังไม่ได้ตั้ง DCA สำหรับ {asset.ticker} — ลองตั้งซื้ออัตโนมัติเพื่อทยอยลงทุน
              </div>
              <button className="btn accent" style={{width:"100%", justifyContent:"center"}}>
                <Ico name="plus" size={14}/> ตั้ง DCA สำหรับ {asset.ticker}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Transactions */}
      <div className="card">
        <div className="card-head">
          <div>
            <div className="card-title">ประวัติธุรกรรม</div>
            <div className="card-sub">{tx.length} รายการ · ใช้สำหรับคำนวณภาษีแบบ FIFO</div>
          </div>
          <div className="card-act">
            <button className="btn sm ghost">ส่งออก CSV</button>
            <button className="btn sm">ดูทั้งหมด <Ico name="chev-r" size={13}/></button>
          </div>
        </div>
        <div className="tx-list">
          {tx.length === 0 && (
            <div style={{padding:"24px 0", textAlign:"center", color:"var(--muted)", fontSize:13}}>
              ยังไม่มีประวัติธุรกรรมสำหรับ {asset.ticker}
            </div>
          )}
          {tx.map((t, i) => (
            <div className="tx-row" key={i}>
              <div className={`tx-ico ${t.kind}`}>
                {t.kind === "buy" ? "+" : t.kind === "sell" ? "−" : "⟳"}
              </div>
              <div className="tx-meta">
                <div className="t">{t.kind === "buy" ? "ซื้อ" : t.kind === "sell" ? "ขาย" : "DCA อัตโนมัติ"}</div>
                <div className="s">{t.date} · {t.note}</div>
              </div>
              <div className="tx-qty">
                {t.qty >= 0 ? "+" : ""}{t.qty.toLocaleString("en-US", { maximumFractionDigits: 4 })} {asset.ticker === "XAUT" ? "oz" : asset.ticker}
              </div>
              <div className="tx-val" style={{color: t.kind === "sell" ? "var(--down)" : "var(--up)"}}>
                {t.kind === "sell" ? "+" : "−"}${fmtNum(t.valUSD, 2)}
              </div>
              <button className="row-action danger"
                      title="ลบรายการธุรกรรมนี้"
                      onClick={() => askConfirm({
                        title: "ลบรายการธุรกรรมนี้?",
                        body: `${t.kind === "buy" ? "การซื้อ" : t.kind === "sell" ? "การขาย" : "DCA"} ${Math.abs(t.qty)} ${asset.ticker} วันที่ ${t.date} จะถูกลบจากประวัติ ส่งผลกับการคำนวณต้นทุนเฉลี่ยและภาษี FIFO`,
                        confirmLabel: "ลบรายการ",
                        onConfirm: () => setTx(prev => prev.filter((_, idx) => idx !== i))
                      })}>
                <Ico name="x" size={14}/>
              </button>
            </div>
          ))}
        </div>
      </div>

      <ConfirmDialog open={!!confirm}
                     title={confirm?.title}
                     body={confirm?.body}
                     requireType={confirm?.requireType}
                     confirmLabel={confirm?.confirmLabel}
                     onCancel={closeConfirm}
                     onConfirm={doConfirm}/>
    </div>
  );
}

window.Detail = Detail;
