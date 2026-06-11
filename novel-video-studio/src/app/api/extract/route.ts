import { NextResponse } from "next/server";
import mammoth from "mammoth";
import pdfParse from "pdf-parse/lib/pdf-parse.js";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return NextResponse.json({ error: "กรุณาเลือกไฟล์" }, { status: 400 });
    if (file.size > 15 * 1024 * 1024) return NextResponse.json({ error: "ไฟล์ต้องไม่เกิน 15 MB" }, { status: 413 });

    const buffer = Buffer.from(await file.arrayBuffer());
    const extension = file.name.split(".").pop()?.toLowerCase();
    let text = "";
    if (extension === "txt") text = buffer.toString("utf8");
    else if (extension === "docx") text = (await mammoth.extractRawText({ buffer })).value;
    else if (extension === "pdf") text = (await pdfParse(buffer)).text;
    else return NextResponse.json({ error: "รองรับเฉพาะ .txt, .docx และ .pdf" }, { status: 415 });

    return NextResponse.json({ name: file.name.replace(/\.[^.]+$/, ""), text: text.trim() });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "อ่านไฟล์ไม่สำเร็จ" }, { status: 500 });
  }
}
