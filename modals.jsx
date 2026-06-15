// SiamFolio Modals — Add/Edit forms for holdings, transactions, DCA
// All use the .modal scrim+card pattern from styles.css

function FormField({ label, hint, children }) {
  return (
    <label className="form-field">
      <span className="form-label">{label}</span>
      {children}
      {hint && <span className="form-hint">{hint}</span>}
    </label>
  );
}

function FormRow({ children }) {
  return <div className="form-row">{children}</div>;
}

// ─────── Add / Edit Holding ───────
function HoldingModal({ open, holding, onClose, onSave }) {
  const isEdit = !!holding;
  const [form, setForm] = React.useState(() => ({
    ticker: holding?.ticker || "",
    name: holding?.name || "",
    classKey: holding?.classKey || "crypto",
    ccy: holding?.ccy || "USD",
    qty: holding?.qty ?? 0,
    costAvg: holding?.costAvg ?? 0,
    price: holding?.price ?? 0,
  }));
  React.useEffect(() => {
    if (open) setForm({
      ticker: holding?.ticker || "",
      name: holding?.name || "",
      classKey: holding?.classKey || "crypto",
      ccy: holding?.ccy || "USD",
      qty: holding?.qty ?? 0,
      costAvg: holding?.costAvg ?? 0,
      price: holding?.price ?? 0,
    });
  }, [open, holding]);

  React.useEffect(() => {
    // Auto-set ccy by class
    if (form.classKey === "th") setForm(f => ({ ...f, ccy: "THB" }));
    else if (form.classKey === "us" || form.classKey === "crypto" || form.classKey === "gold")
      setForm(f => ({ ...f, ccy: "USD" }));
  }, [form.classKey]);

  if (!open) return null;

  const canSave = form.ticker.trim() && form.qty > 0 && form.costAvg > 0;

  const submit = (e) => {
    e?.preventDefault();
    if (!canSave) return;
    onSave({
      ...form,
      ticker: form.ticker.trim().toUpperCase(),
      name: form.name.trim() || form.ticker.trim().toUpperCase(),
      qty: parseFloat(form.qty),
      costAvg: parseFloat(form.costAvg),
      price: parseFloat(form.price) || parseFloat(form.costAvg),
      spark: holding?.spark || [parseFloat(form.costAvg), parseFloat(form.price) || parseFloat(form.costAvg)],
      chg1d: holding?.chg1d ?? 0,
    });
    onClose();
  };

  return (
    <div className="modal-scrim" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <form className="modal modal-form" onSubmit={submit}>
        <div className="modal-ico" style={{background:"var(--accent-soft)", color:"var(--accent-ink)"}}>
          <Ico name={isEdit ? "edit" : "plus"} size={22}/>
        </div>
        <h3>{isEdit ? `แก้ไข ${holding.ticker}` : "เพิ่มสินทรัพย์ใหม่"}</h3>
        <p>{isEdit ? "ปรับจำนวนหรือต้นทุนเฉลี่ย" : "กรอกข้อมูลพื้นฐาน ระบบจะดึงราคาล่าสุดให้อัตโนมัติ"}</p>

        <FormRow>
          <FormField label="ประเภท">
            <select className="form-input" value={form.classKey}
                    onChange={e => setForm({...form, classKey: e.target.value})}
                    disabled={isEdit}>
              <option value="us">หุ้น US</option>
              <option value="th">หุ้นไทย</option>
              <option value="crypto">คริปโต</option>
              <option value="gold">ทองคำ</option>
            </select>
          </FormField>
          <FormField label="สกุลเงิน">
            <select className="form-input" value={form.ccy}
                    onChange={e => setForm({...form, ccy: e.target.value})}>
              <option value="USD">USD</option>
              <option value="THB">THB</option>
            </select>
          </FormField>
        </FormRow>

        <FormRow>
          <FormField label="Ticker" hint="เช่น AAPL, BTC, PTT">
            <input className="form-input" type="text" autoFocus={!isEdit} disabled={isEdit}
                   value={form.ticker} onChange={e => setForm({...form, ticker: e.target.value})}
                   placeholder="AAPL"/>
          </FormField>
          <FormField label="ชื่อบริษัท/สินทรัพย์">
            <input className="form-input" type="text"
                   value={form.name} onChange={e => setForm({...form, name: e.target.value})}
                   placeholder="(จะใช้ ticker ถ้าไม่ระบุ)"/>
          </FormField>
        </FormRow>

        <FormRow>
          <FormField label="จำนวน">
            <input className="form-input num" type="number" min="0" step="any"
                   value={form.qty} onChange={e => setForm({...form, qty: e.target.value})}/>
          </FormField>
          <FormField label={`ต้นทุนเฉลี่ย (${form.ccy})`}>
            <input className="form-input num" type="number" min="0" step="any"
                   value={form.costAvg} onChange={e => setForm({...form, costAvg: e.target.value})}/>
          </FormField>
        </FormRow>

        {(form.classKey === "th" || (form.classKey === "us" && !isEdit)) && (
          <FormField label={`ราคาปัจจุบัน (${form.ccy})`}
                     hint={form.classKey === "th" ? "หุ้นไทยต้องกรอกเอง (ไม่มี API ฟรีรองรับ)" : "ระบบจะดึงราคาล่าสุดให้ ถ้าดึงไม่สำเร็จจะใช้ค่านี้"}>
            <input className="form-input num" type="number" min="0" step="any"
                   value={form.price} onChange={e => setForm({...form, price: e.target.value})}/>
          </FormField>
        )}

        <div className="modal-actions">
          <button type="button" className="btn" onClick={onClose}>ยกเลิก</button>
          <button type="submit" className="btn primary" disabled={!canSave}>
            <Ico name={isEdit ? "edit" : "plus"} size={14}/> {isEdit ? "บันทึก" : "เพิ่มสินทรัพย์"}
          </button>
        </div>
      </form>
    </div>
  );
}

