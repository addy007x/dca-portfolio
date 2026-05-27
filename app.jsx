// Root App — store-backed, live prices, modals, reminders

const ACCENT_PRESETS = {
  mint:    { name: "Mint",    accent: "oklch(0.72 0.08 175)", ink: "oklch(0.38 0.06 175)", soft: "oklch(0.94 0.03 175)" },
  coral:   { name: "Coral",   accent: "oklch(0.72 0.12 35)",  ink: "oklch(0.40 0.10 35)",  soft: "oklch(0.95 0.03 35)" },
  ocean:   { name: "Ocean",   accent: "oklch(0.62 0.13 245)", ink: "oklch(0.38 0.10 245)", soft: "oklch(0.94 0.03 245)" },
  saffron: { name: "Saffron", accent: "oklch(0.74 0.13 75)",  ink: "oklch(0.42 0.10 75)",  soft: "oklch(0.95 0.04 75)" },
  orchid:  { name: "Orchid",  accent: "oklch(0.66 0.13 320)", ink: "oklch(0.40 0.10 320)", soft: "oklch(0.95 0.03 320)" },
};

function applyAccent(key) {
  const a = ACCENT_PRESETS[key] || ACCENT_PRESETS.mint;
  const r = document.documentElement.style;
  r.setProperty("--accent", a.accent);
  r.setProperty("--accent-ink", a.ink);
  r.setProperty("--accent-soft", a.soft);
}

