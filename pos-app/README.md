# SiamFolio Grocery POS

Next.js + Supabase POS สำหรับร้านขายของชำ รองรับหน้าขาย บาร์โค้ด สินค้า สต๊อก รายงาน ใบเสร็จ และผู้ใช้

## เริ่มใช้งาน

```powershell
npm install
Copy-Item .env.example .env.local
npm run dev
```

ถ้ายังไม่ใส่ Supabase ระบบจะทำงานใน Demo mode และบันทึกข้อมูลใน `localStorage`

## Supabase

1. สร้างโปรเจกต์ Supabase
2. เปิด SQL Editor และรัน `supabase/schema.sql`
3. ใส่ Project URL และ publishable key ใน `.env.local`
4. สร้าง store และ profile แรกให้ผู้ดูแลร้าน

## Export สำหรับ GitHub Pages

```powershell
$env:NEXT_PUBLIC_BASE_PATH='/dca-portfolio/pos'
npm run build
```

นำไฟล์ใน `out` ไปไว้ที่โฟลเดอร์ `pos` ของ repository หลัก
