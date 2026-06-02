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
          min-width: 172px;
          height: 68px;
          border: 1px solid rgba(17,16,14,.12);
          border-radius: 22px;
          background:
            linear-gradient(135deg, rgba(255,253,248,.94), rgba(246,236,221,.88)),
            linear-gradient(135deg, #11100e, #3b3028);
          color: #17130f;
          box-shadow: 0 18px 50px rgba(41, 28, 16, .28);
          font-weight: 800;
          cursor: pointer;
          padding: 8px 12px 8px 8px;
          display: inline-flex;
          align-items: center;
          gap: 10px;
          overflow: hidden;
        }
        .ai-chat-launch::before {
          content: "";
          position: absolute;
          inset: -28px -38px auto auto;
          width: 118px;
          height: 118px;
          border-radius: 999px;
          background: radial-gradient(circle, rgba(214,160,58,.26), transparent 62%);
          pointer-events: none;
        }
        .ai-launch-avatar {
          position: relative;
          width: 50px;
          height: 50px;
          flex: 0 0 auto;
          border-radius: 16px;
          overflow: hidden;
          border: 1px solid rgba(255,255,255,.72);
          background:
            linear-gradient(135deg, rgba(43,143,138,.25), rgba(214,160,58,.26)),
            #f7efe4;
          box-shadow: 0 8px 22px rgba(55,37,18,.16);
        }
        .ai-launch-avatar img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          object-position: 28% 38%;
          transform: scale(1.42);
          filter: saturate(1.05);
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
          width: 42px;
          height: 42px;
          border-radius: 14px;
          overflow: hidden;
          background: #f7efe4;
          border: 1px solid rgba(17,16,14,.10);
        }
        .ai-head-avatar img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          object-position: 28% 38%;
          transform: scale(1.42);
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
        @media (max-width: 640px) {
          .ai-chat-launch { right: 14px; bottom: 14px; min-width: 64px; width: 64px; padding: 7px; border-radius: 20px; }
          .ai-launch-copy { display: none; }
          .ai-chat-panel { right: 14px; bottom: 78px; }
        }
      `}</style>

      {open && (
        <section className="ai-chat-panel" aria-label="Siam AI chat">
          <div className="ai-chat-head">
            <div className="ai-chat-head-main">
              <span className="ai-head-avatar">
                <img src="assets/loading-maid-characters.png" alt="" aria-hidden="true"/>
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
          <img src="assets/loading-maid-characters.png" alt="" aria-hidden="true"/>
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
