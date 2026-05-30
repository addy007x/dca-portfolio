# SiamFolio DCA Portfolio Tracker

เว็บแอปสำหรับติดตามพอร์ต DCA, กำไร/ขาดทุน, รายการซื้อขาย, ภาษี และการแจ้งเตือนลงทุนซ้ำ

## เปิดใช้งานบนเครื่อง

วิธีง่ายสุดบน Windows:

```bat
open-dca.cmd
```

จากนั้นเปิด:

```text
http://127.0.0.1:5173/
```

อย่าปิดหน้าต่าง command ระหว่างใช้งาน เพราะหน้าต่างนั้นเป็นตัวเสิร์ฟไฟล์เว็บในเครื่อง

## อัปขึ้น GitHub อัตโนมัติ

ถ้าต้องการให้แก้ไฟล์แล้วอัปขึ้น GitHub เอง ให้เปิด:

```bat
auto-push.cmd
```

ปล่อยหน้าต่างนี้ค้างไว้ระหว่างเขียนโค้ด เมื่อมีไฟล์เปลี่ยนแปลง ระบบจะรอให้แก้เสร็จประมาณ 12 วินาที แล้ว commit + push ขึ้น `main` ให้อัตโนมัติ

## เปิดใช้งานบนเว็บ

หลัง push ขึ้น GitHub แล้ว GitHub Pages จะ deploy เว็บที่:

```text
https://addy007x.github.io/dca-portfolio/
```

## ฐานข้อมูล

ค่าเริ่มต้นของแอปใช้ฐานข้อมูลใน browser ของเครื่องผู้ใช้เอง ไม่ต้องเชื่อม Cloudflare Worker หรือ API backend ข้อมูลจะอยู่ใน browser นั้นจนกว่าจะล้างข้อมูลเว็บหรือ import/export JSON เอง

การอัปเดตราคาจาก API ถูกปิดไว้เป็นค่าเริ่มต้น ถ้าต้องการราคาตลาดอัตโนมัติให้เปิด `Live price API` ใน Settings > Database

## โครงสร้างหลัก

- `index.html` - หน้าเริ่มต้นของแอป
- `app.jsx`, `views.jsx`, `dashboard.jsx`, `detail.jsx`, `tax.jsx` - หน้าจอและ flow หลัก
- `components.jsx`, `modals.jsx`, `charts.jsx`, `icons.jsx` - UI components
- `store.jsx`, `mock-data.jsx`, `api.jsx`, `backend.jsx`, `reminders.jsx` - ข้อมูลและการเชื่อมต่อ
- `backend/` - Cloudflare Worker + D1 backend

## Backend

ดูรายละเอียดการ deploy backend ได้ที่ `backend/README.md`