// ─────── Add Transaction ───────
function TransactionModal({ open, defaultTicker, holdings, editTransaction, onClose, onSave }) {
  const isEdit = !!editTransaction;
  const [form, setForm] = React.useState({
    ticker: defaultTicker || "",
    kind: "buy",
    qty: 0,
    pricePerUnit: 0,
    date: window.todayISO(),
    note: "",
  });
  React.useEffect(() => {
    if (open) setForm({
      ticker: editTransaction?.ticker || defaultTicker || holdings[0]?.ticker || "",
      kind: editTransaction?.kind || "buy",
      qty: editTransaction ? Math.abs(editTransaction.qty || 0) : 0,
      pricePerUnit: editTransaction?.pricePerUnit || 0,
      date: editTransaction?.date || window.todayISO(),
      note: editTransaction?.note || "",
    });
  }, [open, defaultTicker, editTransaction]);

  // Auto-fill current price when ticker changes (must be before early return)
  const h = holdings.find(x => x.ticker === form.ticker);
  React.useEffect(() => {
    if (h && form.pricePerUnit === 0) setForm(f => ({...f, pricePerUnit: h.price}));
  }, [form.ticker]);

  if (!open) return null;

  const ccy = h?.ccy || "USD";
  const ccySym = ccy === "THB" ? "฿" : "$";
  const canSave = form.ticker && form.qty > 0 && form.pricePerUnit > 0;

  const submit = (e) => {
    e?.preventDefault();
    if (!canSave) return;
    const qty = parseFloat(form.qty);
    const price = parseFloat(form.pricePerUnit);
    onSave({
      ticker: form.ticker,
      kind: form.kind,
      date: form.date,
      qty: form.kind === "sell" ? -qty : qty,
      pricePerUnit: price,
      valUSD: ccy === "USD" ? qty * price : (qty * price) / (window.getStore().fx || 35.8),
      ccy,
      dcaId: editTransaction?.dcaId || null,
      note: form.note || (form.kind === "buy" ? "ซื้อด้วยตนเอง" : form.kind === "sell" ? "ขายด้วยตนเอง" : "DCA"),
    });
    onClose();
  };

  return (
    <div className="modal-scrim" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <form className="modal modal-form" onSubmit={submit}>
        <div className="modal-ico" style={{background:"var(--up-soft)", color:"var(--up)"}}>
          <Ico name={isEdit ? "edit" : "plus"} size={22}/>
        </div>
        <h3>เพิ่มธุรกรรม</h3>
        <p>บันทึกการซื้อ/ขาย/DCA — ระบบจะคำนวณต้นทุนเฉลี่ยใหม่อัตโนมัติ</p>

        <FormRow>
          <FormField label="ประเภท">
            <select className="form-input" value={form.kind}
                    onChange={e => setForm({...form, kind: e.target.value})}>
              <option value="buy">ซื้อ</option>
              <option value="sell">ขาย</option>
              <option value="dca">DCA</option>
            </select>
          </FormField>
          <FormField label="สินทรัพย์">
            <select className="form-input" value={form.ticker}
                    onChange={e => setForm({...form, ticker: e.target.value, pricePerUnit: 0})}>
              {holdings.length === 0 && <option value="">— ยังไม่มีสินทรัพย์ —</option>}
              {holdings.map(h => (
                <option key={h.id} value={h.ticker}>{h.ticker} — {h.name}</option>
              ))}
            </select>
          </FormField>
        </FormRow>

        <FormRow>
          <FormField label="จำนวน">
            <input className="form-input num" type="number" min="0" step="any"
                   value={form.qty} onChange={e => setForm({...form, qty: e.target.value})}/>
          </FormField>
          <FormField label={`ราคาต่อหน่วย (${ccySym}${ccy})`}>
            <input className="form-input num" type="number" min="0" step="any"
                   value={form.pricePerUnit}
                   onChange={e => setForm({...form, pricePerUnit: e.target.value})}/>
          </FormField>
        </FormRow>

        <FormField label="วันที่">
          <input className="form-input" type="date"
                 value={form.date} onChange={e => setForm({...form, date: e.target.value})}/>
        </FormField>

        <FormField label="บันทึก (ไม่จำเป็น)">
          <input className="form-input" type="text" placeholder="เหตุผลของการซื้อ/ขาย"
                 value={form.note} onChange={e => setForm({...form, note: e.target.value})}/>
        </FormField>

        {form.qty > 0 && form.pricePerUnit > 0 && (
          <div className="form-summary">
            มูลค่ารวม: <b className="num">{ccySym}{(parseFloat(form.qty) * parseFloat(form.pricePerUnit)).toLocaleString("en-US", {minimumFractionDigits:2, maximumFractionDigits:2})}</b>
          </div>
        )}

        <div className="modal-actions">
          <button type="button" className="btn" onClick={onClose}>ยกเลิก</button>
          <button type="submit" className="btn primary" disabled={!canSave}>
            <Ico name="plus" size={14}/> บันทึกธุรกรรม
          </button>
        </div>
      </form>
    </div>
  );
}

