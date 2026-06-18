// Google Auth + Cloudflare Worker-backed per-user portfolio sync.

const AUTH_SESSION_KEY = "siamfolio.googleSession";
const AUTH_LAST_PROFILE_KEY = "siamfolio.lastProfile";
const CLOUD_SYNC_DELAY_MS = 1200;
const AUTH_RELOAD_DELAY_MS = 5000;

let _cloudSyncTimer = null;
let _authReloadTimer = null;
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
    const saved = JSON.parse(localStorage.getItem(AUTH_SESSION_KEY) || sessionStorage.getItem(AUTH_SESSION_KEY) || "null");
    if (saved?.token && saved?.user && (!saved.expiresAt || saved.expiresAt > Date.now())) {
      _authSession = saved;
      return saved;
    }
  } catch (_) {}
  localStorage.removeItem(AUTH_SESSION_KEY);
  sessionStorage.removeItem(AUTH_SESSION_KEY);
  return null;
}

function saveAuthSession(session, options = {}) {
  _authSession = session;
  if (session) {
    if (options.persist === false) {
      sessionStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(session));
      localStorage.removeItem(AUTH_SESSION_KEY);
    } else {
      localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(session));
      sessionStorage.removeItem(AUTH_SESSION_KEY);
    }
    saveLastAuthProfile(session.user);
  }
  else {
    localStorage.removeItem(AUTH_SESSION_KEY);
    sessionStorage.removeItem(AUTH_SESSION_KEY);
  }
  if (options.silent) return;
  window.dispatchEvent(new Event("siamfolio.auth.changed"));
}

function saveLastAuthProfile(user) {
  if (!user) return;
  try {
    localStorage.setItem(AUTH_LAST_PROFILE_KEY, JSON.stringify({
      name: user.name || "",
      email: user.email || "",
      picture: user.picture || user.avatar || user.avatarUrl || user.photoURL || "",
    }));
  } catch (_) {}
}

function reloadAfterAuthDelay(targetUrl = "") {
  clearTimeout(_authReloadTimer);
  _authReloadTimer = setTimeout(() => {
    if (targetUrl) location.assign(targetUrl);
    else location.reload();
  }, AUTH_RELOAD_DELAY_MS);
}

function getPostLoginUrl() {
  return new URL("dashboard-design.html", location.href).href;
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

async function getLineStatus() {
  return authFetch("/api/line/status");
}

async function sendLineTest() {
  return authFetch("/api/line/test", {
    method: "POST",
    body: JSON.stringify({}),
  });
}

async function createLineLinkCode() {
  return authFetch("/api/line/link-code", {
    method: "POST",
    body: JSON.stringify({}),
  });
}

async function askPortfolioAi(question, history = []) {
  return authFetch("/api/ai/chat", {
    method: "POST",
    body: JSON.stringify({ question, history }),
  });
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

async function signInWithGoogleCredential(credential, options = {}) {
  const data = await authFetch("/api/auth/google", {
    method: "POST",
    body: JSON.stringify({ credential }),
  });
  saveAuthSession(data, options);
  return data;
}

async function signInWithPassword(identifier, password, options = {}) {
  const data = await authFetch("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ identifier, password }),
  });
  saveAuthSession(data, options);
  return data;
}

async function registerWithPassword(username, email, password, options = {}) {
  const data = await authFetch("/api/auth/register", {
    method: "POST",
    body: JSON.stringify({ username, email, password }),
  });
  saveAuthSession(data, options);
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
        dca: window.normalizeDCAList ? window.normalizeDCAList(snapshot.dca || []) : (snapshot.dca || []),
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
            await signInWithGoogleCredential(response.credential, { silent: true });
            setMessage("เข้าสู่ระบบสำเร็จ กำลังรีเฟรชใน 5 วินาที...");
            reloadAfterAuthDelay(getPostLoginUrl());
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
      <section className="auth-hero-copy">
        <div className="auth-kicker">SiamFolio</div>
        <h1>เข้าสู่ดินแดนพอร์ตของคุณ</h1>
        <p>ติดตาม DCA, กำไร, สินทรัพย์ และแผนสะสมระยะยาวในห้องบัญชีเดียว</p>
        <div className="auth-runes">
          <span>Portfolio</span>
          <span>DCA</span>
          <span>Cloud Sync</span>
        </div>
      </section>
      <div className="auth-card">
        <div className="auth-brand">Secure Gate</div>
        <h1>เริ่มการเดินทาง</h1>
        <p>ใช้ Google เพื่อเข้าใช้งานและแยกข้อมูลพอร์ตของแต่ละบัญชีอัตโนมัติ</p>
        <div className={busy ? "auth-google-wrap is-busy" : "auth-google-wrap"} ref={buttonRef}>
          {!cfg.googleClientId && !message ? "กำลังเตรียมปุ่ม Google..." : null}
        </div>
        {message && <div className="auth-message">{message}</div>}
        <p className="auth-note">ถ้าเป็นการเข้าใช้ครั้งแรก ระบบจะสร้างบัญชีผ่าน Google ให้โดยอัตโนมัติ</p>
      </div>
    </div>
  );
}