function App() {
  const store = useStore();
  const s = store.settings;
  const [view, setView] = React.useState({ kind: "dashboard", asset: null });
  const [showHoldingModal, setShowHoldingModal] = React.useState(false);
  const [showTxModal, setShowTxModal] = React.useState(false);
  const [showDcaModal, setShowDcaModal] = React.useState(false);
  const [editHolding, setEditHolding] = React.useState(null);

  // Apply theme/density/accent
  React.useEffect(() => {
    document.documentElement.dataset.density = s.density;
    document.documentElement.dataset.theme = s.theme;
    applyAccent(s.accent);
  }, [s.density, s.theme, s.accent]);

  // Live price feed — refreshes every 60s
  const priceStatus = useLivePrices(store.holdings, 60000);

  const onOpenAsset = (asset) => {
    setView({ kind: "detail", asset });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const onBack = () => setView({ kind: "dashboard", asset: null });

  const activeNav = view.kind === "dashboard" ? "dashboard" : "portfolio";

  // Find current asset state (may have changed since opening detail)
  const currentAsset = view.kind === "detail" && view.asset
    ? store.holdings.find(h => h.id === view.asset.id) || view.asset
    : null;

  return (
    <>
      <div className="app" data-screen-label={view.kind === "dashboard" ? "01 Dashboard" : "02 Asset Detail"}>
        <Sidebar active={activeNav}
                 onNav={(k) => { if (k === "dashboard") onBack(); }}/>
        <main className="main">
          <Topbar ccy={s.ccy}
                  onCcy={(c) => window.updateSettings({ ccy: c })}
                  onAdd={() => setShowTxModal(true)}
                  priceStatus={priceStatus}/>

          {view.kind === "dashboard" && <DCAReminderBanner/>}

          {view.kind === "dashboard"
            ? <Dashboard ccy={s.ccy}
                         onOpenAsset={onOpenAsset}
                         onAddHolding={() => { setEditHolding(null); setShowHoldingModal(true); }}
                         onAddTx={() => setShowTxModal(true)}
                         onAddDCA={() => setShowDcaModal(true)}
                         onEditHolding={(h) => { setEditHolding(h); setShowHoldingModal(true); }}
                         accent={`var(--accent)`}/>
            : <Detail asset={currentAsset} ccy={s.ccy} onBack={onBack}
                      onAddTx={() => setShowTxModal(true)}
                      accent={`var(--accent)`}/>
          }
        </main>
      </div>

      <HoldingModal open={showHoldingModal}
                    holding={editHolding}
                    onClose={() => setShowHoldingModal(false)}
                    onSave={(data) => {
                      if (editHolding) {
                        window.updateHolding(editHolding.id, data);
                      } else {
                        window.addHolding(data);
                      }
                    }}/>

      <TransactionModal open={showTxModal}
                        holdings={store.holdings}
                        defaultTicker={view.kind === "detail" && currentAsset ? currentAsset.ticker : null}
                        onClose={() => setShowTxModal(false)}
                        onSave={(tx) => window.addTransaction(tx)}/>

      <DCAModal open={showDcaModal}
                holdings={store.holdings}
                onClose={() => setShowDcaModal(false)}
                onSave={(dca) => window.addDCA(dca)}/>

      <TweaksPanel title="Settings">
        <TweakSection label="แสดงผล">
          <TweakRadio label="ธีม"
                      value={s.theme}
                      options={[{value:"light", label:"สว่าง"},{value:"dark", label:"มืด"}]}
                      onChange={v => window.updateSettings({theme: v})}/>
          <TweakRadio label="ความหนาแน่น"
                      value={s.density}
                      options={[{value:"comfortable", label:"สบาย"},{value:"compact", label:"กระชับ"}]}
                      onChange={v => window.updateSettings({density: v})}/>
          <AccentSwatches value={s.accent} onChange={v => window.updateSettings({accent: v})}/>
        </TweakSection>

        <TweakSection label="สกุลเงิน">
          <TweakRadio label="แสดงในสกุล"
                      value={s.ccy}
                      options={[{value:"THB", label:"฿ THB"},{value:"USD", label:"$ USD"}]}
                      onChange={v => window.updateSettings({ccy: v})}/>
        </TweakSection>

        <TweakSection label="แจ้งเตือน DCA">
          <NotifPermissionButton/>
        </TweakSection>

        <TweakSection label="ข้อมูล">
          <div className="twk-action-row">
            <button className="twk-btn secondary" onClick={() => exportPortfolio()}>
              ส่งออก JSON
            </button>
            <button className="twk-btn secondary" onClick={() => importPortfolio()}>
              นำเข้า JSON
            </button>
          </div>
          <button className="twk-btn secondary" style={{marginTop:6}}
                  onClick={() => priceStatus.refresh()}>
            {priceStatus.loading ? "กำลังโหลด..." : "รีเฟรชราคา"}
          </button>
          <button className="twk-btn secondary" style={{marginTop:6, color:"var(--down)"}}
                  onClick={() => {
                    if (confirm("รีเซ็ตเป็นข้อมูลตัวอย่าง? ข้อมูลทั้งหมดในเครื่องจะถูกแทนที่")) {
                      window.resetToSeed();
                    }
                  }}>
            รีเซ็ตเป็นข้อมูลตัวอย่าง
          </button>
        </TweakSection>
      </TweaksPanel>
    </>
  );
}

// ─────── Custom accent swatches ───────
function AccentSwatches({ value, onChange }) {
  return (
    <div className="twk-row">
      <div className="twk-lbl"><span>สีหลัก</span></div>
      <div style={{display:"flex", gap:6, flexWrap:"wrap"}}>
        {Object.entries(ACCENT_PRESETS).map(([key, a]) => (
          <button key={key}
                  onClick={() => onChange(key)}
                  title={a.name}
                  style={{
                    width: 26, height: 26, borderRadius: 8,
                    border: value === key ? "2.5px solid var(--tk-ink, #111)" : "1px solid rgba(0,0,0,0.12)",
                    background: a.accent,
                    cursor: "pointer",
                    padding: 0,
                    boxShadow: value === key ? "0 0 0 2px white inset" : "none",
                  }}
                  aria-label={a.name}/>
        ))}
      </div>
    </div>
  );
}

// ─────── Export / Import ───────
function exportPortfolio() {
  const json = window.exportJSON();
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `siamfolio-${window.todayISO()}.json`;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 200);
}

function importPortfolio() {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = "application/json,.json";
  input.onchange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target.result;
      if (!confirm(`นำเข้าไฟล์ ${file.name}? ข้อมูลปัจจุบันจะถูกแทนที่ทั้งหมด`)) return;
      const ok = window.importJSON(text);
      if (ok) alert("นำเข้าสำเร็จ ✓");
      else alert("ไฟล์ไม่ถูกต้อง — กรุณาตรวจสอบ");
    };
    reader.readAsText(file);
  };
  input.click();
}

ReactDOM.createRoot(document.getElementById("root")).render(<App/>);
