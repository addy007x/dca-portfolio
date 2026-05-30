// Supabase Auth + per-user portfolio snapshot sync.

const SUPABASE_CONFIG_STORAGE = "siamfolio.supabaseConfig";
const CLOUD_SYNC_DELAY_MS = 1200;

let _supabaseClient = null;
let _cloudSyncTimer = null;
let _cloudSyncPaused = false;
let _cloudSession = null;

function getSupabaseConfig() {
  try {
    const saved = JSON.parse(localStorage.getItem(SUPABASE_CONFIG_STORAGE) || "null");
    if (saved?.url && saved?.anonKey) return saved;
  } catch (_) {}
  return window.SUPABASE_CONFIG || { url: "", anonKey: "" };
}

function isSupabaseConfigured() {
  const cfg = getSupabaseConfig();
  return !!(cfg.url && cfg.anonKey && window.supabase?.createClient);
}

function saveSupabaseConfig(cfg) {
  localStorage.setItem(SUPABASE_CONFIG_STORAGE, JSON.stringify(cfg));
  _supabaseClient = null;
  window.dispatchEvent(new Event("siamfolio.auth.changed"));
  setTimeout(() => location.reload(), 0);
}

function getSupabaseClient() {
  if (_supabaseClient) return _supabaseClient;
  if (!isSupabaseConfigured()) return null;
  const cfg = getSupabaseConfig();
  _supabaseClient = window.supabase.createClient(cfg.url, cfg.anonKey);
  return _supabaseClient;
}

function serializePortfolio(s) {
  return {
    version: s.version,
    holdings: s.holdings || [],
    transactions: s.transactions || [],
    dca: s.dca || [],
    earn: s.earn || [],
    rebalanceAlerts: s.rebalanceAlerts || [],
    benchmarks: s.benchmarks || [],
    fx: s.fx,
    fxUpdatedAt: s.fxUpdatedAt || 0,
    pricesUpdatedAt: s.pricesUpdatedAt || 0,
    settings: s.settings || {},
  };
}

async function pullCloudPortfolio() {
  const client = getSupabaseClient();
  const user = _cloudSession?.user;
  if (!client || !user) throw new Error("Not signed in");

  const { data, error } = await client
    .from("portfolio_snapshots")
    .select("data, updated_at")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) throw error;
  return data || null;
}

async function pushCloudPortfolio() {
  const client = getSupabaseClient();
  const user = _cloudSession?.user;
  if (!client || !user) return;

  const payload = {
    user_id: user.id,
    data: serializePortfolio(window.getStore()),
    updated_at: new Date().toISOString(),
  };

  const { error } = await client
    .from("portfolio_snapshots")
    .upsert(payload, { onConflict: "user_id" });

  if (error) throw error;
  window.dispatchEvent(new CustomEvent("siamfolio.cloudsync", {
    detail: { ok: true, at: Date.now() },
  }));
}

function scheduleCloudSync() {
  if (_cloudSyncPaused || !_cloudSession?.user || !getSupabaseClient()) return;
  clearTimeout(_cloudSyncTimer);
  _cloudSyncTimer = setTimeout(async () => {
    try {
      await pushCloudPortfolio();
    } catch (error) {
      window.dispatchEvent(new CustomEvent("siamfolio.cloudsync", {
        detail: { ok: false, error: error.message },
      }));
    }
  }, CLOUD_SYNC_DELAY_MS);
}

async function loadCloudIntoStore() {
  const snapshot = await pullCloudPortfolio();
  if (snapshot?.data) {
    _cloudSyncPaused = true;
    try {
      window.updateStore(s => ({
        ...s,
        ...snapshot.data,
        settings: { ...s.settings, ...(snapshot.data.settings || {}) },
      }));
    } finally {
      _cloudSyncPaused = false;
    }
    return "loaded";
  }

  await pushCloudPortfolio();
  return "created";
}

function useAuthSession() {
  const [state, setState] = React.useState({ loading: true, session: null, error: null });

  React.useEffect(() => {
    const client = getSupabaseClient();
    if (!client) {
      setState({ loading: false, session: null, error: null });
      return;
    }

    let alive = true;
    client.auth.getSession().then(({ data, error }) => {
      if (!alive) return;
      _cloudSession = data?.session || null;
      setState({ loading: false, session: _cloudSession, error });
    });

    const { data: sub } = client.auth.onAuthStateChange((_event, session) => {
      _cloudSession = session;
      setState({ loading: false, session, error: null });
    });

    return () => {
      alive = false;
      sub?.subscription?.unsubscribe?.();
    };
  }, []);

  return state;
}