function MangaAuthFrame({ mode = "login", children }) {
  return (
    <div className={`auth-shell-manga auth-mode-${mode}`}>
      <main className="auth-manga-stage">
        <img
          className="auth-manga-art"
          src={mode === "register" ? "assets/manga-auth-signup-wide.png" : "assets/manga-auth-login-wide.png"}
          alt=""
          aria-hidden="true"
        />
        <div className="auth-manga-card">{children}</div>
      </main>
    </div>
  );
}

function MangaAuthIcon({ name, size = 26 }) {
  const IconComponent = window.Ico;
  return IconComponent ? <IconComponent name={name} size={size} stroke={2.2} /> : null;
}

function MangaAuthSetupPanel() {
  return (
    <MangaAuthFrame>
      <section className="auth-manga-status">
        <div className="auth-manga-kicker">SYSTEM MESSAGE</div>
        <h1>ประตูยังไม่พร้อม</h1>
        <p>ระบบล็อกอินยังขาด Worker URL ใน <code>auth-config.js</code></p>
        <div className="auth-manga-alert">ตั้งค่า API URL แล้วรีเฟรชหน้านี้อีกครั้ง</div>
      </section>
    </MangaAuthFrame>
  );
}

function MangaAuthForm() {
  const buttonRef = React.useRef(null);
  const googleReadyRef = React.useRef(false);
  const [cfg, setCfg] = React.useState(() => getAuthConfig());
  const [mode, setMode] = React.useState(() => new URLSearchParams(location.search).get("auth") === "register" ? "register" : "login");
  const [busy, setBusy] = React.useState(false);
  const [message, setMessage] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [form, setForm] = React.useState({ username: "", email: "", identifier: "", password: "", confirm: "", remember: true, accepted: false });

  React.useEffect(() => {
    let alive = true;
    resolveAuthConfig()
      .then(nextCfg => alive && setCfg(nextCfg))
      .catch(error => alive && setMessage(error.message));
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
        use_fedcm_for_prompt: true,
        callback: async (response) => {
          setBusy(true);
          setMessage("");
          try {
            await signInWithGoogleCredential(response.credential, { silent: true });
            setMessage("เข้าสู่ระบบสำเร็จ กำลังเปิดหน้าหลัก...");
            reloadAfterAuthDelay(getPostLoginUrl());
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
        text: mode === "register" ? "signup_with" : "signin_with",
        shape: "rectangular",
        logo_alignment: "left",
        width: Math.max(240, Math.min(430, Math.floor(buttonRef.current.getBoundingClientRect().width || 360))),
      });
      googleReadyRef.current = true;
    };

    renderGoogleButton();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [cfg.googleClientId, mode]);

  const handleGoogleClick = () => {
    if (busy) return;
    if (!cfg.googleClientId) {
      setMessage("Google ยังโหลดไม่เสร็จ ลองกดอีกครั้งในอีกสักครู่");
      return;
    }
    if (window.google?.accounts?.id && googleReadyRef.current) {
      window.google.accounts.id.prompt();
    }
  };

  const updateField = (event) => {
    const { name, type, checked, value } = event.target;
    setForm(current => ({ ...current, [name]: type === "checkbox" ? checked : value }));
  };

  const switchMode = (nextMode) => {
    setMode(nextMode);
    setMessage("");
    setShowPassword(false);
    const url = new URL(location.href);
    if (nextMode === "register") url.searchParams.set("auth", "register");
    else url.searchParams.delete("auth");
    history.replaceState(null, "", url);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage("");

    if (mode === "register" && form.password !== form.confirm) {
      setMessage("รหัสผ่านและการยืนยันรหัสผ่านไม่ตรงกัน");
      return;
    }
    if (mode === "register" && !form.accepted) {
      setMessage("กรุณายอมรับข้อตกลงการใช้งานและนโยบายความเป็นส่วนตัว");
      return;
    }

    setBusy(true);
    try {
      if (mode === "register") {
        await registerWithPassword(form.username, form.email, form.password, { silent: true });
        setMessage("สมัครสมาชิกสำเร็จ กำลังเปิดหน้าหลัก...");
      } else {
        await signInWithPassword(form.identifier, form.password, { silent: true, persist: form.remember });
        setMessage("เข้าสู่ระบบสำเร็จ กำลังเปิดหน้าหลัก...");
      }
      reloadAfterAuthDelay(getPostLoginUrl());
    } catch (error) {
      try {
        const parsed = JSON.parse(error.message);
        setMessage(parsed.error || error.message);
      } catch (_) {
        setMessage(error.message);
      }
      setBusy(false);
    }
  };

  return (
    <MangaAuthFrame mode={mode}>
      <section className="auth-manga-content">
        <h1>{mode === "register" ? "สมัครสมาชิก" : "เข้าสู่ระบบ"}</h1>
        <form className="auth-manga-form" onSubmit={handleSubmit}>
          {mode === "register" && (
            <label>
              <span>ชื่อผู้ใช้</span>
              <div className="auth-manga-input">
                <MangaAuthIcon name="user" />
                <input name="username" type="text" value={form.username} onChange={updateField} placeholder="ตั้งชื่อผู้ใช้" autoComplete="username" minLength="3" maxLength="32" required />
              </div>
            </label>
          )}
          <label>
            <span>{mode === "register" ? "อีเมล" : "ชื่อผู้ใช้หรืออีเมล"}</span>
            <div className="auth-manga-input">
              <MangaAuthIcon name={mode === "register" ? "mail" : "user"} />
              <input name={mode === "register" ? "email" : "identifier"} type={mode === "register" ? "email" : "text"} value={mode === "register" ? form.email : form.identifier} onChange={updateField} placeholder={mode === "register" ? "กรอกอีเมล" : "กรอกชื่อผู้ใช้หรืออีเมล"} autoComplete={mode === "register" ? "email" : "username"} required />
            </div>
          </label>
          <label>
            <span>รหัสผ่าน</span>
            <div className="auth-manga-input auth-manga-password">
              <MangaAuthIcon name="lock" />
              <input name="password" type={showPassword ? "text" : "password"} value={form.password} onChange={updateField} placeholder="กรอกรหัสผ่าน" autoComplete={mode === "register" ? "new-password" : "current-password"} minLength="8" required />
              <button type="button" onClick={() => setShowPassword(value => !value)} aria-label={showPassword ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"} title={showPassword ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}>
                <MangaAuthIcon name="eye" size={28} />
              </button>
            </div>
          </label>
          {mode === "register" && (
            <label>
              <span>ยืนยันรหัสผ่าน</span>
              <div className="auth-manga-input auth-manga-password">
                <MangaAuthIcon name="lock" />
                <input name="confirm" type={showPassword ? "text" : "password"} value={form.confirm} onChange={updateField} placeholder="ยืนยันรหัสผ่าน" autoComplete="new-password" minLength="8" required />
                <button type="button" onClick={() => setShowPassword(value => !value)} aria-label={showPassword ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"} title={showPassword ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}>
                  <MangaAuthIcon name="eye" size={28} />
                </button>
              </div>
            </label>
          )}

          <div className="auth-manga-options">
            <label className="auth-manga-check">
              <input name={mode === "register" ? "accepted" : "remember"} type="checkbox" checked={mode === "register" ? form.accepted : form.remember} onChange={updateField} />
              <span>{mode === "register" ? "ฉันยอมรับข้อตกลงการใช้งานและนโยบายความเป็นส่วนตัว" : "จดจำฉันไว้"}</span>
            </label>
            {mode === "login" && <button type="button" className="auth-manga-link" onClick={() => setMessage("โปรดติดต่อผู้ดูแลระบบเพื่อรีเซ็ตรหัสผ่าน")}>ลืมรหัสผ่าน?</button>}
          </div>

          <button className="auth-manga-submit" type="submit" disabled={busy}>
            {busy ? "กำลังดำเนินการ..." : mode === "register" ? "สมัครสมาชิก" : "เข้าสู่ระบบ"}
          </button>
        </form>

        <div className="auth-manga-divider"><span>หรือ</span></div>
        <div
          className={busy ? "auth-manga-google is-busy" : "auth-manga-google"}
          onClick={handleGoogleClick}
          role="button"
          tabIndex={0}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              handleGoogleClick();
            }
          }}
        >
          <div className="auth-google-visual" aria-hidden="true">
            <img src="assets/google-g.png" alt="" />
            <span>{mode === "register" ? "สมัครด้วย Google" : "เข้าสู่ระบบด้วย Google"}</span>
          </div>
          <div ref={buttonRef} className="auth-google-wrap auth-google-native">
            {!cfg.googleClientId && !message ? "กำลังเตรียมปุ่ม Google..." : null}
          </div>
        </div>

        {message && <div className="auth-manga-message">{message}</div>}
        <p className="auth-manga-switch">
          {mode === "register" ? "มีบัญชีอยู่แล้ว?" : "ยังไม่มีบัญชี?"}{" "}
          <button type="button" onClick={() => switchMode(mode === "register" ? "login" : "register")}>
            {mode === "register" ? "เข้าสู่ระบบ" : "สมัครสมาชิก"}
          </button>
        </p>
      </section>
    </MangaAuthFrame>
  );
}

function MangaAuthStatus({ title, message, action }) {
  return (
    <MangaAuthFrame>
      <section className="auth-manga-content auth-manga-status">
        <div className="auth-manga-chapter">SYSTEM MESSAGE</div>
        <h1>{title}</h1>
        <p>{message}</p>
        {action}
      </section>
    </MangaAuthFrame>
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

  if (!isAuthConfigured()) return <MangaAuthSetupPanel/>;
  if (!auth.session) return <MangaAuthForm/>;
  // Show the dashboard immediately; cloud data hydrates the local store in the background.
  return children;
}

async function signOutSupabase() {
  saveLastAuthProfile(loadAuthSession()?.user);
  try {
    await pushCloudPortfolio();
    await authFetch("/api/auth/logout", { method: "POST" });
  } catch (_) {}
  saveAuthSession(null, { silent: true });
  reloadAfterAuthDelay(getPostLoginUrl());
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
  getLineStatus,
  sendLineTest,
  createLineLinkCode,
  askPortfolioAi,
  authFetch,
  signOutSupabase,
  SupabaseAuthGate: AuthGate,
});
