"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  BadgeDollarSign,
  Barcode,
  Boxes,
  ChevronDown,
  CircleAlert,
  ClipboardList,
  CreditCard,
  FileText,
  LayoutDashboard,
  LogOut,
  Menu,
  Minus,
  PackagePlus,
  Plus,
  Printer,
  QrCode,
  ReceiptText,
  Search,
  ShoppingBasket,
  Store,
  Trash2,
  TrendingUp,
  UserRound,
  UsersRound,
  WalletCards,
  X
} from "lucide-react";

const STORAGE_KEY = "siamfolio-grocery-pos-v1";
const PUBLIC_BASE = process.env.NEXT_PUBLIC_BASE_PATH || "";

const seedProducts = [
  { id: "p1", barcode: "8850127000011", name: "นมสดรสจืด", category: "เครื่องดื่ม", price: 27, cost: 21, stock: 34, minStock: 8, unit: "ขวด", color: "#dbeafe", image: `${PUBLIC_BASE}/products/milk.jpg` },
  { id: "p2", barcode: "8850157002443", name: "น้ำดื่ม 600 มล.", category: "เครื่องดื่ม", price: 10, cost: 6, stock: 68, minStock: 12, unit: "ขวด", color: "#cffafe", image: `${PUBLIC_BASE}/products/water.jpg` },
  { id: "p3", barcode: "8850987003016", name: "บะหมี่กึ่งสำเร็จรูป", category: "อาหารแห้ง", price: 8, cost: 5.5, stock: 46, minStock: 15, unit: "ซอง", color: "#ffedd5", image: `${PUBLIC_BASE}/products/noodles.jpg` },
  { id: "p4", barcode: "8850004000189", name: "ไข่ไก่เบอร์ 2", category: "ของสด", price: 48, cost: 39, stock: 9, minStock: 10, unit: "แพ็ก", color: "#fef3c7", image: `${PUBLIC_BASE}/products/eggs.jpg` },
  { id: "p5", barcode: "8850049001141", name: "ข้าวหอมมะลิ 5 กก.", category: "อาหารแห้ง", price: 189, cost: 162, stock: 18, minStock: 5, unit: "ถุง", color: "#dcfce7", image: `${PUBLIC_BASE}/products/rice.jpg` },
  { id: "p6", barcode: "8851004802216", name: "กาแฟกระป๋อง", category: "เครื่องดื่ม", price: 17, cost: 12, stock: 27, minStock: 10, unit: "กระป๋อง", color: "#fee2e2", image: `${PUBLIC_BASE}/products/coffee.jpg` },
  { id: "p7", barcode: "8851932293110", name: "น้ำยาล้างจาน", category: "ของใช้", price: 42, cost: 31, stock: 14, minStock: 6, unit: "ขวด", color: "#ede9fe", image: `${PUBLIC_BASE}/products/dishsoap.jpg` },
  { id: "p8", barcode: "8850002011972", name: "ขนมปังแผ่น", category: "ขนม", price: 35, cost: 25, stock: 7, minStock: 8, unit: "ห่อ", color: "#fef3c7", image: `${PUBLIC_BASE}/products/bread.jpg` },
  { id: "p9", barcode: "8857123980013", name: "มันฝรั่งทอดกรอบ", category: "ขนม", price: 20, cost: 14, stock: 22, minStock: 8, unit: "ซอง", color: "#ffedd5", image: `${PUBLIC_BASE}/products/chips.jpg` },
  { id: "p10", barcode: "8851954104104", name: "ทิชชู 6 ม้วน", category: "ของใช้", price: 69, cost: 52, stock: 16, minStock: 5, unit: "แพ็ก", color: "#f3f4f6", image: `${PUBLIC_BASE}/products/tissue.jpg` }
];

const seedReceipts = [
  { id: "R-260613-001", createdAt: "2026-06-13T08:46:00+07:00", cashier: "แอดดี้", payment: "เงินสด", total: 126, items: [{ name: "นมสดรสจืด", qty: 2, price: 27 }, { name: "บะหมี่กึ่งสำเร็จรูป", qty: 4, price: 8 }, { name: "น้ำดื่ม 600 มล.", qty: 4, price: 10 }] },
  { id: "R-260613-002", createdAt: "2026-06-13T09:18:00+07:00", cashier: "แอดดี้", payment: "QR", total: 224, items: [{ name: "ข้าวหอมมะลิ 5 กก.", qty: 1, price: 189 }, { name: "ขนมปังแผ่น", qty: 1, price: 35 }] }
];

