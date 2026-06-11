import { NextResponse } from "next/server";
import OpenAI from "openai";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { runFfmpeg } from "@/lib/ffmpeg";

export const runtime = "nodejs";
export const maxDuration = 300;

function splitText(text: string, maxLength = 3200) {
  const sentences = text.split(/(?<=[.!?。！？]|[ๆฯ])\s+|\n+/).map(item => item.trim()).filter(Boolean);
  const chunks: string[] = [];
  let current = "";
  for (const sentence of sentences) {
    if (`${current} ${sentence}`.trim().length > maxLength && current) {
      chunks.push(current);
      current = sentence;
    } else current = `${current} ${sentence}`.trim();
  }
  if (current) chunks.push(current);
  return chunks;
}

export async function POST(request: Request) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "ยังไม่ได้ตั้ง OPENAI_API_KEY ใน .env.local" }, { status: 503 });
  const temp = await mkdtemp(path.join(tmpdir(), "novel-tts-"));
  try {
    const body = await request.json();
    const text = String(body.text || "").trim();
    if (!text) return NextResponse.json({ error: "ไม่มีข้อความสำหรับพากย์" }, { status: 400 });
    if (text.length > 30000) return NextResponse.json({ error: "เวอร์ชันเริ่มต้นรองรับครั้งละไม่เกิน 30,000 ตัวอักษร" }, { status: 413 });
    const voice = String(body.voice || "coral");
    const speed = Math.max(.7, Math.min(1.3, Number(body.speed) || 1));
    const instructions = String(body.tone || "เล่านิยายภาษาไทยอย่างเป็นธรรมชาติ ออกเสียงชัด เว้นจังหวะตามอารมณ์เรื่อง");
    const client = new OpenAI({ apiKey });
    const chunks = splitText(text);
    const files: string[] = [];

    for (let index = 0; index < chunks.length; index++) {
      const speech = await client.audio.speech.create({
        model: process.env.OPENAI_TTS_MODEL || "gpt-4o-mini-tts",
        voice: voice as "coral",
        input: chunks[index],
        instructions,
        response_format: "mp3",
        speed,
      });
      const filename = `part-${String(index).padStart(3, "0")}.mp3`;
      await writeFile(path.join(temp, filename), Buffer.from(await speech.arrayBuffer()));
      files.push(filename);
    }

    let output: Buffer;
    if (files.length === 1) output = await readFile(path.join(temp, files[0]));
    else {
      await writeFile(path.join(temp, "concat.txt"), files.map(file => `file '${file}'`).join("\n"));
      await runFfmpeg(["-f", "concat", "-safe", "0", "-i", "concat.txt", "-c", "copy", "voice.mp3"], temp);
      output = await readFile(path.join(temp, "voice.mp3"));
    }
    return new Response(new Uint8Array(output), { headers: { "Content-Type": "audio/mpeg", "Content-Disposition": "inline; filename=novel-voice.mp3" } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "สร้างเสียงไม่สำเร็จ" }, { status: 500 });
  } finally {
    await rm(temp, { recursive: true, force: true });
  }
}
