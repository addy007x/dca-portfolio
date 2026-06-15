"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  BadgeDollarSign,
  Bell,
  Barcode,
  Boxes,
  Camera,
  ChevronDown,
  CircleAlert,
  ClipboardList,
  CreditCard,
  FileText,
  Grid3X3,
  LayoutDashboard,
  LogOut,
  List,
  Menu,
  Minus,
  PackagePlus,
  Plus,
  Printer,
  QrCode,
  ReceiptText,
  Search,
  Settings,
  ShoppingBasket,
  Store,
  Tag,
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
  ["sale", "หน้าขายสินค้า", ShoppingBasket],
  ["receipts", "ประวัติการขาย", ReceiptText],
  ["users", "ลูกค้าและผู้ใช้", UsersRound],
  ["products", "สินค้า", Boxes],
  ["stock", "สต๊อกสินค้า", ClipboardList],
  ["reports", "รายงาน", TrendingUp]
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
  const [sortMode, setSortMode] = useState("popular");
  const [productView, setProductView] = useState("grid");
  const [discount, setDiscount] = useState(0);
  const [mobileCartOpen, setMobileCartOpen] = useState(false);
  const [productModal, setProductModal] = useState(null);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [receiptOpen, setReceiptOpen] = useState(null);
  const [scannerSession, setScannerSession] = useState(null);
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

  useEffect(() => {
    const previewMode = new URLSearchParams(window.location.search).get("scanner");
    if (previewMode === "sale") openSaleScanner();
    if (previewMode === "product") {
      setProductModal({});
      openProductScanner((barcode) => setProductModal({ barcode }));
    }
  }, []);

  const categories = useMemo(() => ["ทั้งหมด", ...new Set(products.map((p) => p.category))], [products]);
  const filteredProducts = useMemo(() => products.filter((product) => {
    const matchCategory = category === "ทั้งหมด" || product.category === category;
    const needle = query.trim().toLowerCase();
    return matchCategory && (!needle || product.name.toLowerCase().includes(needle) || product.barcode.includes(needle));
  }).sort((a, b) => {
    if (sortMode === "price-low") return a.price - b.price;
    if (sortMode === "price-high") return b.price - a.price;
    if (sortMode === "name") return a.name.localeCompare(b.name, "th");
    return b.stock - a.stock;
  }), [products, category, query, sortMode]);
  const subtotal = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  const total = Math.max(0, subtotal - discount);
  const billNumber = `R-${now.toISOString().slice(2, 10).replaceAll("-", "")}-${String(receipts.length + 1).padStart(3, "0")}`;
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

  function processSaleBarcode(rawBarcode) {
    const barcode = rawBarcode.trim();
    if (!barcode) return;
    const product = products.find((item) => item.barcode === barcode);
    if (product) {
      addToCart(product);
      setQuery("");
      return;
    }
    setQuery("");
    setProductModal({ barcode });
    setToast("ยังไม่มีสินค้านี้ กรอกข้อมูลเพิ่มได้เลย");
  }

  function scanBarcode(event) {
    if (event.key !== "Enter") return;
    processSaleBarcode(query);
  }

  function openSaleScanner() {
    setScannerSession({
      mode: "sale",
      title: "สแกนสินค้าที่ขาย",
      detail: "เล็งบาร์โค้ดให้อยู่กลางกรอบ ระบบจะเพิ่มสินค้าเข้าตะกร้าอัตโนมัติ",
      onDetected: processSaleBarcode
    });
  }

  function openProductScanner(onDetected) {
    setScannerSession({
      mode: "product",
      title: "สแกนบาร์โค้ดสินค้าใหม่",
      detail: "เมื่อสแกนสำเร็จ เลขบาร์โค้ดจะถูกกรอกในฟอร์มสินค้าให้ทันที",
      onDetected
    });
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
    <div className="app-shell fast-counter">
      <aside className={`sidebar ${menuOpen ? "open" : ""}`}>
        <div className="brand-lockup"><span className="brand-icon"><ShoppingBasket size={25} /></span><div><strong>SiamFolio</strong><span>Smart POS System</span></div></div>
        <nav className="main-nav">
          {navItems.map(([id, label, Icon]) => <button key={id} className={active === id ? "active" : ""} onClick={() => { setActive(id); setMenuOpen(false); }}><Icon size={19} /><span>{label}</span>{id === "stock" && lowStock.length > 0 && <b>{lowStock.length}</b>}</button>)}
          <button type="button" onClick={() => setToast("หน้าตั้งค่ากำลังเตรียมพร้อม")}><Settings size={19} /><span>ตั้งค่า</span></button>
        </nav>
        <div className="sidebar-sales"><span>ยอดขายวันนี้</span><strong>{money(todaySales)}</strong><small>{receipts.length} รายการ</small></div>
        <div className="sidebar-foot"><a href="../dashboard-design.html"><LogOut size={17} /> ออกจากระบบ</a><div className="cashier"><span className="avatar">A</span><div><strong>แอดดี้</strong><span>แคชเชียร์ · จุดขาย 01</span></div><ChevronDown size={15} /></div></div>
      </aside>

      <main className="main-area">
        <header className={`topbar ${active === "sale" ? "sale-topbar" : ""}`}>
          <button className="icon-button mobile-menu" onClick={() => setMenuOpen(!menuOpen)} aria-label="เปิดเมนู"><Menu size={21} /></button>
          {active === "sale" ? <>
            <label className="top-search"><Search size={22} /><input ref={barcodeRef} value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={scanBarcode} placeholder="ค้นหาสินค้า / สแกนบาร์โค้ด" autoFocus /><button type="button" aria-label="เปิดกล้องสแกนบาร์โค้ด" title="เปิดกล้องสแกนบาร์โค้ด" onClick={openSaleScanner}><Barcode size={22} /></button></label>
            <button className="top-action promotion" type="button" onClick={() => setToast("แสดงสินค้าที่ร่วมโปรโมชั่น")}><Tag size={19} /><span>สินค้าโปรโมชั่น</span></button>
            <button className="top-action customer" type="button" onClick={() => setActive("users")}><UserRound size={19} /><span>ลูกค้าทั่วไป</span></button>
            <button className="icon-button notification-button" type="button" onClick={() => setToast(`มีสินค้าใกล้หมด ${lowStock.length} รายการ`)} aria-label="การแจ้งเตือน"><Bell size={20} />{lowStock.length > 0 && <b>{lowStock.length}</b>}</button>
            <div className="date-clock"><span>{new Intl.DateTimeFormat("th-TH", { dateStyle: "medium" }).format(now)}</span><strong>{new Intl.DateTimeFormat("en-US", { hour: "2-digit", minute: "2-digit" }).format(now)}</strong></div>
            <button className="icon-button" type="button" onClick={() => setToast(dataMode)} aria-label="ตั้งค่า"><Settings size={20} /></button>
          </> : <>
            <div><p className="eyebrow">ระบบจัดการร้านค้า</p><h1>{navItems.find(([id]) => id === active)?.[1]}</h1></div>
            <div className="topbar-actions"><StatusPill>{dataMode}</StatusPill><div className="shift-chip"><span>กะเช้า · จุดขาย 01</span><strong>{new Intl.DateTimeFormat("th-TH", { hour: "2-digit", minute: "2-digit", second: "2-digit" }).format(now)}</strong></div><button className="icon-button" aria-label="บัญชีผู้ใช้"><UserRound size={20} /></button></div>
          </>}
        </header>

        {active === "sale" && <section className="sale-layout">
          <div className="catalog-panel">
            <div className="category-row">{categories.map((item, index) => <button key={item} className={category === item ? "active" : ""} onClick={() => setCategory(item)}><span className="category-icon">{index === 0 ? <Grid3X3 size={21} /> : <Store size={21} />}</span><span>{item}</span></button>)}<button className="add-product-category" onClick={() => setProductModal({})}><span className="category-icon"><PackagePlus size={21} /></span><span>เพิ่มสินค้า</span></button></div>
            <div className="catalog-head"><div><strong>สินค้าทั้งหมด</strong><span>{filteredProducts.length} รายการ · บิล {billNumber}</span></div><div className="catalog-actions"><select value={sortMode} onChange={(e) => setSortMode(e.target.value)} aria-label="เรียงสินค้า"><option value="popular">เรียงตาม: ยอดนิยม</option><option value="price-low">ราคาต่ำไปสูง</option><option value="price-high">ราคาสูงไปต่ำ</option><option value="name">ชื่อสินค้า</option></select><button className={productView === "grid" ? "active" : ""} onClick={() => setProductView("grid")} aria-label="มุมมองตาราง"><Grid3X3 size={18}/></button><button className={productView === "list" ? "active" : ""} onClick={() => setProductView("list")} aria-label="มุมมองรายการ"><List size={18}/></button></div></div>
            <div className={`product-grid ${productView === "list" ? "list-view" : ""}`}>{filteredProducts.map((product) => <button className="product-card" key={product.id} onClick={() => addToCart(product)} disabled={product.stock <= 0}>
              <div className="product-image" style={{ background: product.color }}><img src={product.image} alt="" /></div>
              <div className="product-copy"><strong>{product.name}</strong><span>{product.category}</span><div><b>{money(product.price)}</b><small className={product.stock <= product.minStock ? "low" : ""}>คงเหลือ {product.stock}</small></div></div>
            </button>)}</div>
          </div>
          <CartPanel billNumber={billNumber} cart={cart} subtotal={subtotal} total={total} discount={discount} setDiscount={setDiscount} updateQty={updateQty} clear={() => setCart([])} checkout={() => setPaymentOpen(true)} />
          <button className="mobile-cart-button" onClick={() => setMobileCartOpen(true)}><ShoppingBasket size={19} /><span>{cart.reduce((s, i) => s + i.qty, 0)} ชิ้น</span><strong>{money(total)}</strong></button>
          {mobileCartOpen && <div className="mobile-cart-overlay" onClick={() => setMobileCartOpen(false)}><div onClick={(e) => e.stopPropagation()}><CartPanel billNumber={billNumber} cart={cart} subtotal={subtotal} total={total} discount={discount} setDiscount={setDiscount} updateQty={updateQty} clear={() => setCart([])} checkout={() => setPaymentOpen(true)} close={() => setMobileCartOpen(false)} /></div></div>}
        </section>}

        {active === "products" && <ProductsView products={products} onEdit={setProductModal} onDelete={(id) => setProducts((items) => items.filter((p) => p.id !== id))} onAdd={() => setProductModal({})} />}
        {active === "stock" && <StockView products={products} setProducts={setProducts} />}
        {active === "reports" && <ReportsView todaySales={todaySales} receipts={receipts} products={products} />}
        {active === "receipts" && <ReceiptsView receipts={receipts} onOpen={setReceiptOpen} />}
        {active === "users" && <UsersView />}
      </main>

      {paymentOpen && <PaymentModal total={total} billNumber={billNumber} onClose={() => setPaymentOpen(false)} onComplete={completeSale} />}
      {productModal && <ProductModal product={productModal} categories={categories.filter((c) => c !== "ทั้งหมด")} onClose={() => setProductModal(null)} onSave={saveProduct} onRequestScan={openProductScanner} />}
      {receiptOpen && <ReceiptModal receipt={receiptOpen} onClose={() => setReceiptOpen(null)} />}
      {scannerSession && <BarcodeScannerModal mode={scannerSession.mode} title={scannerSession.title} detail={scannerSession.detail} onClose={() => setScannerSession(null)} onDetected={(barcode) => {
        const handler = scannerSession.onDetected;
        setScannerSession(null);
        handler(barcode);
      }} />}
      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}

