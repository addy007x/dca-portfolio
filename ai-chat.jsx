function AIChatWidget() {
  const authUser = window.useAuthUser?.();
  const [open, setOpen] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [input, setInput] = React.useState("");
  const [messages, setMessages] = React.useState(() => ([
    {
      role: "assistant",
      text: "สวัสดีครับ ผมคือ Siam AI ถามเรื่องพอร์ต, DCA, Earn, LINE OA หรือสิ่งที่ควรเช็กวันนี้ได้เลย",
    },
  ]));
  const listRef = React.useRef(null);

  React.useEffect(() => {
    if (open && listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages, open]);

  if (!authUser) return null;

  const suggestions = [
    "สรุปพอร์ตตอนนี้",
    "DCA รอบต่อไปมีอะไร",
    "สินทรัพย์ตัวไหนติดลบ",
    "Earn ได้เท่าไหร่",
    "ผูก LINE OA ยังไง",
  ];

  async function send(text = input) {
    const question = String(text || "").trim();
    if (!question || busy) return;
    const nextMessages = [...messages, { role: "user", text: question }];
    setMessages(nextMessages);
    setInput("");
    setBusy(true);
    try {
      const history = nextMessages.slice(-8).map(m => ({ role: m.role, text: m.text }));
      const res = await window.askPortfolioAi(question, history);
      setMessages([...nextMessages, {
        role: "assistant",
        text: res.answer || "ผมยังตอบไม่ได้ตอนนี้ครับ",
        mode: res.mode,
      }]);
    } catch (error) {
      setMessages([...nextMessages, {
        role: "assistant",
        text: `เชื่อมต่อ AI ไม่สำเร็จ: ${error.message}`,
        mode: "error",
      }]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <style>{`
        .ai-chat-launch {
          position: fixed;
          right: 22px;
          bottom: 22px;
          z-index: 70;
          min-width: 182px;
          height: 72px;
          border: 1px solid rgba(69, 198, 255, .30);
          border-radius: 24px;
          background:
            linear-gradient(135deg, rgba(255,255,255,.96), rgba(232,248,255,.90)),
            radial-gradient(circle at 20% 18%, rgba(69,198,255,.34), transparent 34%),
            linear-gradient(135deg, #eaf9ff, #fff8ea);
          color: #17130f;
          box-shadow:
            0 18px 50px rgba(41, 28, 16, .24),
            0 0 0 1px rgba(255,255,255,.60) inset,
            0 0 32px rgba(20, 178, 255, .18);
          font-weight: 800;
          cursor: pointer;
          padding: 8px 13px 8px 8px;
          display: inline-flex;
          align-items: center;
          gap: 10px;
          overflow: hidden;
          animation: ai-launch-float 4.2s ease-in-out infinite;
          transition: transform .18s ease, box-shadow .18s ease, border-color .18s ease;
        }
        .ai-chat-launch:hover {
          transform: translateY(-3px) scale(1.015);
          border-color: rgba(69, 198, 255, .56);
          box-shadow:
            0 24px 62px rgba(41, 28, 16, .28),
            0 0 0 1px rgba(255,255,255,.72) inset,
            0 0 42px rgba(20, 178, 255, .28);
        }
        .ai-chat-launch::before {
          content: "";
          position: absolute;
          inset: -34px -40px auto auto;
          width: 126px;
          height: 126px;
          border-radius: 999px;
          background: radial-gradient(circle, rgba(39, 194, 255, .34), transparent 62%);
          pointer-events: none;
          animation: ai-orb-pulse 2.8s ease-in-out infinite;
        }
        .ai-chat-launch::after {
          content: "";
          position: absolute;
          inset: 0 auto 0 -70%;
          width: 46%;
          transform: skewX(-18deg);
          background: linear-gradient(90deg, transparent, rgba(255,255,255,.62), transparent);
          pointer-events: none;
          animation: ai-shine 5.5s ease-in-out infinite;
        }
        .ai-launch-avatar {
          position: relative;
          width: 54px;
          height: 54px;
          flex: 0 0 auto;
          border-radius: 18px;
          overflow: hidden;
          border: 1px solid rgba(255,255,255,.82);
          background:
            radial-gradient(circle at 45% 25%, rgba(255,255,255,.72), transparent 42%),
            linear-gradient(135deg, rgba(69,198,255,.30), rgba(20,121,255,.18)),
            #e9f8ff;
          box-shadow:
            0 10px 24px rgba(17,127,186,.20),
            0 0 18px rgba(35,199,255,.26);
        }
        .ai-launch-avatar img {
          width: 100%;
          height: 100%;
          object-fit: contain;
          object-position: center;
          transform: scale(1.04);
          filter: saturate(1.12) drop-shadow(0 5px 10px rgba(14,116,172,.24));
          animation: ai-avatar-bob 3.2s ease-in-out infinite;
        }
        .ai-launch-copy {
          position: relative;
          min-width: 0;
          text-align: left;
          line-height: 1.12;
        }
        .ai-launch-copy b {
          display: block;
          font-size: 14px;
          letter-spacing: 0;
        }
        .ai-launch-copy span {
          display: block;
          margin-top: 4px;
          color: #7c7167;
          font-size: 11px;
          font-weight: 800;
        }
        .ai-chat-panel {
          position: fixed;
          right: 22px;
          bottom: 88px;
          z-index: 70;
          width: min(430px, calc(100vw - 28px));
          max-height: min(700px, calc(100vh - 118px));
          display: grid;
          grid-template-rows: auto 1fr auto;
          border: 1px solid rgba(218,203,187,.96);
          border-radius: 18px;
          background: rgba(255,253,248,.94);
          box-shadow: 0 24px 80px rgba(50, 36, 22, .24);
          overflow: hidden;
          backdrop-filter: blur(14px);
        }
        .ai-chat-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 14px 16px;
          border-bottom: 1px solid rgba(218,203,187,.72);
          background:
            linear-gradient(135deg, rgba(255,255,255,.86), rgba(246,239,229,.72)),
            radial-gradient(circle at 14% 18%, rgba(43,143,138,.16), transparent 36%);
        }
        .ai-chat-head-main {
          display: flex;
          align-items: center;
          gap: 10px;
          min-width: 0;
        }
        .ai-head-avatar {
          width: 46px;
          height: 46px;
          border-radius: 16px;
          overflow: hidden;
          background: linear-gradient(135deg, #eaf9ff, #fff8ea);
          border: 1px solid rgba(69,198,255,.28);
          box-shadow: 0 8px 22px rgba(17,127,186,.14);
        }
        .ai-head-avatar img {
          width: 100%;
          height: 100%;
          object-fit: contain;
          object-position: center;
          transform: scale(1.04);
        }
        .ai-chat-title { font-weight: 800; line-height: 1.1; }
        .ai-chat-sub { margin-top: 3px; color: var(--muted); font-size: 11px; }
        .ai-chat-close {
          width: 34px;
          height: 34px;
          border: 1px solid rgba(17,16,14,.10);
          border-radius: 12px;
          background: rgba(255,255,255,.62);
          cursor: pointer;
          font-weight: 800;
        }
        .ai-chat-list {
          min-height: 280px;
          max-height: 440px;
          overflow: auto;
          padding: 14px;
          display: grid;
          align-content: start;
          gap: 10px;
        }
        .ai-msg {
          width: fit-content;
          max-width: 88%;
          padding: 10px 12px;
          border-radius: 16px;
          white-space: pre-wrap;
          line-height: 1.55;
          font-size: 13px;
        }
        .ai-msg.user {
          justify-self: end;
          background: #17130f;
          color: #fff8e8;
          border-bottom-right-radius: 6px;
        }
        .ai-msg.assistant {
          justify-self: start;
          background: #fff;
          border: 1px solid rgba(218,203,187,.82);
          color: var(--ink);
          border-bottom-left-radius: 6px;
        }
        .ai-mode {
          display: block;
          margin-top: 6px;
          color: var(--muted);
          font-size: 10px;
          font-weight: 700;
        }
        .ai-suggestions {
          display: flex;
          flex-wrap: wrap;
          gap: 7px;
          padding: 0 14px 10px;
        }
        .ai-suggestions button {
          min-height: 30px;
          border: 1px solid rgba(218,203,187,.82);
          border-radius: 999px;
          background: rgba(255,255,255,.68);
          color: var(--ink);
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
          padding: 0 10px;
        }
        .ai-chat-form {
          display: grid;
          grid-template-columns: 1fr auto;
          gap: 8px;
          padding: 12px;
          border-top: 1px solid rgba(218,203,187,.72);
          background: rgba(246,239,229,.68);
        }
        .ai-chat-form input {
          height: 42px;
          border: 1px solid rgba(218,203,187,.92);
          border-radius: 14px;
          background: #fff;
          padding: 0 12px;
          outline: 0;
        }
        .ai-chat-form button {
          height: 42px;
          border: 0;
          border-radius: 14px;
          background: #17130f;
          color: #fff8e8;
          padding: 0 14px;
          font-weight: 800;
          cursor: pointer;
        }
        .ai-chat-form button:disabled { opacity: .6; cursor: wait; }
        @keyframes ai-launch-float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }
        @keyframes ai-avatar-bob {
          0%, 100% { transform: translateY(0) scale(1.04); }
          50% { transform: translateY(-2px) scale(1.05); }
        }
        @keyframes ai-orb-pulse {
          0%, 100% { opacity: .66; transform: scale(.94); }
          50% { opacity: 1; transform: scale(1.08); }
        }
        @keyframes ai-shine {
          0%, 55% { left: -70%; opacity: 0; }
          68% { opacity: .88; }
          86%, 100% { left: 128%; opacity: 0; }
        }
        @media (prefers-reduced-motion: reduce) {
          .ai-chat-launch, .ai-chat-launch::before, .ai-chat-launch::after, .ai-launch-avatar img {
            animation: none;
          }
        }
        @media (max-width: 640px) {
          .ai-chat-launch { right: 14px; bottom: 14px; min-width: 68px; width: 68px; padding: 7px; border-radius: 22px; }
          .ai-launch-copy { display: none; }
          .ai-chat-panel { right: 14px; bottom: 78px; }
        }
      `}</style>

      {open && (
        <section className="ai-chat-panel" aria-label="Siam AI chat">
          <div className="ai-chat-head">
            <div className="ai-chat-head-main">
              <span className="ai-head-avatar">
                <img src="assets/ai-chatbot-icon.webp" alt="" aria-hidden="true"/>
              </span>
              <div>
                <div className="ai-chat-title">Siam AI</div>
                <div className="ai-chat-sub">ตอบจากข้อมูล DCA-Portfolio และ LINE OA ของบัญชีนี้</div>
              </div>
            </div>
            <button className="ai-chat-close" onClick={() => setOpen(false)} aria-label="ปิด">×</button>
          </div>
          <div className="ai-chat-list" ref={listRef}>
            {messages.map((m, i) => (
              <div key={i} className={`ai-msg ${m.role}`}>
                {m.text}
                {m.mode && <span className="ai-mode">{m.mode}</span>}
              </div>
            ))}
            {busy && <div className="ai-msg assistant">กำลังอ่านข้อมูลพอร์ต...</div>}
          </div>
          <div className="ai-suggestions">
            {suggestions.map(s => <button key={s} onClick={() => send(s)} disabled={busy}>{s}</button>)}
          </div>
          <form className="ai-chat-form" onSubmit={e => { e.preventDefault(); send(); }}>
            <input value={input}
                   onChange={e => setInput(e.target.value)}
                   placeholder="ถามเรื่องพอร์ต DCA หรือ LINE OA..."
                   disabled={busy}/>
            <button disabled={busy || !input.trim()}>ส่ง</button>
          </form>
        </section>
      )}

      <button className="ai-chat-launch" onClick={() => setOpen(o => !o)} aria-label="เปิด Siam AI">
        <span className="ai-launch-avatar">
          <img src="assets/ai-chatbot-icon.webp" alt="" aria-hidden="true"/>
        </span>
        <span className="ai-launch-copy">
          <b>Siam AI</b>
          <span>ถามพอร์ต · DCA · LINE</span>
        </span>
      </button>
    </>
  );
}

window.AIChatWidget = AIChatWidget;