const salesTrend = [
  { day: "จ.", sales: 4260 }, { day: "อ.", sales: 5180 }, { day: "พ.", sales: 4790 },
  { day: "พฤ.", sales: 6210 }, { day: "ศ.", sales: 7840 }, { day: "ส.", sales: 9120 }, { day: "อา.", sales: 6880 }
];

const navItems = [
  ["sale", "แคชเชียร์", ShoppingBasket],
  ["products", "สินค้า", Boxes],
  ["stock", "สต๊อก", ClipboardList],
  ["reports", "รายงาน", TrendingUp],
  ["receipts", "ใบเสร็จ", ReceiptText],
  ["users", "ผู้ใช้", UsersRound]
];

const money = (value) => new Intl.NumberFormat("th-TH", { style: "currency", currency: "THB", maximumFractionDigits: 2 }).format(value || 0);
const shortDate = (value) => new Intl.DateTimeFormat("th-TH", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
const uid = (prefix) => `${prefix}-${Date.now().toString(36).toUpperCase()}`;

function readLocalState() {
  if (typeof window === "undefined") return null;
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)); } catch { return null; }
}

function StatusPill({ children, tone = "green" }) {
  return <span className={`status-pill ${tone}`}>{children}</span>;
}

function EmptyState({ title, detail }) {
  return <div className="empty-state"><ShoppingBasket size={30} /><strong>{title}</strong><span>{detail}</span></div>;
}

