// SiamFolio Reminders — DCA notifications + due-date checker

// ─────── Notification permission helpers ───────
function getNotifPermission() {
  if (typeof Notification === "undefined") return "unsupported";
  return Notification.permission;
}

async function requestNotifPermission() {
  if (typeof Notification === "undefined") return "unsupported";
  if (Notification.permission === "granted") return "granted";
  if (Notification.permission === "denied") return "denied";
  try {
    const p = await Notification.requestPermission();
    return p;
  } catch (e) {
    return "denied";
  }
}

function fireNotification(title, body) {
  if (typeof Notification === "undefined") return;
  if (Notification.permission !== "granted") return;
  try {
    new Notification(title, {
      body,
      icon: "data:image/svg+xml;base64," + btoa(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="8" fill="#7BC4A8"/><text x="16" y="22" font-size="20" text-anchor="middle" fill="white" font-family="sans-serif">฿</text></svg>`),
      tag: "siamfolio-dca",
    });
  } catch (e) {
    console.warn("Notification failed:", e);
  }
}

// ─────── DCA reminder banner ───────
function DCAReminderBanner() {
  const store = window.useStore();
  const today = window.todayISO();
  const due = store.dca.filter(d => !d.paused && d.nextDate && d.nextDate <= today);

  // Fire browser notification once per day per due DCA
  React.useEffect(() => {
    if (!store.settings.notifyDCA) return;
    if (due.length === 0) return;
    const lastNotif = localStorage.getItem("sf.lastNotifDate");
    if (lastNotif === today) return;
    localStorage.setItem("sf.lastNotifDate", today);
    const tickers = due.map(d => d.ticker).join(", ");
    fireNotification(
      "DCA ถึงรอบแล้ว 💰",
      `${due.length} รายการรอลงทุน: ${tickers}`
    );
  }, [due.length, today, store.settings.notifyDCA]);

  if (due.length === 0) return null;

  return (
    <div className="dca-reminder">
      <div className="reminder-ico">⏱</div>
      <div className="reminder-body">
        <div className="reminder-title">
          DCA ถึงรอบแล้ว · {due.length} รายการ
        </div>
        <div className="reminder-sub">
          {due.slice(0, 3).map(d => (
            <span key={d.id} style={{marginRight:14}}>
              <b>{d.ticker}</b> {d.ccy === "THB" ? "฿" : "$"}{d.amount.toLocaleString()}
            </span>
          ))}
          {due.length > 3 && <span>+ อีก {due.length - 3} รายการ</span>}
        </div>
      </div>
      <div className="reminder-actions">
        {due.map(d => (
          <button key={d.id} className="btn sm accent"
                  onClick={() => window.executeDCA(d.id)}
                  title={`บันทึก DCA ${d.ticker}`}>
            ✓ {d.ticker}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─────── Notification permission button (for Tweaks panel) ───────
function NotifPermissionButton() {
  const [perm, setPerm] = React.useState(getNotifPermission());

  const handle = async () => {
    const result = await requestNotifPermission();
    setPerm(result);
    if (result === "granted") {
      window.updateSettings({ notifyDCA: true });
      fireNotification("เปิดการแจ้งเตือนแล้ว ✓", "เราจะเตือนคุณเมื่อ DCA ถึงรอบ");
    }
  };

  if (perm === "unsupported") {
    return <div style={{fontSize:11, color:"var(--muted)"}}>เบราว์เซอร์ไม่รองรับการแจ้งเตือน</div>;
  }
  if (perm === "granted") {
    return <div style={{fontSize:11, color:"var(--up)"}}>✓ เปิดการแจ้งเตือนแล้ว</div>;
  }
  if (perm === "denied") {
    return <div style={{fontSize:11, color:"var(--down)"}}>❌ ถูกบล็อก — เปิดในตั้งค่าเบราว์เซอร์</div>;
  }
  return (
    <button className="twk-btn" onClick={handle}>
      เปิดการแจ้งเตือน DCA
    </button>
  );
}

Object.assign(window, { DCAReminderBanner, NotifPermissionButton, fireNotification });
