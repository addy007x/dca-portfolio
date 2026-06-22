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

const APP_VIEW_KINDS = ["dashboard","portfolio","dca","earn","history","tax","bench"];
const APP_ACTION_KINDS = ["add-tx","settings"];

function hashKind() {
  const raw = decodeURIComponent((location.hash || "").replace(/^#/, "")).split(/[/?&]/)[0];
  return raw;
}

function viewFromHash() {
  const raw = hashKind();
  const kind = APP_VIEW_KINDS.includes(raw) ? raw : "dashboard";
  return { kind, asset: null };
}

function actionFromHash() {
  const raw = hashKind();
  return APP_ACTION_KINDS.includes(raw) ? raw : "";
}

function setRouteHash(kind) {
  const next = "#" + (APP_VIEW_KINDS.includes(kind) ? kind : "dashboard");
  if (location.hash !== next) history.pushState(null, "", next);
}

function MangaPageLoader({ active, title = "Opening Portfolio" }) {
  return (
    <div className={`manga-page-loader ${active ? "is-active" : ""}`} aria-hidden={!active}>
      <div className="manga-load-card" role="status" aria-live="polite">
        <div className="manga-load-emblem" aria-hidden="true"></div>
        <div className="manga-load-kicker">MANGA SYSTEM</div>
        <div className="manga-load-title">{title}</div>
        <div className="manga-load-sub">SYNC DATA / DRAW PANELS / READY</div>
        <div className="manga-load-track"><span></span></div>
      </div>
    </div>
  );
}

function App() {
  const store = useStore();
  const s = store.settings;
  const [view, setView] = React.useState(() => viewFromHash());
  const [showHoldingModal, setShowHoldingModal] = React.useState(false);
  const [showTxModal, setShowTxModal] = React.useState(false);
  const [showDcaModal, setShowDcaModal] = React.useState(false);
  const [showEarnModal, setShowEarnModal] = React.useState(false);
  const [editHolding, setEditHolding] = React.useState(null);
  const [editDCA, setEditDCA] = React.useState(null);
  const [editTx, setEditTx] = React.useState(null);
  const [editEarn, setEditEarn] = React.useState(null);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [appReady, setAppReady] = React.useState(false);

  // Apply theme/density/accent
  React.useEffect(() => {
    document.documentElement.dataset.density = s.density;
    document.documentElement.dataset.theme = s.theme;
    applyAccent(s.accent);
  }, [s.density, s.theme, s.accent]);

  React.useEffect(() => {
    const prefersReducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
    if (prefersReducedMotion) {
      setAppReady(true);
      return;
    }
    const id = window.setTimeout(() => setAppReady(true), 1200);
    return () => window.clearTimeout(id);
  }, []);

  React.useEffect(() => {
    const syncRoute = () => {
      const action = actionFromHash();
      if (action === "add-tx") {
        setView({ kind: "dashboard", asset: null });
        setEditTx(null);
        setShowTxModal(true);
        return;
      }
      if (action === "settings") {
        setView({ kind: "dashboard", asset: null });
        setTimeout(() => window.postMessage({ type: "__activate_edit_mode" }, "*"), 80);
        return;
      }
      setView(viewFromHash());
    };
    syncRoute();
    window.addEventListener("hashchange", syncRoute);
    window.addEventListener("popstate", syncRoute);
    return () => {
      window.removeEventListener("hashchange", syncRoute);
      window.removeEventListener("popstate", syncRoute);
    };
  }, []);

  // Live price feed — refreshes every 60s
  const priceStatus = useLivePrices(store.holdings, 60000);

  const onOpenAsset = (asset) => {
    setView({ kind: "detail", asset });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const onBack = () => goTo("dashboard");

  const navKinds = APP_VIEW_KINDS;
  const activeNav = navKinds.includes(view.kind) ? view.kind : (view.kind === "detail" ? "portfolio" : "dashboard");

  // Find current asset state (may have changed since opening detail)
  const currentAsset = view.kind === "detail" && view.asset
    ? store.holdings.find(h => h.id === view.asset.id) || view.asset
    : null;

  const goTo = (k) => {
    const kind = APP_VIEW_KINDS.includes(k) ? k : "dashboard";
    setRouteHash(kind);
    setView({ kind, asset: null });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const openDcaModal = () => { setEditDCA(null); setShowDcaModal(true); };
  const openEditDCA = (d) => { setEditDCA(d); setShowDcaModal(true); };
  const openEarnModal = () => { setEditEarn(null); setShowEarnModal(true); };
  const openEditEarn = (position) => { setEditEarn(position); setShowEarnModal(true); };

  return (
    <>
      <MangaPageLoader active={!appReady} title="กำลังเปิดพอร์ต" />
      <div className="app" style={{
        opacity: appReady ? 1 : 0,
        transform: appReady ? "translateY(0)" : "translateY(14px)",
        filter: appReady ? "blur(0)" : "blur(5px)",
        transition: "opacity .78s ease, transform .78s cubic-bezier(.2,.8,.2,1), filter .78s ease",
      }}>
        <Sidebar active={activeNav}
                 onNav={(k) => goTo(k)}
                 dcaDueCount={store.dca.filter(d => !d.paused && d.nextDate && d.nextDate <= window.todayISO()).length}/>
        <main className="main">
          <Topbar ccy={s.ccy}
                  onCcy={(c) => window.updateSettings({ ccy: c })}
                  onAdd={() => { setEditTx(null); setShowTxModal(true); }}
                  priceStatus={priceStatus}
                  onSettings={() => window.postMessage({ type: '__activate_edit_mode' }, '*')}
                  searchQuery={searchQuery}
                  onSearch={setSearchQuery}/>

          {(view.kind === "dashboard" || view.kind === "portfolio") && <DCAReminderBanner/>}

          {view.kind === "detail"
            ? <Detail asset={currentAsset} ccy={s.ccy} onBack={() => goTo("dashboard")}
                      onAddTx={() => { setEditTx(null); setShowTxModal(true); }}
                      accent={`var(--accent)`}/>
            : view.kind === "portfolio"
            ? <PortfolioView ccy={s.ccy}
                             onOpenAsset={onOpenAsset}
                             onAddHolding={() => { setEditHolding(null); setShowHoldingModal(true); }}
                             onAddTx={() => { setEditTx(null); setShowTxModal(true); }}
                             onEditHolding={(h) => { setEditHolding(h); setShowHoldingModal(true); }}/>
            : view.kind === "dca"
            ? <DCAView ccy={s.ccy} onAddDCA={openDcaModal} onEditDCA={openEditDCA}/>
            : view.kind === "earn"
            ? <EarnView ccy={s.ccy} onAddEarn={openEarnModal} onEditEarn={openEditEarn}/>
            : view.kind === "history"
            ? <HistoryView ccy={s.ccy} onEditTx={(tx) => { setEditTx(tx); setShowTxModal(true); }}/>
            : view.kind === "tax"
            ? <TaxView ccy={s.ccy}/>
            : view.kind === "bench"
            ? <BenchView ccy={s.ccy}/>
            : <Dashboard ccy={s.ccy}
                         onOpenAsset={onOpenAsset}
                         onAddHolding={() => { setEditHolding(null); setShowHoldingModal(true); }}
                         onAddTx={() => { setEditTx(null); setShowTxModal(true); }}
                         onAddDCA={openDcaModal}
                         onAddEarn={openEarnModal}
                         onEditEarn={openEditEarn}
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
                        editTransaction={editTx}
                        onClose={() => { setShowTxModal(false); setEditTx(null); }}
                        onSave={(tx) => {
                          if (editTx) window.updateTransaction(editTx.id, tx);
                          else window.addTransaction(tx);
                        }}/>

      <EarnModal open={showEarnModal}
                 holdings={store.holdings}
                 editEarn={editEarn}
                 onClose={() => { setShowEarnModal(false); setEditEarn(null); }}
                 onSave={(e) => {
                   if (editEarn) window.updateEarn(editEarn.id, e);
                   else window.addEarn(e);
                 }}/>

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

        <TweakSection label="Database">
          <LocalDatabasePanel priceStatus={priceStatus}/>
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
      {window.AIChatWidget ? <AIChatWidget/> : null}
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

// Local database panel (Settings > Database)
function LocalDatabasePanel({ priceStatus }) {
  const store = window.useStore();
  const mode = window.useDatabaseMode ? window.useDatabaseMode() : "local";
  const livePrices = store.settings.livePrices === true;
  const [msg, setMsg] = React.useState("");
  const [signingOut, setSigningOut] = React.useState(false);
  const [lineStatus, setLineStatus] = React.useState(null);
  const [lineMsg, setLineMsg] = React.useState("");
  const [lineBusy, setLineBusy] = React.useState(false);
  const [lineCode, setLineCode] = React.useState(null);

  React.useEffect(() => {
    if (mode === "local") window.setAutoSync?.(false);
  }, [mode]);

  React.useEffect(() => {
    if (!window.isAuthConfigured?.() || !window.getLineStatus) return;
    let alive = true;
    window.getLineStatus()
      .then(data => { if (alive) setLineStatus(data); })
      .catch(() => { if (alive) setLineStatus(null); });
    return () => { alive = false; };
  }, []);

  const useLocal = () => {
    window.setDatabaseMode?.("local");
    setMsg("ใช้ฐานข้อมูลในเครื่องแล้ว");
  };

  const toggleLivePrices = () => {
    const next = !livePrices;
    window.updateSettings({ livePrices: next });
    setMsg(next ? "เปิดอัปเดตราคาจาก API แล้ว" : "ปิด API ราคาแล้ว ใช้ราคาที่กรอกเอง");
    if (next) setTimeout(() => priceStatus?.refresh?.(), 0);
  };

  const clearCloudConfig = () => {
    window.setBackendConfig?.(null);
    window.setAutoSync?.(false);
    setMsg("ล้างการเชื่อมต่อ backend แล้ว");
  };

  const testLine = async () => {
    setLineBusy(true);
    setLineMsg("กำลังส่งข้อความทดสอบ...");
    try {
      const data = await window.sendLineTest?.();
      setLineMsg(`ส่ง LINE สำเร็จ ${data?.sent || 0} จุดหมาย`);
      if (window.getLineStatus) {
        const latest = await window.getLineStatus();
        setLineStatus(latest);
      }
    } catch (error) {
      setLineMsg(error.message || "ส่ง LINE ไม่สำเร็จ");
    } finally {
      setLineBusy(false);
    }
  };

  const createLineCode = async () => {
    setLineBusy(true);
    setLineMsg("กำลังสร้างรหัสผูก LINE...");
    try {
      const data = await window.createLineLinkCode?.();
      setLineCode(data);
      setLineMsg("สร้างรหัสแล้ว เอาไปพิมพ์ใน LINE OA");
    } catch (error) {
      setLineMsg(error.message || "สร้างรหัสไม่สำเร็จ");
    } finally {
      setLineBusy(false);
    }
  };

  const handleSignOut = async () => {
    setSigningOut(true);
    setMsg("กำลังออกจากระบบ...");
    try {
      await window.pushCloudPortfolio?.();
    } catch (_) {}
    location.assign(new URL("dashboard-design.html", location.href).href);
  };

  return (
    <div style={{display:"flex", flexDirection:"column", gap:8}}>
      <div style={{
        padding:"8px 10px",
        border:"1px solid var(--line)",
        borderRadius:8,
        background:"var(--accent-soft)",
      }}>
        <div style={{fontSize:12, fontWeight:700, color:"var(--accent-ink)"}}>
          ฐานข้อมูลในเครื่อง
        </div>
        <div style={{fontSize:10, color:"var(--muted)", marginTop:2}}>
          บันทึกพอร์ต, DCA, รายการซื้อขาย และ Earn ไว้ใน browser ของเครื่องนี้
        </div>
      </div>

      <div style={{display:"flex", alignItems:"center", justifyContent:"space-between",
                   padding:"6px 10px", borderRadius:8, background:"var(--surface)",
                   border:"1px solid var(--line)"}}>
        <div>
          <div style={{fontSize:12, fontWeight:600}}>Live price API</div>
          <div style={{fontSize:10, color:"var(--muted)"}}>
            {livePrices ? "ดึงราคาตลาดอัตโนมัติ" : "ปิดอยู่ ใช้ราคาที่กรอกเอง"}
          </div>
        </div>
        <button type="button" className="twk-toggle" data-on={livePrices ? "1" : "0"}
                role="switch" aria-checked={livePrices}
                onClick={toggleLivePrices}><i /></button>
      </div>

      <div className="twk-action-row">
        <button className="twk-btn secondary" onClick={useLocal}>ใช้ฐานข้อมูลนี้</button>
        <button className="twk-btn secondary" onClick={clearCloudConfig}>ล้าง backend</button>
      </div>

      {window.isAuthConfigured?.() && (
        <div style={{display:"flex", flexDirection:"column", gap:6,
                     padding:"8px 10px", borderRadius:8, background:"var(--surface)",
                     border:"1px solid var(--line)"}}>
          <div style={{display:"flex", alignItems:"center", justifyContent:"space-between", gap:8}}>
            <div>
              <div style={{fontSize:12, fontWeight:600}}>LINE OA</div>
              <div style={{fontSize:10, color:"var(--muted)"}}>
                {lineStatus?.enabled ? `พร้อมส่ง LINE · ผูกแล้ว ${lineStatus?.linkedTargets || 0} คน` : "รอใส่ LINE secret ใน Worker"}
              </div>
              <div style={{fontSize:10, color:"var(--accent-ink)", marginTop:2}}>
                แอด LINE OA: <b>@166kcvav</b>
              </div>
            </div>
            <div style={{display:"flex", gap:6}}>
              <button className="twk-btn secondary" onClick={createLineCode}
                      disabled={lineBusy || !lineStatus?.enabled}>
                ผูก
              </button>
              <button className="twk-btn secondary" onClick={testLine}
                      disabled={lineBusy || !lineStatus?.enabled}>
                {lineBusy ? "ส่ง..." : "ทดสอบ"}
              </button>
            </div>
          </div>
          {lineCode?.command && (
            <div style={{fontSize:10, color:"var(--accent-ink)", lineHeight:1.5}}>
              พิมพ์ใน LINE OA: <b>{lineCode.command}</b> หรือส่งแค่ <b>{lineCode.code}</b>
            </div>
          )}
          {lineMsg && (
            <div style={{fontSize:10, color: lineMsg.includes("สำเร็จ") ? "var(--up)" : "var(--muted)"}}>
              {lineMsg}
            </div>
          )}
        </div>
      )}

      {(window.isAuthConfigured?.() || window.isSupabaseConfigured?.()) && (
        <button className="twk-btn secondary" style={{marginTop:2, color:"var(--down)"}}
                disabled={signingOut}
                onClick={handleSignOut}>
          {signingOut ? "กำลังออกจากระบบ..." : "ออกจากระบบ"}
        </button>
      )}
      {msg && <div style={{fontSize:10, color:"var(--up)"}}>✓ {msg}</div>}
    </div>
  );
}

// ─────── Backend config panel (legacy cloud sync) ───────
function BackendConfigPanel() {
  const current = window.useBackendStatus();
  const [url, setUrl] = React.useState(current?.url || "");
  const [key, setKey] = React.useState(current?.key || "");
  const [status, setStatus] = React.useState(null); // null | 'testing' | 'ok' | 'error:msg'
  const [syncMsg, setSyncMsg] = React.useState("");
  const [autoSync, setAutoSyncState] = React.useState(() => window.isAutoSyncEnabled());
  const [countdown, setCountdown] = React.useState(null); // seconds until next auto-sync

  React.useEffect(() => {
    if (current) { setUrl(current.url); setKey(current.key); }
  }, [current]);

  // Listen to sync events
  React.useEffect(() => {
    const onSync = (e) => {
      const t = new Date().toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
      if (e.detail?.ok) setSyncMsg(`✓ ${e.detail.auto ? "auto-sync" : "sync"} ${t}`);
      else setSyncMsg(`✗ ${e.detail?.error || "sync failed"}`);
    };
    window.addEventListener("siamfolio.sync", onSync);
    return () => window.removeEventListener("siamfolio.sync", onSync);
  }, []);

  // Countdown tick
  React.useEffect(() => {
    if (!autoSync || !current) { setCountdown(null); return; }
    const tick = () => {
      const next = window.getAutoSyncNextAt();
      if (!next) { setCountdown(null); return; }
      const sec = Math.max(0, Math.round((next - Date.now()) / 1000));
      setCountdown(sec);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [autoSync, current]);

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
    window.setAutoSync(false);
    setAutoSyncState(false);
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

  const toggleAutoSync = () => {
    const next = !autoSync;
    setAutoSyncState(next);
    window.setAutoSync(next);
    if (next) setSyncMsg("⏱ auto-sync เปิดแล้ว — ทุก 1 นาที");
    else setSyncMsg("auto-sync ปิดแล้ว");
  };

  return (
    <div style={{display:"flex", flexDirection:"column", gap:6}}>
      {current ? (
        <>
          <div style={{fontSize:11, color:"var(--up)", fontWeight:600}}>
            ✓ เชื่อมต่อกับ {new URL(current.url).hostname}
          </div>

          {/* Auto-sync toggle */}
          <div style={{display:"flex", alignItems:"center", justifyContent:"space-between",
                       padding:"6px 10px", borderRadius:8,
                       background: autoSync ? "var(--accent-soft)" : "var(--surface)",
                       border:"1px solid var(--line)", cursor:"pointer"}}
               onClick={toggleAutoSync}>
            <div>
              <div style={{fontSize:12, fontWeight:600, color: autoSync ? "var(--accent-ink)" : "var(--text)"}}>
                ⏱ Auto-sync
              </div>
              <div style={{fontSize:10, color:"var(--muted)"}}>
                {autoSync
                  ? countdown !== null
                    ? `ถัดไปใน ${countdown} วินาที`
                    : "กำลังรอ..."
                  : "อัพโหลดอัตโนมัติทุก 1 นาที"}
              </div>
            </div>
            {/* Toggle pill */}
            <div style={{
              width:36, height:20, borderRadius:10, position:"relative", transition:"background 0.2s",
              background: autoSync ? "var(--accent)" : "var(--line)", flexShrink:0,
            }}>
              <div style={{
                position:"absolute", top:3, left: autoSync ? 19 : 3,
                width:14, height:14, borderRadius:"50%", background:"white",
                boxShadow:"0 1px 3px rgba(0,0,0,0.2)", transition:"left 0.2s",
              }}/>
            </div>
          </div>

          {syncMsg && (
            <div style={{fontSize:10, color: syncMsg.startsWith("✓") ? "var(--up)" : syncMsg.startsWith("✗") ? "var(--down)" : "var(--muted)"}}>
              {syncMsg}
            </div>
          )}

          <div className="twk-action-row" style={{marginTop:2}}>
            <button className="twk-btn secondary" onClick={pull}>ดึงข้อมูล</button>
            <button className="twk-btn secondary" onClick={push}>อัพโหลดเดี๋ยวนี้</button>
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

ReactDOM.createRoot(document.getElementById("root")).render(
  <SupabaseAuthGate>
    <App/>
  </SupabaseAuthGate>
);