export default function PosApp() {
  const [active, setActive] = useState("sale");
  const [products, setProducts] = useState(seedProducts);
  const [receipts, setReceipts] = useState(seedReceipts);
  const [cart, setCart] = useState([]);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("ทั้งหมด");
  const [discount, setDiscount] = useState(0);
  const [mobileCartOpen, setMobileCartOpen] = useState(false);
  const [productModal, setProductModal] = useState(null);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [receiptOpen, setReceiptOpen] = useState(null);
  const [toast, setToast] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [dataMode, setDataMode] = useState("Demo mode");
  const [now, setNow] = useState(() => new Date());
  const barcodeRef = useRef(null);

  useEffect(() => {
    const saved = readLocalState();
    if (saved?.products?.length) setProducts(saved.products);
    if (saved?.receipts?.length) setReceipts(saved.receipts);

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (url && key) {
      fetch(`${url}/rest/v1/products?select=*&order=name`, {
        headers: { apikey: key, Authorization: `Bearer ${key}` }
      }).then((response) => response.ok ? response.json() : Promise.reject(new Error("Supabase unavailable")))
      .then((data) => {
        if (data?.length) {
          setProducts(data.map((p) => ({ ...p, minStock: p.min_stock })));
          setDataMode("Supabase online");
        }
      }).catch(() => setDataMode("Demo mode"));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ products, receipts }));
  }, [products, receipts]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 2600);
    return () => clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    const clock = setInterval(() => setNow(new Date()), 1000);
    const shortcuts = (event) => {
      if (event.key === "F2") {
        event.preventDefault();
        barcodeRef.current?.focus();
      }
      if (event.key === "F4" && cart.length) {
        event.preventDefault();
        setPaymentOpen(true);
      }
    };
    window.addEventListener("keydown", shortcuts);
    return () => {
      clearInterval(clock);
      window.removeEventListener("keydown", shortcuts);
    };
  }, [cart.length]);

  const categories = useMemo(() => ["ทั้งหมด", ...new Set(products.map((p) => p.category))], [products]);
  const filteredProducts = useMemo(() => products.filter((product) => {
    const matchCategory = category === "ทั้งหมด" || product.category === category;
    const needle = query.trim().toLowerCase();
    return matchCategory && (!needle || product.name.toLowerCase().includes(needle) || product.barcode.includes(needle));
  }), [products, category, query]);
  const subtotal = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  const total = Math.max(0, subtotal - discount);
  const lowStock = products.filter((p) => p.stock <= p.minStock);
  const todaySales = receipts.filter((r) => new Date(r.createdAt).toDateString() === new Date().toDateString()).reduce((sum, r) => sum + r.total, 0);

  function addToCart(product) {
    if (product.stock <= 0) return setToast("สินค้าหมดสต๊อก");
    setCart((current) => {
      const found = current.find((item) => item.id === product.id);
      if (found) return current.map((item) => item.id === product.id ? { ...item, qty: Math.min(item.qty + 1, product.stock) } : item);
      return [...current, { ...product, qty: 1 }];
    });
    setToast(`เพิ่ม ${product.name} แล้ว`);
  }

  function updateQty(id, change) {
    setCart((current) => current.map((item) => item.id === id ? { ...item, qty: Math.max(0, Math.min(item.stock, item.qty + change)) } : item).filter((item) => item.qty > 0));
  }

  function scanBarcode(event) {
    if (event.key !== "Enter") return;
    const product = products.find((item) => item.barcode === query.trim());
    if (product) { addToCart(product); setQuery(""); }
    else setToast("ไม่พบบาร์โค้ดนี้ ลองเพิ่มสินค้าใหม่");
  }

  function completeSale(method, received = total) {
    const receipt = {
      id: `R-${new Date().toISOString().slice(2, 10).replaceAll("-", "")}-${String(receipts.length + 1).padStart(3, "0")}`,
      createdAt: new Date().toISOString(), cashier: "แอดดี้", payment: method, total,
      received, change: Math.max(0, received - total), discount,
      items: cart.map(({ id, name, qty, price }) => ({ id, name, qty, price }))
    };
    setReceipts((current) => [receipt, ...current]);
    setProducts((current) => current.map((product) => {
      const sold = cart.find((item) => item.id === product.id);
      return sold ? { ...product, stock: Math.max(0, product.stock - sold.qty) } : product;
    }));
    setCart([]); setDiscount(0); setPaymentOpen(false); setMobileCartOpen(false); setReceiptOpen(receipt);
  }

  function saveProduct(form) {
    const normalized = { ...form, price: Number(form.price), cost: Number(form.cost), stock: Number(form.stock), minStock: Number(form.minStock) };
    if (form.id) setProducts((items) => items.map((p) => p.id === form.id ? normalized : p));
    else setProducts((items) => [{ ...normalized, id: uid("P"), image: normalized.image || seedProducts[0].image }, ...items]);
    setProductModal(null); setToast("บันทึกสินค้าแล้ว");
  }

  return (
    <div className="app-shell">
      <aside className={`sidebar ${menuOpen ? "open" : ""}`}>
        <div className="brand-lockup"><span className="brand-icon"><Store size={24} /></span><div><strong>SiamFolio Cashier</strong><span>Grocery Checkout</span></div></div>
        <nav className="main-nav">
          {navItems.map(([id, label, Icon]) => <button key={id} className={active === id ? "active" : ""} onClick={() => { setActive(id); setMenuOpen(false); }}><Icon size={19} /><span>{label}</span>{id === "stock" && lowStock.length > 0 && <b>{lowStock.length}</b>}</button>)}
        </nav>
        <div className="sidebar-foot"><div className="cashier"><span className="avatar">A</span><div><strong>แอดดี้</strong><span>แคชเชียร์ · กะเช้า</span></div></div><a href="../dashboard-design.html"><LogOut size={17} /> กลับแดชบอร์ด</a></div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <button className="icon-button mobile-menu" onClick={() => setMenuOpen(!menuOpen)} aria-label="เปิดเมนู"><Menu size={21} /></button>
          <div><p className="eyebrow">{active === "sale" ? "ระบบแคชเชียร์" : navItems.find(([id]) => id === active)?.[1]}</p><h1>{active === "sale" ? "ขายหน้าร้าน" : navItems.find(([id]) => id === active)?.[1]}</h1></div>
          <div className="topbar-actions"><StatusPill>{dataMode}</StatusPill><div className="shift-chip"><span>กะเช้า · จุดขาย 01</span><strong>{new Intl.DateTimeFormat("th-TH", { hour: "2-digit", minute: "2-digit", second: "2-digit" }).format(now)}</strong></div><button className="icon-button" aria-label="บัญชีผู้ใช้"><UserRound size={20} /></button></div>
        </header>

        {active === "sale" && <section className="sale-layout">
          <div className="catalog-panel">
            <div className="cashier-strip">
              <div><span>เลขที่บิลปัจจุบัน</span><strong>{`R-${now.toISOString().slice(2, 10).replaceAll("-", "")}-${String(receipts.length + 1).padStart(3, "0")}`}</strong></div>
              <div><span>พนักงานประจำจุดขาย</span><strong>แอดดี้ · Cashier 01</strong></div>
              <button type="button" onClick={() => setToast("เปิดลิ้นชักเก็บเงินแล้ว")}><BadgeDollarSign size={18} /> เปิดลิ้นชัก</button>
            </div>
            <div className="sale-tools">
              <label className="search-box"><Barcode size={20} /><input ref={barcodeRef} value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={scanBarcode} placeholder="สแกนบาร์โค้ด หรือค้นหาชื่อสินค้า" autoFocus /><kbd>F2 / Enter</kbd></label>
              <button className="secondary-button" onClick={() => setProductModal({})}><PackagePlus size={18} /> เพิ่มสินค้า</button>
            </div>
            <div className="category-row">{categories.map((item) => <button key={item} className={category === item ? "active" : ""} onClick={() => setCategory(item)}>{item}</button>)}</div>
            <div className="catalog-head"><div><strong>สินค้าในร้าน</strong><span>{filteredProducts.length} รายการ</span></div><span className="scanner-ready"><span /> เครื่องสแกนพร้อม</span></div>
            <div className="product-grid">{filteredProducts.map((product) => <button className="product-card" key={product.id} onClick={() => addToCart(product)} disabled={product.stock <= 0}>
              <div className="product-image" style={{ background: product.color }}><img src={product.image} alt="" /></div>
              <div className="product-copy"><strong>{product.name}</strong><span>{product.category}</span><div><b>{money(product.price)}</b><small className={product.stock <= product.minStock ? "low" : ""}>เหลือ {product.stock}</small></div></div>
            </button>)}</div>
          </div>
          <CartPanel cart={cart} subtotal={subtotal} total={total} discount={discount} setDiscount={setDiscount} updateQty={updateQty} clear={() => setCart([])} checkout={() => setPaymentOpen(true)} />
          <button className="mobile-cart-button" onClick={() => setMobileCartOpen(true)}><ShoppingBasket size={19} /><span>{cart.reduce((s, i) => s + i.qty, 0)} ชิ้น</span><strong>{money(total)}</strong></button>
          {mobileCartOpen && <div className="mobile-cart-overlay" onClick={() => setMobileCartOpen(false)}><div onClick={(e) => e.stopPropagation()}><CartPanel cart={cart} subtotal={subtotal} total={total} discount={discount} setDiscount={setDiscount} updateQty={updateQty} clear={() => setCart([])} checkout={() => setPaymentOpen(true)} close={() => setMobileCartOpen(false)} /></div></div>}
        </section>}

        {active === "products" && <ProductsView products={products} onEdit={setProductModal} onDelete={(id) => setProducts((items) => items.filter((p) => p.id !== id))} onAdd={() => setProductModal({})} />}
        {active === "stock" && <StockView products={products} setProducts={setProducts} />}
        {active === "reports" && <ReportsView todaySales={todaySales} receipts={receipts} products={products} />}
        {active === "receipts" && <ReceiptsView receipts={receipts} onOpen={setReceiptOpen} />}
        {active === "users" && <UsersView />}
      </main>

      {paymentOpen && <PaymentModal total={total} billNumber={`R-${now.toISOString().slice(2, 10).replaceAll("-", "")}-${String(receipts.length + 1).padStart(3, "0")}`} onClose={() => setPaymentOpen(false)} onComplete={completeSale} />}
      {productModal && <ProductModal product={productModal} categories={categories.filter((c) => c !== "ทั้งหมด")} onClose={() => setProductModal(null)} onSave={saveProduct} />}
      {receiptOpen && <ReceiptModal receipt={receiptOpen} onClose={() => setReceiptOpen(null)} />}
      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}

