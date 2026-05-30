// Google Auth + Cloudflare Worker-backed per-user portfolio sync.

const AUTH_SESSION_KEY = "siamfolio.googleSession";
const CLOUD_SYNC_DELAY_MS = 1200;

let _cloudSyncTimer = null;
let _cloudSyncPaused = false;
let _authSession = null;
let _resolvedGoogleClientId = "";
let _authConfigPromise = null;

function getAuthConfig() {
  const cfg = window.AUTH_CONFIG || {};
  return {
    apiUrl: (cfg.apiUrl || "").replace(/\/$/, ""),
    googleClientId: cfg.googleClientId || _resolvedGoogleClientId || "",
  };
}

function isAuthConfigured() {
  const cfg = getAuthConfig();
  return !!cfg.apiUrl;
}

async function resolveAuthConfig() {
  const cfg = getAuthConfig();
  if (cfg.googleClientId) return cfg;
  if (!cfg.apiUrl) throw new Error("Auth API is not configured");
  if (!_authConfigPromise) {
    _authConfigPromise = fetch(cfg.apiUrl + "/api/auth/config")
      .then(async res => {
        if (!res.ok) throw new Error(await res.text().catch(() => `HTTP ${res.status}`));
        return res.json();
      })
      .then(data => {
        _resolvedGoogleClientId = data.googleClientId || "";
        if (!_resolvedGoogleClientId) throw new Error("Google Client ID is not configured on the Worker");
        return getAuthConfig();
      })
      .catch(error => {
        _authConfigPromise = null;
        throw error;
      });
  }
  return _authConfigPromise;
}

function loadAuthSession() {
  if (_authSession) return _authSession;
  try {
    const saved = JSON.parse(localStorage.getItem(AUTH_SESSION_KEY) || "null");
    if (saved?.token && saved?.user && (!saved.expiresAt || saved.expiresAt > Date.now())) {
      _authSession = saved;
      return saved;
    }
  } catch (_) {}
  localStorage.removeItem(AUTH_SESSION_KEY);
  return null;
}

function saveAuthSession(session) {
  _authSession = session;
  if (session) localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(session));
  else localStorage.removeItem(AUTH_SESSION_KEY);
  window.dispatchEvent(new Event("siamfolio.auth.changed"));
}

function getAuthUser() {
  return loadAuthSession()?.user || null;
}

function getAuthDisplayName(user = getAuthUser()) {
  const name = (user?.name || "").trim();
  if (name) return name;
  const emailName = (user?.email || "").split("@")[0]?.trim();
  return emailName || "SiamFolio";
}