function CartPanel({ billNumber, cart, subtotal, total, discount, setDiscount, updateQty, clear, checkout, close }) {
  return <aside className="cart-panel">
    <div className="cart-head"><div><span className="cart-icon"><ShoppingBasket size={20} /></span><div><strong>บิลปัจจุบัน</strong><span>{billNumber} · {cart.reduce((s, i) => s + i.qty, 0)} ชิ้น</span></div></div><div>{close && <button className="icon-button" onClick={close}><X size={18} /></button>}<button className="text-button danger" onClick={clear} disabled={!cart.length}>ล้างบิล</button></div></div>
    <div className="cart-items">{!cart.length ? <EmptyState title="ตะกร้ายังว่าง" detail="สแกนหรือแตะสินค้าเพื่อเริ่มขาย" /> : cart.map((item) => <div className="cart-item" key={item.id}><div className="cart-thumb"><img src={item.image} alt="" /></div><div className="cart-item-copy"><strong>{item.name}</strong><span>{money(item.price)} / {item.unit}</span><div className="qty-control"><button onClick={() => updateQty(item.id, -1)}><Minus size={14} /></button><b>{item.qty}</b><button onClick={() => updateQty(item.id, 1)}><Plus size={14} /></button></div></div><b>{money(item.price * item.qty)}</b></div>)}</div>
    <div className="cart-summary">
      <div className="summary-line"><span>ยอดก่อนส่วนลด</span><b>{money(subtotal)}</b></div>
      <label><span>ส่วนลดท้ายบิล</span><span className="discount-input"><span>฿</span><input type="number" min="0" max={subtotal} value={discount || ""} onChange={(e) => setDiscount(Math.max(0, Math.min(subtotal, Number(e.target.value))))} placeholder="0" /></span></label>
      <div className="payable-total"><span>ยอดที่ต้องชำระ</span><strong>{money(total)}</strong></div>
      <div className="payment-hints"><span>เงินสด</span><span>QR</span><span>บัตร</span></div>
      <button className="checkout-button" disabled={!cart.length} onClick={checkout}><WalletCards size={20} /><span>รับชำระเงิน</span><kbd>F4</kbd></button>
    </div>
  </aside>;
}