function CartPanel({ cart, subtotal, total, discount, setDiscount, updateQty, clear, checkout, close }) {
  return <aside className="cart-panel">
    <div className="cart-head"><div><span className="cart-icon"><ShoppingBasket size={20} /></span><div><strong>รายการขาย</strong><span>{cart.reduce((s, i) => s + i.qty, 0)} ชิ้น</span></div></div><div>{close && <button className="icon-button" onClick={close}><X size={18} /></button>}<button className="text-button danger" onClick={clear} disabled={!cart.length}>ล้าง</button></div></div>
    <div className="cart-items">{!cart.length ? <EmptyState title="ตะกร้ายังว่าง" detail="สแกนหรือแตะสินค้าเพื่อเริ่มขาย" /> : cart.map((item) => <div className="cart-item" key={item.id}><div className="cart-thumb"><img src={item.image} alt="" /></div><div className="cart-item-copy"><strong>{item.name}</strong><span>{money(item.price)} / {item.unit}</span><div className="qty-control"><button onClick={() => updateQty(item.id, -1)}><Minus size={14} /></button><b>{item.qty}</b><button onClick={() => updateQty(item.id, 1)}><Plus size={14} /></button></div></div><b>{money(item.price * item.qty)}</b></div>)}</div>
    <div className="cart-summary"><label><span>ส่วนลด</span><span className="discount-input"><span>฿</span><input type="number" min="0" max={subtotal} value={discount || ""} onChange={(e) => setDiscount(Math.max(0, Math.min(subtotal, Number(e.target.value))))} placeholder="0" /></span></label><div><span>ยอดรวม</span><strong>{money(total)}</strong></div><button className="checkout-button" disabled={!cart.length} onClick={checkout}><WalletCards size={20} /> รับชำระเงิน</button></div>
  </aside>;
}

