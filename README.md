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

## โครงสร้างหลัก

- `index.html` - หน้าเริ่มต้นของแอป
- `app.jsx`, `views.jsx`, `dashboard.jsx`, `detail.jsx`, `tax.jsx` - หน้าจอและ flow หลัก
- `components.jsx`, `modals.jsx`, `charts.jsx`, `icons.jsx` - UI components
- `store.jsx`, `mock-data.jsx`, `api.jsx`, `backend.jsx`, `reminders.jsx` - ข้อมูลและการเชื่อมต่อ
- `backend/` - Cloudflare Worker + D1 backend

## Backend

ดูรายละเอียดการ deploy backend ได้ที่ `backend/README.md`