function PaymentModal({ total, billNumber, onClose, onComplete }) {
  const [method, setMethod] = useState("เงินสด");
  const [received, setReceived] = useState(Math.ceil(total / 100) * 100);
  const methods = [["เงินสด", BadgeDollarSign], ["QR", QrCode], ["บัตร", CreditCard]];
  return <div className="modal-backdrop"><div className="modal payment-modal"><div className="modal-head"><div><span>รับชำระ · {billNumber}</span><h2>{money(total)}</h2></div><button className="icon-button" onClick={onClose}><X size={20} /></button></div><div className="payment-methods">{methods.map(([label, Icon]) => <button key={label} className={method === label ? "active" : ""} onClick={() => setMethod(label)}><Icon size={24} /><span>{label}</span></button>)}</div>{method === "เงินสด" && <div className="cash-entry"><label>รับเงินมา<input type="number" autoFocus value={received} onChange={(e) => setReceived(Number(e.target.value))} /></label><div className="quick-cash">{[total, Math.ceil(total / 100) * 100, 500, 1000].filter((v, i, a) => v >= total && a.indexOf(v) === i).map((v) => <button key={v} onClick={() => setReceived(v)}>{money(v)}</button>)}</div><div className="change-row"><span>เงินทอน</span><strong>{money(Math.max(0, received - total))}</strong></div></div>}<button className="confirm-payment" disabled={method === "เงินสด" && received < total} onClick={() => onComplete(method, received)}>ยืนยันและออกใบเสร็จ</button></div></div>;
}

