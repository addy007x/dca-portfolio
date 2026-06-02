function AIChatWidget() {
  const authUser = window.useAuthUser?.();
  const [open, setOpen] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [input, setInput] = React.useState("");
  const [messages, setMessages] = React.useState(() => ([
    {
      role: "assistant",
      text: "สวัสดีครับ ผมคือ Siam AI ถามเรื่องพอร์ต, DCA, Earn, LINE alert หรือสิ่งที่ควรเช็กวันนี้ได้เลย",
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
          min-width: 58px;
          height: 58px;
          border: 1px solid rgba(17,16,14,.12);
          border-radius: 18px;
          background: linear-gradient(135deg, #11100e, #3b3028);
          color: #fff8e8;
          box-shadow: 0 18px 50px rgba(41, 28, 16, .28);
          font-weight: 800;
          cursor: pointer;
        }
        .ai-chat-panel {
          position: fixed;
          right: 22px;
          bottom: 88px;
          z-index: 70;
          width: min(420px, calc(100vw - 28px));
          max-height: min(680px, calc(100vh - 118px));
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
          background: linear-gradient(135deg, rgba(255,255,255,.86), rgba(246,239,229,.72));
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
          max-height: 430px;
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
          .ai-chat-launch { right: 14px; bottom: 14px; }
          .ai-chat-panel { right: 14px; bottom: 78px; }
        }
      `}</style>

      {open && (
        <section className="ai-chat-panel" aria-label="Siam AI chat">
          <div className="ai-chat-head">
            <div>
              <div className="ai-chat-title">Siam AI</div>
              <div className="ai-chat-sub">ตอบจากข้อมูล DCA-Portfolio ของบัญชีนี้</div>
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
                   placeholder="ถามเรื่องพอร์ตหรือ DCA..."
                   disabled={busy}/>
            <button disabled={busy || !input.trim()}>ส่ง</button>
          </form>
        </section>
      )}

      <button className="ai-chat-launch" onClick={() => setOpen(o => !o)} aria-label="เปิด Siam AI">
        AI
      </button>
    </>
  );
}

window.AIChatWidget = AIChatWidget;
