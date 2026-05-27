// SVG icon set — clean line icons, friendly stroke weight
const Ico = ({ name, size = 18, stroke = 1.7 }) => {
  const P = (d, fill = false) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
         stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round">
      {d}
    </svg>
  );
  switch (name) {
    case "home":     return P(<><path d="M3 11.5L12 4l9 7.5"/><path d="M5 10v9a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1v-9"/></>);
    case "wallet":   return P(<><rect x="3" y="6" width="18" height="14" rx="3"/><path d="M3 10h18"/><circle cx="17" cy="15" r="1.2" fill="currentColor"/></>);
    case "dca":      return P(<><path d="M4 19V5"/><path d="M4 19h16"/><path d="M8 16v-4"/><path d="M12 16V8"/><path d="M16 16V11"/><circle cx="20" cy="5" r="2"/></>);
    case "earn":     return P(<><circle cx="12" cy="12" r="8"/><path d="M12 8v4l3 2"/><path d="M21 7l-2-1M3 7l2-1"/></>);
    case "history":  return P(<><path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 4v5h5"/><path d="M12 8v5l3 2"/></>);
    case "tax":      return P(<><rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 8h8M8 12h8M8 16h5"/></>);
    case "bench":    return P(<><path d="M3 17l5-6 4 4 8-9"/><path d="M14 6h6v6"/></>);
    case "settings": return P(<><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3h0a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5h0a1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9v0a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></>);
    case "search":   return P(<><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></>);
    case "bell":     return P(<><path d="M6 8a6 6 0 0 1 12 0c0 7 3 7 3 9H3c0-2 3-2 3-9"/><path d="M10 21a2 2 0 0 0 4 0"/></>);
    case "eye":      return P(<><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></>);
    case "arrow-up": return P(<><path d="M7 17L17 7"/><path d="M8 7h9v9"/></>);
    case "arrow-dn": return P(<><path d="M17 7L7 17"/><path d="M16 17H7V8"/></>);
    case "plus":     return P(<><path d="M12 5v14M5 12h14"/></>);
    case "back":     return P(<><path d="M15 18l-6-6 6-6"/></>);
    case "calendar": return P(<><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 9h18M8 3v4M16 3v4"/></>);
    case "edit":     return P(<><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></>);
    case "chev-r":   return P(<><path d="M9 6l6 6-6 6"/></>);
    case "chev-d":   return P(<><path d="M6 9l6 6 6-6"/></>);
    case "more":     return P(<><circle cx="5" cy="12" r="1.4" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none"/><circle cx="19" cy="12" r="1.4" fill="currentColor" stroke="none"/></>);
    case "spark":    return P(<><path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 16.8 5.8 21.3l2.4-7.4L2 9.4h7.6z"/></>);
    case "lock":     return P(<><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></>);
    case "alert":    return P(<><circle cx="12" cy="12" r="9"/><path d="M12 8v5M12 16v.5"/></>);
    case "swap":     return P(<><path d="M7 4l-3 3 3 3"/><path d="M4 7h12a4 4 0 0 1 0 8h-1"/><path d="M17 20l3-3-3-3"/><path d="M20 17H8a4 4 0 0 1 0-8h1"/></>);
    case "trash":    return P(<><path d="M4 7h16"/><path d="M10 11v6M14 11v6"/><path d="M6 7l1 13a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-13"/><path d="M9 7V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v3"/></>);
    case "x":        return P(<><path d="M6 6l12 12M18 6L6 18"/></>);
    case "pause":    return P(<><rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/></>);
    default: return null;
  }
};

window.Ico = Ico;