function ProductModal({ product, categories, onClose, onSave, onRequestScan }) {
  const [form, setForm] = useState({ id: product.id || "", barcode: product.barcode || "", name: product.name || "", category: product.category || categories[0] || "ทั่วไป", price: product.price || "", cost: product.cost || "", stock: product.stock ?? 0, minStock: product.minStock ?? 5, unit: product.unit || "ชิ้น", image: product.image || "", color: product.color || "#dcfce7" });
  const change = (key) => (e) => setForm({ ...form, [key]: e.target.value });
  return <div className="modal-backdrop"><form className="modal product-modal" onSubmit={(e) => { e.preventDefault(); onSave(form); }}><div className="modal-head"><div><span>จัดการสินค้า</span><h2>{product.id ? "แก้ไขสินค้า" : "เพิ่มสินค้าใหม่"}</h2></div><button type="button" className="icon-button" onClick={onClose}><X size={20} /></button></div><div className="form-grid"><label className="wide">ชื่อสินค้า<input required value={form.name} onChange={change("name")} /></label><label>บาร์โค้ด<div className="input-with-action"><input required inputMode="numeric" value={form.barcode} onChange={change("barcode")} /><button type="button" className="scan-field-button" onClick={() => onRequestScan((barcode) => setForm((current) => ({ ...current, barcode })))}><Barcode size={17} /><span>สแกน</span></button></div></label><label>หมวดหมู่<select value={form.category} onChange={change("category")}>{categories.map((c) => <option key={c}>{c}</option>)}</select></label><label>ราคาขาย<input required type="number" min="0" step="0.01" value={form.price} onChange={change("price")} /></label><label>ต้นทุน<input required type="number" min="0" step="0.01" value={form.cost} onChange={change("cost")} /></label><label>สต๊อก<input required type="number" min="0" value={form.stock} onChange={change("stock")} /></label><label>เตือนเมื่อเหลือ<input required type="number" min="0" value={form.minStock} onChange={change("minStock")} /></label><label>หน่วย<input value={form.unit} onChange={change("unit")} /></label><label className="wide">ลิงก์รูปสินค้า<input value={form.image} onChange={change("image")} placeholder="https://..." /></label></div><div className="modal-actions"><button type="button" className="secondary-button" onClick={onClose}>ยกเลิก</button><button className="primary-button">บันทึกสินค้า</button></div></form></div>;
}