function PaymentModal({ total, billNumber, onClose, onComplete }) {
  const [method, setMethod] = useState("เงินสด");
  const [received, setReceived] = useState(Math.ceil(total / 100) * 100);
  const methods = [["เงินสด", BadgeDollarSign], ["QR", QrCode], ["บัตร", CreditCard]];
  return <div className="modal-backdrop"><div className="modal payment-modal"><div className="modal-head"><div><span>รับชำระ · {billNumber}</span><h2>{money(total)}</h2></div><button className="icon-button" onClick={onClose}><X size={20} /></button></div><div className="payment-methods">{methods.map(([label, Icon]) => <button key={label} className={method === label ? "active" : ""} onClick={() => setMethod(label)}><Icon size={24} /><span>{label}</span></button>)}</div>{method === "เงินสด" && <div className="cash-entry"><label>รับเงินมา<input type="number" autoFocus value={received} onChange={(e) => setReceived(Number(e.target.value))} /></label><div className="quick-cash">{[total, Math.ceil(total / 100) * 100, 500, 1000].filter((v, i, a) => v >= total && a.indexOf(v) === i).map((v) => <button key={v} onClick={() => setReceived(v)}>{money(v)}</button>)}</div><div className="change-row"><span>เงินทอน</span><strong>{money(Math.max(0, received - total))}</strong></div></div>}<button className="confirm-payment" disabled={method === "เงินสด" && received < total} onClick={() => onComplete(method, received)}>ยืนยันและออกใบเสร็จ</button></div></div>;
}

function ProductModal({ product, categories, onClose, onSave }) {
  const [form, setForm] = useState({ id: product.id || "", barcode: product.barcode || "", name: product.name || "", category: product.category || categories[0] || "ทั่วไป", price: product.price || "", cost: product.cost || "", stock: product.stock ?? 0, minStock: product.minStock ?? 5, unit: product.unit || "ชิ้น", image: product.image || "", color: product.color || "#dcfce7" });
  const change = (key) => (e) => setForm({ ...form, [key]: e.target.value });
  return <div className="modal-backdrop"><form className="modal product-modal" onSubmit={(e) => { e.preventDefault(); onSave(form); }}><div className="modal-head"><div><span>จัดการสินค้า</span><h2>{product.id ? "แก้ไขสินค้า" : "เพิ่มสินค้าใหม่"}</h2></div><button type="button" className="icon-button" onClick={onClose}><X size={20} /></button></div><div className="form-grid"><label className="wide">ชื่อสินค้า<input required value={form.name} onChange={change("name")} /></label><label>บาร์โค้ด<input required value={form.barcode} onChange={change("barcode")} /></label><label>หมวดหมู่<select value={form.category} onChange={change("category")}>{categories.map((c) => <option key={c}>{c}</option>)}</select></label><label>ราคาขาย<input required type="number" min="0" step="0.01" value={form.price} onChange={change("price")} /></label><label>ต้นทุน<input required type="number" min="0" step="0.01" value={form.cost} onChange={change("cost")} /></label><label>สต๊อก<input required type="number" min="0" value={form.stock} onChange={change("stock")} /></label><label>เตือนเมื่อเหลือ<input required type="number" min="0" value={form.minStock} onChange={change("minStock")} /></label><label>หน่วย<input value={form.unit} onChange={change("unit")} /></label><label className="wide">ลิงก์รูปสินค้า<input value={form.image} onChange={change("image")} placeholder="https://..." /></label></div><div className="modal-actions"><button type="button" className="secondary-button" onClick={onClose}>ยกเลิก</button><button className="primary-button">บันทึกสินค้า</button></div></form></div>;
}

