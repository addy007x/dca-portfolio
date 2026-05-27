// Root App — manages global state, tweaks, view routing

const DEFAULTS = /*EDITMODE-BEGIN*/{
  "density": "comfortable",
  "theme": "light",
  "accent": "mint",
  "scenario": "mixed",
  "ccy": "THB"
}/*EDITMODE-END*/;

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
  const [t, setTweak] = useTweaks(DEFAULTS);
  const [view, setView] = React.useState({ kind: "dashboard", asset: null });
  const [ccy, setCcy] = React.useState(t.ccy);

  React.useEffect(() => {
    document.documentElement.dataset.density = t.density;
    document.documentElement.dataset.theme = t.theme;
    applyAccent(t.accent);
  }, [t.density, t.theme, t.accent]);

  React.useEffect(() => { setCcy(t.ccy); }, [t.ccy]);

  const onOpenAsset = (asset) => {
    setView({ kind: "detail", asset });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const onBack = () => setView({ kind: "dashboard", asset: null });

  const activeNav = view.kind === "dashboard" ? "dashboard" : "portfolio";

  return (
    <>
      <div className="app" data-screen-label={view.kind === "dashboard" ? "01 Dashboard" : "02 Asset Detail"}>
        <Sidebar active={activeNav}
                 onNav={(k) => { if (k === "dashboard") onBack(); }}
                 scenario={t.scenario}/>
        <main className="main">
          <Topbar ccy={ccy} onCcy={(c) => { setCcy(c); setTweak("ccy", c); }} onAdd={() => {}}/>
          {view.kind === "dashboard"
            ? <Dashboard ccy={ccy} scenario={t.scenario}
                         onOpenAsset={onOpenAsset}
                         accent={`var(--accent)`}/>
            : <Detail asset={view.asset} ccy={ccy} onBack={onBack}
                      accent={`var(--accent)`}/>
          }
        </main>
      </div>

      <TweaksPanel title="Tweaks">
        <TweakSection label="แสดงผล">
          <TweakRadio label="ธีม"
                      value={t.theme}
                      options={[{value:"light", label:"สว่าง"},{value:"dark", label:"มืด"}]}
                      onChange={v => setTweak("theme", v)}/>
          <TweakRadio label="ความหนาแน่น"
                      value={t.density}
                      options={[{value:"comfortable", label:"สบาย"},{value:"compact", label:"กระชับ"}]}
                      onChange={v => setTweak("density", v)}/>
          <AccentSwatches value={t.accent} onChange={v => setTweak("accent", v)}/>
        </TweakSection>

        <TweakSection label="ข้อมูล">
          <TweakRadio label="สถานการณ์"
                      value={t.scenario}
                      options={[
                        {value:"mixed", label:"ผสม"},
                        {value:"gain", label:"กำไร"},
                        {value:"loss", label:"ลบ"},
                      ]}
                      onChange={v => setTweak("scenario", v)}/>
          <TweakRadio label="สกุลเงิน"
                      value={ccy}
                      options={[{value:"THB", label:"฿ THB"},{value:"USD", label:"$ USD"}]}
                      onChange={v => { setCcy(v); setTweak("ccy", v); }}/>
        </TweakSection>
      </TweaksPanel>
    </>
  );
}

// Custom accent swatch row — uses preset keys mapped to oklch CSS strings
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

ReactDOM.createRoot(document.getElementById("root")).render(<App/>);
