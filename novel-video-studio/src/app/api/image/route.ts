import { NextResponse } from "next/server";
import OpenAI from "openai";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(request: Request) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "ยังไม่ได้ตั้ง OPENAI_API_KEY" }, { status: 503 });
  try {
    const body = await request.json();
    const prompt = String(body.prompt || "").trim().slice(0, 1800);
    if (!prompt) return NextResponse.json({ error: "กรุณาใส่คำอธิบายภาพ" }, { status: 400 });
    const client = new OpenAI({ apiKey });
    const result = await client.images.generate({
      model: process.env.OPENAI_IMAGE_MODEL || "gpt-image-1",
      prompt: `Create a cinematic vertical background illustration for a Thai narrated story. No text, no typography, no watermark. Keep the lower-middle area visually calm for subtitles. Scene: ${prompt}`,
      size: "1024x1536",
      quality: "medium",
    });
    const image = result.data?.[0];
    if (!image?.b64_json) throw new Error("AI ไม่ได้ส่งรูปกลับมา");
    return NextResponse.json({ dataUrl: `data:image/png;base64,${image.b64_json}` });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "สร้างภาพไม่สำเร็จ" }, { status: 500 });
  }
}