function ProductsView({ products, onEdit, onDelete, onAdd }) {
  const [search, setSearch] = useState("");
  const filtered = products.filter((p) => `${p.name} ${p.barcode}`.toLowerCase().includes(search.toLowerCase()));
  return <section className="content-page"><div className="page-toolbar"><label className="search-box compact"><Search size={18} /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="ค้นหาสินค้า" /></label><button className="primary-button" onClick={onAdd}><Plus size={18} /> เพิ่มสินค้า</button></div><div className="data-card"><div className="table-head products-columns"><span>สินค้า</span><span>บาร์โค้ด</span><span>ราคาขาย</span><span>คงเหลือ</span><span>สถานะ</span><span /></div>{filtered.map((product) => <div className="table-row products-columns" key={product.id}><div className="product-cell"><img src={product.image} alt="" /><div><strong>{product.name}</strong><span>{product.category}</span></div></div><span className="mono">{product.barcode}</span><strong>{money(product.price)}</strong><span>{product.stock} {product.unit}</span><StatusPill tone={product.stock <= product.minStock ? "amber" : "green"}>{product.stock <= product.minStock ? "ใกล้หมด" : "พร้อมขาย"}</StatusPill><div className="row-actions"><button onClick={() => onEdit(product)}>แก้ไข</button><button className="danger" onClick={() => confirm(`ลบ ${product.name}?`) && onDelete(product.id)}><Trash2 size={16} /></button></div></div>)}</div></section>;
}

function StockView({ products, setProducts }) {
  function adjust(id, amount) { setProducts((items) => items.map((p) => p.id === id ? { ...p, stock: Math.max(0, p.stock + amount) } : p)); }
  return <section className="content-page"><div className="metric-strip"><Metric label="สินค้าทั้งหมด" value={`${products.length} รายการ`} icon={Boxes} /><Metric label="ใกล้หมด" value={`${products.filter((p) => p.stock <= p.minStock).length} รายการ`} icon={CircleAlert} tone="amber" /><Metric label="มูลค่าสต๊อก" value={money(products.reduce((s, p) => s + p.cost * p.stock, 0))} icon={BadgeDollarSign} /></div><div className="data-card"><div className="table-head stock-columns"><span>สินค้า</span><span>คงเหลือ</span><span>จุดเตือน</span><span>มูลค่า</span><span>ปรับสต๊อก</span></div>{products.map((product) => <div className="table-row stock-columns" key={product.id}><div className="product-cell"><img src={product.image} alt="" /><div><strong>{product.name}</strong><span>{product.barcode}</span></div></div><strong className={product.stock <= product.minStock ? "negative" : ""}>{product.stock} {product.unit}</strong><span>{product.minStock} {product.unit}</span><span>{money(product.cost * product.stock)}</span><div className="stock-stepper"><button onClick={() => adjust(product.id, -1)}><Minus size={16} /></button><button onClick={() => adjust(product.id, 1)}><Plus size={16} /></button><button onClick={() => adjust(product.id, 10)}>+10</button></div></div>)}</div></section>;
}

function Metric({ label, value, icon: Icon, tone = "green", detail }) { return <div className={`metric-card ${tone}`}><span className="metric-icon"><Icon size={21} /></span><div><span>{label}</span><strong>{value}</strong>{detail && <small>{detail}</small>}</div></div>; }