function BarcodeScannerModal({ mode, title, detail, onClose, onDetected }) {
  const readerId = useRef(`barcode-reader-${Math.random().toString(36).slice(2)}`);
  const scannerRef = useRef(null);
  const handledRef = useRef(false);
  const onDetectedRef = useRef(onDetected);
  const [status, setStatus] = useState("กำลังเปิดกล้อง...");
  const [error, setError] = useState("");
  const [manualBarcode, setManualBarcode] = useState("");

  useEffect(() => {
    onDetectedRef.current = onDetected;
  }, [onDetected]);

  useEffect(() => {
    let cancelled = false;
    const previewOnly = new URLSearchParams(window.location.search).get("qa") === "1";

    if (previewOnly) {
      setStatus("พร้อมสแกน - เล็งบาร์โค้ดให้อยู่ในกรอบ");
      return undefined;
    }

    function loadScannerLibrary() {
      if (window.Html5Qrcode) return Promise.resolve();
      const existing = document.querySelector('script[data-pos-barcode-scanner="true"]');
      if (existing) {
        return new Promise((resolve, reject) => {
          existing.addEventListener("load", resolve, { once: true });
          existing.addEventListener("error", reject, { once: true });
        });
      }
      return new Promise((resolve, reject) => {
        const script = document.createElement("script");
        script.src = `${PUBLIC_BASE}/vendor/html5-qrcode.min.js`;
        script.async = true;
        script.dataset.posBarcodeScanner = "true";
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
      });
    }

    async function startScanner() {
      try {
        await loadScannerLibrary();
        if (cancelled || !window.Html5Qrcode) return;
        const format = window.Html5QrcodeSupportedFormats;
        const formatsToSupport = format ? [
          format.EAN_13,
          format.EAN_8,
          format.UPC_A,
          format.UPC_E,
          format.CODE_128,
          format.CODE_39,
          format.ITF
        ].filter((value) => value !== undefined) : undefined;
        const scanner = new window.Html5Qrcode(readerId.current, { formatsToSupport, verbose: false });
        scannerRef.current = scanner;
        const cameras = await window.Html5Qrcode.getCameras().catch(() => []);
        const rearCamera = cameras.find((camera) => /back|rear|environment|หลัง/i.test(camera.label)) || cameras.at(-1);
        await scanner.start(
          rearCamera?.id || { facingMode: "environment" },
          {
            fps: 15,
            qrbox: (width, height) => ({ width: Math.floor(width * 0.86), height: Math.min(160, Math.floor(height * 0.32)) }),
            disableFlip: false
          },
          (decodedText) => {
            if (handledRef.current) return;
            handledRef.current = true;
            navigator.vibrate?.(80);
            setStatus(`พบรหัส ${decodedText}`);
            onDetectedRef.current(decodedText);
          },
          () => {}
        );
        if (!cancelled) setStatus("พร้อมสแกน · เล็งบาร์โค้ดให้อยู่ในกรอบ");
      } catch (scannerError) {
        if (cancelled) return;
        const name = scannerError?.name || "";
        const message = String(scannerError?.message || scannerError || "");
        if (name === "NotAllowedError" || /permission|notallowed/i.test(message)) setError("ยังไม่ได้อนุญาตใช้กล้อง กรุณากดอนุญาตกล้องแล้วลองใหม่");
        else if (name === "NotFoundError" || /notfound|no camera/i.test(message)) setError("ไม่พบกล้องบนอุปกรณ์นี้");
        else setError("เปิดกล้องไม่สำเร็จ กรุณาใช้ Chrome/Safari เวอร์ชันล่าสุด หรือกรอกรหัสด้านล่าง");
        setStatus("ใช้การกรอกรหัสแทนได้");
      }
    }

    startScanner();
    return () => {
      cancelled = true;
      const scanner = scannerRef.current;
      scannerRef.current = null;
      if (scanner?.isScanning) scanner.stop().catch(() => {});
    };
  }, []);

  function submitManual(event) {
    event.preventDefault();
    const barcode = manualBarcode.trim();
    if (!barcode) return;
    handledRef.current = true;
    onDetectedRef.current(barcode);
  }

  return <div className="scanner-backdrop" role="dialog" aria-modal="true" aria-label={title}><div className={`scanner-modal ${mode === "product" ? "product-mode" : "sale-mode"}`}><header className="scanner-head"><button type="button" className="scanner-close" onClick={onClose} aria-label="กลับโดยไม่สแกน"><X size={21} /></button><div><span className="scanner-mode-chip">{mode === "product" ? "โหมดเพิ่มสินค้า" : "โหมดขายสินค้า"}</span><h2>{title}</h2></div><Barcode size={27} aria-hidden="true" /></header><main className="scanner-body"><div className="scanner-copy"><Camera size={21} /><div><strong>{status}</strong><span>{detail}</span></div></div><div className="scanner-stage"><div id={readerId.current} className="barcode-reader" /><div className="scan-guide" aria-hidden="true"><span /><span /><span /><span /><i /></div></div>{error && <div className="scanner-error"><CircleAlert size={18} /><span>{error}</span></div>}<form className="manual-barcode" onSubmit={submitManual}><label><span>หรือกรอกรหัสบาร์โค้ดเอง</span><div><input inputMode="numeric" autoComplete="off" value={manualBarcode} onChange={(event) => setManualBarcode(event.target.value)} placeholder="เช่น 8850127000011" /><button className="primary-button" type="submit">ใช้รหัสนี้</button></div></label></form><div className="scanner-tip">หน้าสแกนนี้แยกจากหน้าขายและหน้าเพิ่มสินค้า กล้องจะไม่ถูกเปิดซ้อนกัน</div></main></div></div>;
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