function useAuthUser() {
  const [user, setUser] = React.useState(() => getAuthUser());

  React.useEffect(() => {
    const refresh = () => setUser(getAuthUser());
    window.addEventListener("siamfolio.auth.changed", refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener("siamfolio.auth.changed", refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  return user;
}

async function authFetch(path, opts = {}) {
  const cfg = getAuthConfig();
  if (!cfg.apiUrl) throw new Error("Auth API is not configured");
  const headers = { ...(opts.headers || {}) };
  const session = loadAuthSession();
  if (session?.token) headers.Authorization = `Bearer ${session.token}`;
  if (opts.body && !headers["Content-Type"]) headers["Content-Type"] = "application/json";
  const res = await fetch(cfg.apiUrl + path, { ...opts, headers });
  if (!res.ok) throw new Error(await res.text().catch(() => `HTTP ${res.status}`));
  return res.json();
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

async function signInWithGoogleCredential(credential) {
  const data = await authFetch("/api/auth/google", {
    method: "POST",
    body: JSON.stringify({ credential }),
  });
  saveAuthSession(data);
  return data;
}

async function pullCloudPortfolio() {
  return authFetch("/api/portfolio");
}

async function pushCloudPortfolio() {
  if (!loadAuthSession()) return;
  await authFetch("/api/portfolio", {
    method: "PUT",
    body: JSON.stringify(serializePortfolio(window.getStore())),
  });
  window.dispatchEvent(new CustomEvent("siamfolio.cloudsync", {
    detail: { ok: true, at: Date.now() },
  }));
}

function scheduleCloudSync() {
  if (_cloudSyncPaused || !loadAuthSession()) return;
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
  if (snapshot && Object.keys(snapshot).length > 0) {
    _cloudSyncPaused = true;
    try {
      window.updateStore(s => ({
        ...s,
        ...snapshot,
        settings: { ...s.settings, ...(snapshot.settings || {}) },
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
  const [state, setState] = React.useState(() => ({
    loading: false,
    session: loadAuthSession(),
    error: null,
  }));

  React.useEffect(() => {
    const refresh = () => setState({ loading: false, session: loadAuthSession(), error: null });
    window.addEventListener("siamfolio.auth.changed", refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener("siamfolio.auth.changed", refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  return state;
}

function AuthSetupPanel() {
  return (
    <div className="auth-shell auth-shell-fantasy">
      <section className="auth-hero-copy">
        <div className="auth-kicker">SiamFolio</div>
        <h1>คลังพอร์ตนักลงทุน</h1>
        <p>ล็อกอินเพื่อเปิดห้องเก็บข้อมูลพอร์ตของคุณแบบส่วนตัว</p>
      </section>
      <div className="auth-card">
        <div className="auth-brand">ระบบยังไม่พร้อม</div>
        <h1>กำลังเตรียมประตูเข้าสู่ระบบ</h1>
        <p>เว็บนี้ใช้ Google login อย่างเดียว แต่ยังขาด `apiUrl` ใน `auth-config.js`</p>
        <p className="auth-note">หลังตั้ง Worker URL แล้ว ผู้ใช้จะเห็นปุ่ม Google และเข้าใช้งานได้ทันที</p>
      </div>
    </div>
  );
}

function AuthForm() {
  const buttonRef = React.useRef(null);
  const [cfg, setCfg] = React.useState(() => getAuthConfig());
  const [busy, setBusy] = React.useState(false);
  const [message, setMessage] = React.useState("");

  React.useEffect(() => {
    let alive = true;
    resolveAuthConfig()
      .then(nextCfg => {
        if (alive) setCfg(nextCfg);
      })
      .catch(error => {
        if (alive) setMessage(error.message);
      });
    return () => { alive = false; };
  }, []);

  React.useEffect(() => {
    let cancelled = false;
    let timer = null;

    const renderGoogleButton = () => {
      if (cancelled || !buttonRef.current || !cfg.googleClientId) return;
      if (!window.google?.accounts?.id) {
        timer = setTimeout(renderGoogleButton, 120);
        return;
      }
      buttonRef.current.innerHTML = "";
      window.google.accounts.id.initialize({
        client_id: cfg.googleClientId,
        callback: async (response) => {
          setBusy(true);
          setMessage("");
          try {
            await signInWithGoogleCredential(response.credential);
          } catch (error) {
            setMessage(error.message);
            setBusy(false);
          }
        },
      });
      window.google.accounts.id.renderButton(buttonRef.current, {
        theme: "outline",
        size: "large",
        type: "standard",
        text: "signin_with",
        shape: "rectangular",
        width: 320,
      });
    };

    renderGoogleButton();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [cfg.googleClientId]);

  return (
    <div className="auth-shell auth-shell-fantasy">
      <div className="auth-walker" aria-hidden="true">
        <span className="auth-walker-sprite"></span>
        <span className="auth-walker-shadow"></span>
      </div>
      <div className="auth-card">
        <div className="auth-brand">Secure Gate</div>
        <h1>เริ่มการเดินทาง</h1>
        <div className={busy ? "auth-google-wrap is-busy" : "auth-google-wrap"} ref={buttonRef}>
          {!cfg.googleClientId && !message ? "กำลังเตรียมปุ่ม Google..." : null}
        </div>
        {message && <div className="auth-message">{message}</div>}
      </div>
    </div>
  );
}

function AuthGate({ children }) {
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

  if (!isAuthConfigured()) return <AuthSetupPanel/>;
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
  try {
    await pushCloudPortfolio();
    await authFetch("/api/auth/logout", { method: "POST" });
  } catch (_) {}
  saveAuthSession(null);
}

Object.assign(window, {
  getAuthConfig,
  resolveAuthConfig,
  isAuthConfigured,
  isSupabaseConfigured: isAuthConfigured,
  getAuthUser,
  getAuthDisplayName,
  useAuthUser,
  signInWithGoogleCredential,
  scheduleCloudSync,
  pushCloudPortfolio,
  pullCloudPortfolio,
  signOutSupabase,
  SupabaseAuthGate: AuthGate,
});