function SupabaseSetupPanel() {
  const cfg = getSupabaseConfig();
  const [url, setUrl] = React.useState(cfg.url || "");
  const [anonKey, setAnonKey] = React.useState(cfg.anonKey || "");

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <div className="auth-brand">SiamFolio</div>
        <h1>ตั้งค่า Supabase ก่อน</h1>
        <p>ใส่ Project URL และ anon public key เพื่อเปิดระบบล็อกอินหลายคน</p>
        <input className="auth-input" value={url} onChange={e => setUrl(e.target.value)}
               placeholder="https://xxxx.supabase.co" />
        <input className="auth-input" value={anonKey} onChange={e => setAnonKey(e.target.value)}
               placeholder="Supabase anon public key" />
        <button className="auth-button" disabled={!url || !anonKey}
                onClick={() => saveSupabaseConfig({ url, anonKey })}>
          บันทึกใน browser นี้
        </button>
        <p className="auth-note">ถ้าจะให้ทุกคนใช้บนเว็บเดียวกัน ให้ใส่ค่านี้ใน `supabase-config.js` แล้ว push ขึ้น GitHub</p>
      </div>
    </div>
  );
}

function AuthForm() {
  const client = getSupabaseClient();
  const [mode, setMode] = React.useState("signin");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [message, setMessage] = React.useState("");

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const result = mode === "signup"
        ? await client.auth.signUp({ email, password })
        : await client.auth.signInWithPassword({ email, password });
      if (result.error) throw result.error;
      if (mode === "signup" && !result.data.session) {
        setMessage("สมัครแล้ว ตรวจอีเมลเพื่อยืนยันบัญชีก่อนเข้าสู่ระบบ");
      }
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-shell">
      <form className="auth-card" onSubmit={submit}>
        <div className="auth-brand">SiamFolio</div>
        <h1>{mode === "signup" ? "สมัครใช้งาน" : "เข้าสู่ระบบ"}</h1>
        <p>ข้อมูลพอร์ตจะแยกตามบัญชีผู้ใช้ และ sync กับฐานข้อมูลกลาง</p>
        <input className="auth-input" type="email" value={email}
               onChange={e => setEmail(e.target.value)} placeholder="email" required />
        <input className="auth-input" type="password" value={password}
               onChange={e => setPassword(e.target.value)} placeholder="password" minLength="6" required />
        {message && <div className="auth-message">{message}</div>}
        <button className="auth-button" disabled={busy}>
          {busy ? "กำลังทำงาน..." : mode === "signup" ? "สมัครใช้งาน" : "เข้าสู่ระบบ"}
        </button>
        <button type="button" className="auth-link" onClick={() => setMode(mode === "signup" ? "signin" : "signup")}>
          {mode === "signup" ? "มีบัญชีแล้ว เข้าสู่ระบบ" : "ยังไม่มีบัญชี สมัครใหม่"}
        </button>
      </form>
    </div>
  );
}

function SupabaseAuthGate({ children }) {
  const auth = useAuthSession();
  const [syncState, setSyncState] = React.useState("idle");
  const [syncError, setSyncError] = React.useState("");

  React.useEffect(() => {
    if (!auth.session) return;
    let alive = true;
    setSyncState("loading");
    loadCloudIntoStore()
      .then(() => {
        if (alive) setSyncState("ready");
      })
      .catch(error => {
        if (!alive) return;
        setSyncError(error.message);
        setSyncState("error");
      });
    return () => { alive = false; };
  }, [auth.session?.user?.id]);

  if (!isSupabaseConfigured()) return <SupabaseSetupPanel/>;
  if (auth.loading) return <div className="auth-shell"><div className="auth-card"><p>กำลังโหลด...</p></div></div>;
  if (!auth.session) return <AuthForm/>;
  if (syncState === "loading") return <div className="auth-shell"><div className="auth-card"><p>กำลังโหลดข้อมูลพอร์ต...</p></div></div>;
  if (syncState === "error") {
    return (
      <div className="auth-shell">
        <div className="auth-card">
          <h1>โหลดข้อมูลไม่สำเร็จ</h1>
          <p>{syncError}</p>
          <button className="auth-button" onClick={() => location.reload()}>ลองใหม่</button>
        </div>
      </div>
    );
  }
  return children;
}

async function signOutSupabase() {
  const client = getSupabaseClient();
  if (!client) return;
  await pushCloudPortfolio().catch(() => {});
  await client.auth.signOut();
}

Object.assign(window, {
  getSupabaseConfig,
  saveSupabaseConfig,
  getSupabaseClient,
  isSupabaseConfigured,
  scheduleCloudSync,
  pushCloudPortfolio,
  pullCloudPortfolio,
  signOutSupabase,
  SupabaseAuthGate,
});
