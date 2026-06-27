# MEXC Launchpad Alert

ระบบ Node.js สำหรับตรวจ MEXC Launchpad และหน้าประกาศที่เกี่ยวกับ Launchpad ทุก 10 นาที แล้วส่ง LINE เมื่อพบกิจกรรมใหม่ที่ยังไม่เคยแจ้ง

## ใช้งาน

1. ตั้งค่า `mexc-launchpad-alert/.env`
2. รันตรวจครั้งเดียว:

```bash
npm run once
```

3. รันเฝ้าดูทุก 10 นาที:

```bash
npm start
```

ครั้งแรกระบบจะบันทึกรายการที่เจอไว้ก่อนโดยไม่แจ้งเตือน เพื่อกัน LINE โดนข้อความเก่าถล่ม ถ้าต้องการให้แจ้งรายการที่เจอทันที ใช้:

```bash
npm run once:notify-existing
```

## LINE

ใช้ LINE Messaging API เป็นหลัก:

- `LINE_CHANNEL_ACCESS_TOKEN` จำเป็น
- `LINE_TO_ID` ไม่บังคับ ถ้าใส่จะส่ง push ไป user/group/room นั้น ถ้าไม่ใส่จะส่ง broadcast

รองรับ `LINE_NOTIFY_TOKEN` แบบ legacy ด้วย แต่แนะนำ Messaging API เพราะ LINE Notify เป็นระบบเก่าแล้ว

## Storage

ไฟล์กันแจ้งซ้ำอยู่ที่:

```text
mexc-launchpad-alert/data/events.json
```

เก็บ `event id/title/url/date` และเวลาที่แจ้งแล้ว
