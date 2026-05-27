// Custom SVG charts: line chart (area + axis) and sparkline

function LineChart({ data, height = 240, accent = "var(--accent)", animateKey }) {
  const [w, setW] = React.useState(800);
  const ref = React.useRef(null);
  const [hover, setHover] = React.useState(null);

  React.useEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver(entries => {
      for (const e of entries) setW(Math.max(320, Math.floor(e.contentRect.width)));
    });
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);

  const padX = 12, padTop = 14, padBot = 28;
  const h = height;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const span = max - min || 1;
  const x = (i) => padX + (i / (data.length - 1)) * (w - padX * 2);
  const y = (v) => padTop + (1 - (v - min) / span) * (h - padTop - padBot);

  let pathD = "";
  data.forEach((v, i) => { pathD += (i === 0 ? "M" : "L") + x(i) + " " + y(v); });
  let areaD = pathD + ` L ${x(data.length - 1)} ${h - padBot} L ${x(0)} ${h - padBot} Z`;

  // x-axis labels: show 5 ticks
  const ticks = 5;
  const tickI = Array.from({length: ticks}, (_, k) => Math.round(k * (data.length - 1) / (ticks - 1)));
  const monthLabels = ["ธ.ค.","ม.ค.","ก.พ.","มี.ค.","เม.ย.","พ.ค."];

  const last = data[data.length - 1];
  const first = data[0];
  const delta = last - first;
  const pct = (delta / first) * 100;

  const onMove = (e) => {
    const rect = ref.current.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const i = Math.round((px - padX) / (w - padX * 2) * (data.length - 1));
    if (i >= 0 && i < data.length) setHover(i);
  };

  return (
    <div ref={ref} style={{position:"relative", width:"100%"}}
         onMouseMove={onMove} onMouseLeave={() => setHover(null)}>
      <svg width={w} height={h} key={animateKey} style={{display:"block"}}>
        <defs>
          <linearGradient id="lc-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={accent} stopOpacity="0.22"/>
            <stop offset="100%" stopColor={accent} stopOpacity="0"/>
          </linearGradient>
        </defs>
        {/* horizontal grid */}
        {[0, 0.5, 1].map((p, i) => (
          <line key={i} x1={padX} x2={w - padX}
                y1={padTop + p * (h - padTop - padBot)}
                y2={padTop + p * (h - padTop - padBot)}
                stroke="var(--line)" strokeDasharray="3 4"/>
        ))}
        <path d={areaD} fill="url(#lc-fill)"/>
        <path d={pathD} fill="none" stroke={accent} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>

        {/* hover marker */}
        {hover !== null && (
          <g>
            <line x1={x(hover)} x2={x(hover)} y1={padTop} y2={h - padBot}
                  stroke="var(--ink-2)" strokeDasharray="2 3" opacity="0.4"/>
            <circle cx={x(hover)} cy={y(data[hover])} r="6" fill="white"
                    stroke={accent} strokeWidth="2.4"/>
          </g>
        )}

        {/* x labels */}
        {tickI.map((i, k) => (
          <text key={k} x={x(i)} y={h - 8} textAnchor="middle"
                fontSize="11" fontFamily="var(--font-num)"
                fill="var(--muted)">{monthLabels[k % monthLabels.length]}</text>
        ))}
      </svg>

      {hover !== null && (
        <div style={{
          position:"absolute",
          left: x(hover),
          top: y(data[hover]) - 50,
          transform: "translateX(-50%)",
          background: "var(--ink)",
          color: "var(--bg)",
          padding: "6px 10px",
          borderRadius: 10,
          fontSize: 12,
          fontFamily: "var(--font-num)",
          fontWeight: 700,
          whiteSpace:"nowrap",
          pointerEvents:"none",
          boxShadow: "var(--shadow-pop)"
        }}>
          ฿{Math.round(data[hover]).toLocaleString()}
        </div>
      )}
    </div>
  );
}

function Sparkline({ data, color, width = 80, height = 24 }) {
  if (!data || data.length === 0) return null;
  const min = Math.min(...data), max = Math.max(...data);
  const span = max - min || 1;
  const x = i => (i / (data.length - 1)) * width;
  const y = v => height - 2 - ((v - min) / span) * (height - 4);
  let d = "";
  data.forEach((v, i) => { d += (i === 0 ? "M" : "L") + x(i) + " " + y(v); });
  const up = data[data.length - 1] >= data[0];
  return (
    <svg width={width} height={height} className="spark">
      <path d={d} fill="none" stroke={color || (up ? "var(--up)" : "var(--down)")}
            strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

// Donut for allocation (used in detail view)
function Donut({ segments, size = 140, thickness = 18 }) {
  const r = (size - thickness) / 2;
  const c = 2 * Math.PI * r;
  let offset = 0;
  const total = segments.reduce((s, x) => s + x.value, 0);
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size/2} cy={size/2} r={r} fill="none"
              stroke="var(--surface-2)" strokeWidth={thickness}/>
      {segments.map((s, i) => {
        const len = (s.value / total) * c;
        const el = (
          <circle key={i} cx={size/2} cy={size/2} r={r} fill="none"
                  stroke={s.color} strokeWidth={thickness}
                  strokeDasharray={`${len} ${c - len}`}
                  strokeDashoffset={-offset}
                  transform={`rotate(-90 ${size/2} ${size/2})`}
                  strokeLinecap="butt"/>
        );
        offset += len;
        return el;
      })}
    </svg>
  );
}

window.LineChart = LineChart;
window.Sparkline = Sparkline;
window.Donut = Donut;