// ─────── Add DCA Schedule ───────
function DCAModal({ open, holdings, defaultTicker, editDCA, onClose, onSave }) {
  const isEdit = !!editDCA;
  const [form, setForm] = React.useState({
    ticker: "", amount: 100, freq: "weekly", execTime: "09:00", startDate: "",
  });
  React.useEffect(() => {
    if (open) setForm({
      ticker: editDCA?.ticker || defaultTicker || holdings[0]?.ticker || "",
      amount: editDCA?.amount || 100,
      freq: editDCA?.freq || "weekly",
      execTime: editDCA?.execTime || "09:00",
      startDate: editDCA?.startDate || window.todayISO(),
    });
  }, [open, defaultTicker, editDCA]);

  if (!open) return null;

  const h = holdings.find(x => x.ticker === form.ticker);
  const ccy = h?.ccy || "USD";
  const ccySym = ccy === "THB" ? "฿" : "$";
  const canSave = form.ticker && form.amount > 0;

  const freqLabel = { daily: "วัน", weekly: "สัปดาห์", biweekly: "2 สัปดาห์", monthly: "เดือน" }[form.freq];
  const perYear = { daily: 365, weekly: 52, biweekly: 26, monthly: 12 }[form.freq];
  const annual = form.amount * perYear;

  const submit = (e) => {
    e?.preventDefault();
    if (!canSave) return;
    onSave({
      ticker: form.ticker,
      classKey: h?.classKey || "crypto",
      ccy,
      amount: parseFloat(form.amount),
      freq: form.freq,
      execTime: form.execTime,
      startDate: form.startDate || window.todayISO(),
    });
    onClose();
  };

  return (
    <div className="modal-scrim" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <form className="modal modal-form" onSubmit={submit}>
        <div className="modal-ico" style={{background:"var(--accent-soft)", color:"var(--accent-ink)"}}>
          <Ico name="dca" size={22}/>
        </div>
        <h3>{isEdit ? `แก้ไข DCA ${editDCA.ticker}` : "ตั้ง DCA ใหม่"}</h3>
        <p>ลงทุนอัตโนมัติแบบสม่ำเสมอ — ระบบจะเตือนเมื่อถึงรอบ</p>

        <FormField label="สินทรัพย์">
          <select className="form-input" value={form.ticker} disabled={isEdit}
                  onChange={e => setForm({...form, ticker: e.target.value})}>
            {holdings.length === 0 && <option value="">— เพิ่มสินทรัพย์ก่อน —</option>}
            {holdings.map(h => (
              <option key={h.id} value={h.ticker}>{h.ticker} — {h.name}</option>
            ))}
          </select>
        </FormField>

        <FormRow>
          <FormField label={`จำนวนเงิน (${ccySym}${ccy})`}>
            <input className="form-input num" type="number" min="0" step="any"
                   value={form.amount}
                   onChange={e => setForm({...form, amount: e.target.value})}/>
          </FormField>
          <FormField label="ความถี่">
            <select className="form-input" value={form.freq}
                    onChange={e => setForm({...form, freq: e.target.value})}>
              <option value="daily">ทุกวัน</option>
              <option value="weekly">ทุกสัปดาห์</option>
              <option value="biweekly">ทุก 2 สัปดาห์</option>
              <option value="monthly">ทุกเดือน</option>
            </select>
          </FormField>
        </FormRow>

        <FormRow>
          <FormField label="วันที่เริ่ม" hint="วันแรกที่ DCA จะทำงาน">
            <input className="form-input" type="date"
                   value={form.startDate}
                   onChange={e => setForm({...form, startDate: e.target.value})}/>
          </FormField>
          <FormField label="เวลาที่ต้องการ" hint="UTC+7 (เวลาประเทศไทย)">
            <input className="form-input" type="time"
                   value={form.execTime}
                   onChange={e => setForm({...form, execTime: e.target.value})}/>
          </FormField>
        </FormRow>

        {form.amount > 0 && (
          <div className="form-summary">
            <div>ลงทุน {ccySym}{parseFloat(form.amount).toLocaleString()} ทุก{freqLabel} เวลา <b>{form.execTime} UTC+7</b></div>
            <div style={{color:"var(--muted)", fontSize:12, marginTop:4}}>
              ≈ {ccySym}{annual.toLocaleString()} ต่อปี ({perYear} ครั้ง)
            </div>
          </div>
        )}

        <div className="modal-actions">
          <button type="button" className="btn" onClick={onClose}>ยกเลิก</button>
          <button type="submit" className="btn primary" disabled={!canSave}>
            <Ico name="dca" size={14}/> {isEdit ? "บันทึก" : "ตั้ง DCA"}
          </button>
        </div>
      </form>
    </div>
  );
}