function ReportsView({ todaySales, receipts, products }) {
  const gross = receipts.reduce((s, r) => s + r.total, 0);
  const stockValue = products.reduce((s, p) => s + p.cost * p.stock, 0);
  const chartMax = Math.max(...salesTrend.map((item) => item.sales));
  return <section className="content-page reports-page"><div className="metric-strip four"><Metric label="ยอดขายวันนี้" value={money(todaySales)} icon={BadgeDollarSign} detail={`${receipts.length} ใบเสร็จ`} /><Metric label="ยอดขายทั้งหมด" value={money(gross)} icon={TrendingUp} /><Metric label="มูลค่าสต๊อก" value={money(stockValue)} icon={Boxes} tone="blue" /><Metric label="สินค้าใกล้หมด" value={`${products.filter((p) => p.stock <= p.minStock).length} รายการ`} icon={CircleAlert} tone="amber" /></div><div className="report-grid"><div className="chart-card"><div className="section-title"><div><strong>ยอดขาย 7 วัน</strong><span>ภาพรวมรายวัน</span></div><StatusPill>อัปเดตล่าสุด</StatusPill></div><div className="sales-chart" aria-label="กราฟยอดขาย 7 วัน">{salesTrend.map((item) => <div className="sales-column" key={item.day}><span>{money(item.sales)}</span><div style={{ height: `${Math.max(14, (item.sales / chartMax) * 100)}%` }} title={`${item.day} ${money(item.sales)}`} /><b>{item.day}</b></div>)}</div></div><div className="best-sellers"><div className="section-title"><div><strong>สินค้าขายดี</strong><span>จากใบเสร็จล่าสุด</span></div></div>{products.slice(0, 5).map((p, index) => <div className="rank-row" key={p.id}><b>{index + 1}</b><img src={p.image} alt="" /><div><strong>{p.name}</strong><span>{p.category}</span></div><em>{Math.max(3, 18 - index * 3)} ชิ้น</em></div>)}</div></div></section>;
}

function ReceiptsView({ receipts, onOpen }) { return <section className="content-page"><div className="data-card"><div className="table-head receipt-columns"><span>เลขที่ใบเสร็จ</span><span>วันและเวลา</span><span>พนักงาน</span><span>ชำระด้วย</span><span>ยอดสุทธิ</span><span /></div>{receipts.map((receipt) => <button className="table-row receipt-columns receipt-button" key={receipt.id} onClick={() => onOpen(receipt)}><strong>{receipt.id}</strong><span>{shortDate(receipt.createdAt)}</span><span>{receipt.cashier}</span><StatusPill>{receipt.payment}</StatusPill><strong>{money(receipt.total)}</strong><span className="open-detail">ดูใบเสร็จ</span></button>)}</div></section>; }

function UsersView() { const users = [{ name: "แอดดี้", email: "hongame5678@gmail.com", role: "ผู้ดูแลร้าน", status: "กำลังใช้งาน" }, { name: "พนักงานกะบ่าย", email: "cashier@siamfolio.local", role: "แคชเชียร์", status: "พร้อมใช้งาน" }]; return <section className="content-page"><div className="page-toolbar"><div><strong>ผู้ใช้งานระบบ</strong><span className="toolbar-note">กำหนดสิทธิ์ผู้ดูแลและแคชเชียร์</span></div><button className="primary-button"><Plus size={18} /> เชิญผู้ใช้</button></div><div className="user-grid">{users.map((user) => <div className="user-card" key={user.email}><span className="large-avatar">{user.name[0]}</span><div><strong>{user.name}</strong><span>{user.email}</span></div><StatusPill>{user.status}</StatusPill><div className="user-role"><UserRound size={16}/><span>{user.role}</span><ChevronDown size={15}/></div></div>)}</div></section>; }

function ReceiptModal({ receipt, onClose }) { return <div className="modal-backdrop"><div className="modal receipt-modal"><div className="modal-head no-print"><div><span>การขายสำเร็จ</span><h2>ใบเสร็จ {receipt.id}</h2></div><button className="icon-button" onClick={onClose}><X size={20}/></button></div><div className="receipt-paper"><div className="receipt-brand"><Store size={26}/><strong>SiamFolio Cashier</strong><span>ขอบคุณที่อุดหนุน</span></div><div className="receipt-meta"><span>{receipt.id}</span><span>{shortDate(receipt.createdAt)}</span><span>พนักงาน: {receipt.cashier} · จุดขาย 01</span></div>{receipt.items.map((item, index) => <div className="receipt-line" key={index}><div><strong>{item.name}</strong><span>{item.qty} x {money(item.price)}</span></div><b>{money(item.qty * item.price)}</b></div>)}<div className="receipt-total"><span>ยอดสุทธิ</span><strong>{money(receipt.total)}</strong></div><div className="receipt-payment"><span>ชำระโดย {receipt.payment}</span>{receipt.change > 0 && <span>เงินทอน {money(receipt.change)}</span>}</div></div><div className="modal-actions no-print"><button className="secondary-button" onClick={onClose}>ปิด</button><button className="primary-button" onClick={() => window.print()}><Printer size={18}/> พิมพ์ใบเสร็จ</button></div></div></div>; }
