# Novel Video Studio

สตูดิโอสร้างวิดีโอเล่านิยายจากไฟล์หรือข้อความ รองรับการแยกบท สร้างเสียงพากย์ AI ทำซับ ใส่ภาพ และเรนเดอร์ MP4 แนวตั้งสำหรับ TikTok / YouTube Shorts

## ความสามารถ

- อัปโหลด `.txt`, `.docx`, `.pdf` หรือวางข้อความ
- แยกบท/ตอนอัตโนมัติและเลือกเฉพาะตอนที่จะผลิต
- สร้างเสียงด้วย OpenAI TTS พร้อมเลือกผู้บรรยาย โทน และความเร็ว
- ทดลองเสียงจากเบราว์เซอร์หรืออัปโหลดไฟล์เสียงของตัวเอง
- อัปโหลดภาพพื้นหลังหรือสร้างภาพด้วย OpenAI Image API
- สร้างซับอัตโนมัติและเลือกสไตล์ซับ
- เรนเดอร์ H.264/AAC MP4 ด้วย FFmpeg ทั้ง 9:16 และ 16:9
- บันทึกร่างอัตโนมัติในเครื่อง และมี schema สำหรับ Supabase แบบหลายผู้ใช้

## เริ่มใช้งาน

ต้องมี Node.js 20.9 ขึ้นไป จากนั้นรัน:

```powershell
Copy-Item .env.example .env.local
npm install
npm run dev
```

เปิด `http://127.0.0.1:3000`

ฟังก์ชันพื้นฐาน เช่น อ่านไฟล์ แยกบท อัปโหลดเสียง/ภาพ สร้างซับ และเรนเดอร์วิดีโอ ใช้งานได้โดยไม่ต้องมี API key ส่วนเสียงและภาพ AI ให้ใส่ค่าใน `.env.local`:

```env
OPENAI_API_KEY=ใส่คีย์ของคุณ
OPENAI_TTS_MODEL=gpt-4o-mini-tts
OPENAI_IMAGE_MODEL=gpt-image-1
```

## Supabase (ทางเลือก)

1. สร้างโปรเจกต์ Supabase และเปิด Authentication
2. เปิด SQL Editor แล้วรัน `supabase/schema.sql`
3. ใส่ Project URL และ publishable key ใน `.env.local`
4. เก็บไฟล์ใน bucket `novel-studio` ด้วย path รูปแบบ `{user_id}/{project_id}/ชื่อไฟล์`

```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_PUBLISHABLE_KEY
SUPABASE_SERVICE_ROLE_KEY=ใช้เฉพาะฝั่งเซิร์ฟเวอร์และห้ามเปิดเผย
```

ตอนนี้หน้า Studio ใช้ `localStorage` เพื่อให้เริ่มงานได้ทันที ส่วน `src/lib/supabase.ts` และ schema เตรียมไว้สำหรับเพิ่มระบบล็อกอิน/ซิงก์ข้ามเครื่องในเฟสถัดไป

## ตรวจสอบก่อนส่งขึ้นเซิร์ฟเวอร์

```powershell
npm run lint
npm run build
```

FFmpeg ทำงานบน Node.js server จึงไม่สามารถนำระบบเต็มไปวางบน GitHub Pages แบบ static ได้ ควร deploy บน VPS, Railway, Render หรือเซิร์ฟเวอร์ Docker ที่อนุญาตให้รัน FFmpeg และมีพื้นที่ไฟล์ชั่วคราว
