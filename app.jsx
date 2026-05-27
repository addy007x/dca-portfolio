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
  const [showEarnModal, setShowEarnModal] = React.useState(false);
  const [editHolding, setEditHolding] = React.useState(null);
  const [editDCA, setEditDCA] = React.useState(null);
  const [searchQuery, setSearchQuery] = React.useState("");

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

  const navKinds = ["dashboard","portfolio","dca","earn","history","tax","bench"];
  const activeNav = navKinds.includes(view.kind) ? view.kind : (view.kind === "detail" ? "portfolio" : "dashboard");

  // Find current asset state (may have changed since opening detail)
  const currentAsset = view.kind === "detail" && view.asset
    ? store.holdings.find(h => h.id === view.asset.id) || view.asset
    : null;

  const goTo = (k) => { setView({ kind: k, asset: null }); window.scrollTo({ top: 0, behavior: "smooth" }); };

  const openDcaModal = () => { setEditDCA(null); setShowDcaModal(true); };
  const openEditDCA = (d) => { setEditDCA(d); setShowDcaModal(true); };

  return (
    <>
      <div className="app">
        <Sidebar active={activeNav}
                 onNav={(k) => goTo(k === "portfolio" ? "dashboard" : k)}
                 dcaDueCount={store.dca.filter(d => !d.paused && d.nextDate && d.nextDate <= window.todayISO()).length}/>
        <main className="main">
          <Topbar ccy={s.ccy}
                  onCcy={(c) => window.updateSettings({ ccy: c })}
                  onAdd={() => setShowTxModal(true)}
                  priceStatus={priceStatus}
                  onSettings={() => window.postMessage({ type: '__activate_edit_mode' }, '*')}
                  searchQuery={searchQuery}
                  onSearch={setSearchQuery}/>

          {(view.kind === "dashboard" || view.kind === "portfolio") && <DCAReminderBanner/>}

          {view.kind === "detail"
            ? <Detail asset={currentAsset} ccy={s.ccy} onBack={() => goTo("dashboard")}
                      onAddTx={() => setShowTxModal(true)}
                      accent={`var(--accent)`}/>
            : view.kind === "dca"
            ? <DCAView ccy={s.ccy} onAddDCA={openDcaModal} onEditDCA={openEditDCA}/>
            : view.kind === "earn"
            ? <EarnView ccy={s.ccy} onAddEarn={() => setShowEarnModal(true)}/>
            : view.kind === "history"
            ? <HistoryView ccy={s.ccy}/>
            : <Dashboard ccy={s.ccy}
                         onOpenAsset={onOpenAsset}
                         onAddHolding={() => { setEditHolding(null); setShowHoldingModal(true); }}
                         onAddTx={() => setShowTxModal(true)}
                         onAddDCA={openDcaModal}
                         onAddEarn={() => setShowEarnModal(true)}
                         onEditHolding={(h) => { setEditHolding(h); setShowHoldingModal(true); }}
                         accent={`var(--accent)`}
                         searchQuery={searchQuery}/>
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

      <EarnModal open={showEarnModal}
                 holdings={store.holdings}
                 onClose={() => setShowEarnModal(false)}
                 onSave={(e) => window.addEarn(e)}/>

      <DCAModal open={showDcaModal}
                holdings={store.holdings}
                editDCA={editDCA}
                onClose={() => { setShowDcaModal(false); setEditDCA(null); }}
                onSave={(dca) => {
                  if (editDCA) window.updateDCA(editDCA.id, dca);
                  else window.addDCA(dca);
                }}/>

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

        <TweakSection label="Backend (Phase B)">
          <BackendConfigPanel/>
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

// ─────── Backend config panel (Tweaks > Backend) ───────
function BackendConfigPanel() {
  const current = window.useBackendStatus();
  const [url, setUrl] = React.useState(current?.url || "");
  const [key, setKey] = React.useState(current?.key || "");
  const [status, setStatus] = React.useState(null); // null | 'testing' | 'ok' | 'error:msg'
  const [syncMsg, setSyncMsg] = React.useState("");

  React.useEffect(() => {
    if (current) { setUrl(current.url); setKey(current.key); }
  }, [current]);

  React.useEffect(() => {
    const onSync = (e) => {
      if (e.detail?.ok) setSyncMsg(`✓ sync ${new Date().toLocaleTimeString("th-TH")}`);
      else setSyncMsg(`✗ ${e.detail?.error || "sync failed"}`);
    };
    window.addEventListener("siamfolio.sync", onSync);
    return () => window.removeEventListener("siamfolio.sync", onSync);
  }, []);

  const test = async () => {
    setStatus("testing");
    const ping = await window.pingBackend(url);
    if (!ping.ok) { setStatus("error:ping failed (" + (ping.error || ping.status) + ")"); return; }
    const auth = await window.testBackendAuth(url, key);
    if (!auth) { setStatus("error:API key invalid"); return; }
    setStatus("ok");
  };

  const connect = () => {
    if (!url || !key) return;
    window.setBackendConfig({ url, key });
    setStatus("ok");
  };

  const disconnect = () => {
    if (!confirm("ตัดการเชื่อมต่อ backend? ข้อมูลใน localStorage จะยังคงอยู่")) return;
    window.setBackendConfig(null);
    setStatus(null);
  };

  const pull = async () => {
    if (!confirm("ดึงข้อมูลจาก backend มาแทนที่ในเครื่อง?")) return;
    try {
      const data = await window.pullPortfolio();
      window.updateStore(s => ({
        ...s,
        holdings: data.holdings || s.holdings,
        transactions: data.transactions || s.transactions,
        dca: data.dca || s.dca,
        earn: data.earn || s.earn,
      }));
      setSyncMsg("✓ ดึงข้อมูลสำเร็จ");
    } catch (e) { setSyncMsg("✗ " + e.message); }
  };

  const push = async () => {
    try {
      await window.pushPortfolio();
      setSyncMsg("✓ อัพโหลดสำเร็จ");
    } catch (e) { setSyncMsg("✗ " + e.message); }
  };

  return (
    <div style={{display:"flex", flexDirection:"column", gap:6}}>
      {current ? (
        <>
          <div style={{fontSize:11, color:"var(--up)", fontWeight:600}}>
            ✓ เชื่อมต่อกับ {new URL(current.url).hostname}
          </div>
          {syncMsg && <div style={{fontSize:10, color:"var(--muted)"}}>{syncMsg}</div>}
          <div className="twk-action-row" style={{marginTop:4}}>
            <button className="twk-btn secondary" onClick={pull}>ดึงข้อมูล</button>
            <button className="twk-btn secondary" onClick={push}>อัพโหลด</button>
          </div>
          <button className="twk-btn secondary" style={{marginTop:4, color:"var(--down)"}}
                  onClick={disconnect}>ตัดการเชื่อมต่อ</button>
        </>
      ) : (
        <>
          <input className="twk-field" type="text" placeholder="https://siamfolio-api.your.workers.dev"
                 value={url} onChange={e => setUrl(e.target.value)}/>
          <input className="twk-field" type="password" placeholder="API Key"
                 value={key} onChange={e => setKey(e.target.value)}/>
          <div className="twk-action-row" style={{marginTop:4}}>
            <button className="twk-btn secondary" onClick={test}>ทดสอบ</button>
            <button className="twk-btn" onClick={connect} disabled={!url || !key}>เชื่อมต่อ</button>
          </div>
          {status === "testing" && <div style={{fontSize:10, color:"var(--muted)"}}>กำลังทดสอบ...</div>}
          {status === "ok" && <div style={{fontSize:10, color:"var(--up)"}}>✓ พร้อมเชื่อมต่อ</div>}
          {status?.startsWith("error:") && <div style={{fontSize:10, color:"var(--down)"}}>✗ {status.slice(6)}</div>}
          <a href="https://github.com/addy007x/dca-portfolio/blob/main/backend/README.md"
             target="_blank" rel="noopener"
             style={{fontSize:10, color:"var(--accent-ink)", textDecoration:"none", marginTop:2}}>
            ↗ วิธี deploy backend
          </a>
        </>
      )}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App/>);