// ─────── Add Earn Position ───────
function EarnModal({ open, holdings, editEarn, onClose, onSave }) {
  const [form, setForm] = React.useState({ sym: "", qty: 0, apy: 0, kind: "ยืดหยุ่น" });
  const isEdit = !!editEarn;
  React.useEffect(() => {
    if (!open) return;
    setForm(editEarn
      ? { sym: editEarn.sym || "", qty: editEarn.qty || 0, apy: editEarn.apy || 0, kind: editEarn.kind || "ยืดหยุ่น" }
      : { sym: holdings[0]?.ticker || "", qty: 0, apy: 0, kind: "ยืดหยุ่น" });
  }, [open, editEarn]);

  if (!open) return null;
  const canSave = form.sym.trim() && form.qty > 0 && form.apy > 0;

  const submit = (e) => {
    e?.preventDefault();
    if (!canSave) return;
    onSave({ sym: form.sym.trim().toUpperCase(), qty: parseFloat(form.qty), apy: parseFloat(form.apy), kind: form.kind });
    onClose();
  };

  const dailyEst = form.qty > 0 && form.apy > 0
    ? (parseFloat(form.qty) * parseFloat(form.apy) / 100 / 365).toFixed(6)
    : null;

  return (
    <div className="modal-scrim" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <form className="modal modal-form" onSubmit={submit}>
        <div className="modal-ico" style={{background:"var(--up-soft)", color:"var(--up)"}}>
          <Ico name="earn" size={22}/>
        </div>
        <h3>{isEdit ? `แก้ไข Earn ${editEarn.sym}` : "เพิ่มสินทรัพย์ใน Earn"}</h3>
        <p>{isEdit ? "ปรับจำนวนที่ฝาก ประเภท และ APY โดยดอกเบี้ยสะสมเดิมยังคงอยู่" : "บันทึกเหรียญที่กำลังสร้างดอกเบี้ย — ระบบจะแสดงรายได้แบบเรียลไทม์"}</p>

        <FormRow>
          <FormField label="สัญลักษณ์ (Symbol)" hint="เช่น BTC, ETH, USDT">
            <input className="form-input" type="text" autoFocus placeholder="USDT"
                   disabled={isEdit}
                   value={form.sym}
                   onChange={e => setForm({...form, sym: e.target.value})}/>
          </FormField>
          <FormField label="ประเภท">
            <select className="form-input" value={form.kind}
                    onChange={e => setForm({...form, kind: e.target.value})}>
              <option value="ยืดหยุ่น">ยืดหยุ่น</option>
              <option value="ล็อก 30 วัน">ล็อก 30 วัน</option>
              <option value="ล็อก 90 วัน">ล็อก 90 วัน</option>
              <option value="สเตก">สเตก (Staking)</option>
            </select>
          </FormField>
        </FormRow>

        <FormRow>
          <FormField label="จำนวนที่ฝาก">
            <input className="form-input num" type="number" min="0" step="any" placeholder="0"
                   value={form.qty} onChange={e => setForm({...form, qty: e.target.value})}/>
          </FormField>
          <FormField label="APY (%)">
            <input className="form-input num" type="number" min="0" max="999" step="0.01" placeholder="0"
                   value={form.apy} onChange={e => setForm({...form, apy: e.target.value})}/>
          </FormField>
        </FormRow>

        {dailyEst && (
          <div className="form-summary">
            <div>ผลตอบแทนโดยประมาณ</div>
            <div style={{display:"flex", gap:16, marginTop:4, flexWrap:"wrap"}}>
              <span>วันละ <b className="num" style={{color:"var(--up)"}}>+{dailyEst} {form.sym.toUpperCase()}</b></span>
              <span style={{color:"var(--muted)"}}>·</span>
              <span>ปีละ <b className="num" style={{color:"var(--up)"}}>+{(parseFloat(form.qty)*parseFloat(form.apy)/100).toFixed(4)} {form.sym.toUpperCase()}</b></span>
            </div>
          </div>
        )}

        <div className="modal-actions">
          <button type="button" className="btn" onClick={onClose}>ยกเลิก</button>
          <button type="submit" className="btn primary" disabled={!canSave}>
            <Ico name={isEdit ? "check" : "plus"} size={14}/> {isEdit ? "บันทึกการแก้ไข" : "เพิ่ม Earn"}
          </button>
        </div>
      </form>
    </div>
  );
}

Object.assign(window, { HoldingModal, TransactionModal, DCAModal, EarnModal });
