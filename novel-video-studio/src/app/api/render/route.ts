import { NextResponse } from "next/server";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { parseBuffer } from "music-metadata";
import { assTime, escapeAss, runFfmpeg } from "@/lib/ffmpeg";

export const runtime = "nodejs";
export const maxDuration = 300;

type RenderMeta = {
  title?: string;
  captions?: string[];
  captionStyle?: "story" | "minimal" | "impact";
  captionColor?: string;
  aspectRatio?: "9:16" | "16:9";
};

function assColor(hex = "#ffffff") {
  const clean = hex.replace("#", "").padEnd(6, "f").slice(0, 6);
  return `&H00${clean.slice(4, 6)}${clean.slice(2, 4)}${clean.slice(0, 2).toUpperCase()}`;
}

function makeAss(captions: string[], duration: number, meta: RenderMeta, width: number, height: number) {
  const weights = captions.map(text => Math.max(1, text.length));
  const totalWeight = weights.reduce((sum, value) => sum + value, 0) || 1;
  const style = meta.captionStyle || "story";
  const fontSize = style === "impact" ? 68 : style === "minimal" ? 48 : 56;
  const marginV = Math.round(height * .17);
  let cursor = 0;
  const lines = captions.map((text, index) => {
    const cueDuration = Math.max(1.2, duration * (weights[index] / totalWeight));
    const start = cursor;
    const end = Math.min(duration, cursor + cueDuration);
    cursor = end;
    return `Dialogue: 0,${assTime(start)},${assTime(end)},Story,,0,0,0,,${escapeAss(text)}`;
  });
  return `[Script Info]\nScriptType: v4.00+\nPlayResX: ${width}\nPlayResY: ${height}\nWrapStyle: 0\nScaledBorderAndShadow: yes\n\n[V4+ Styles]\nFormat: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding\nStyle: Story,Leelawadee UI,${fontSize},${assColor(meta.captionColor)},${assColor(meta.captionColor)},&H00101018,&H98000000,${style === "impact" ? -1 : 0},0,0,0,100,100,0,0,1,5,1,2,50,50,${marginV},1\n\n[Events]\nFormat: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\n${lines.join("\n")}`;
}

export async function POST(request: Request) {
  const temp = await mkdtemp(path.join(tmpdir(), "novel-render-"));
  try {
    const form = await request.formData();
    const audio = form.get("audio");
    const metadata = JSON.parse(String(form.get("metadata") || "{}")) as RenderMeta;
    const backgrounds = form.getAll("backgrounds").filter(item => item instanceof File) as File[];
    if (!(audio instanceof File)) return NextResponse.json({ error: "กรุณาสร้างหรืออัปโหลดเสียงพากย์ก่อน" }, { status: 400 });
    if (audio.size > 80 * 1024 * 1024) return NextResponse.json({ error: "ไฟล์เสียงต้องไม่เกิน 80 MB" }, { status: 413 });

    const audioBuffer = Buffer.from(await audio.arrayBuffer());
    await writeFile(path.join(temp, "voice.mp3"), audioBuffer);
    const audioMeta = await parseBuffer(audioBuffer, { mimeType: audio.type || "audio/mpeg", size: audio.size });
    const duration = Math.max(2, audioMeta.format.duration || 30);
    const portrait = metadata.aspectRatio !== "16:9";
    const width = portrait ? 720 : 1280;
    const height = portrait ? 1280 : 720;
    const imageFiles: string[] = [];

    for (let index = 0; index < backgrounds.slice(0, 12).length; index++) {
      const file = backgrounds[index];
      const extension = file.type.includes("png") ? "png" : file.type.includes("webp") ? "webp" : "jpg";
      const filename = `background-${index}.${extension}`;
      await writeFile(path.join(temp, filename), Buffer.from(await file.arrayBuffer()));
      imageFiles.push(filename);
    }

    const sceneCount = Math.max(1, imageFiles.length);
    const sceneDuration = duration / sceneCount + .15;
    const segmentFiles: string[] = [];
    for (let index = 0; index < sceneCount; index++) {
      const output = `segment-${String(index).padStart(3, "0")}.mp4`;
      const frames = Math.ceil(sceneDuration * 30);
      if (imageFiles[index]) {
        await runFfmpeg([
          "-loop", "1", "-i", imageFiles[index], "-t", sceneDuration.toFixed(3),
          "-vf", `scale=${width}:${height}:force_original_aspect_ratio=increase,crop=${width}:${height},zoompan=z='min(zoom+0.00045,1.07)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${frames}:s=${width}x${height}:fps=30,format=yuv420p`,
          "-an", "-c:v", "libx264", "-preset", "veryfast", "-r", "30", output,
        ], temp);
      } else {
        await runFfmpeg(["-f", "lavfi", "-i", `color=c=0x121421:s=${width}x${height}:r=30:d=${sceneDuration.toFixed(3)}`, "-an", "-c:v", "libx264", "-pix_fmt", "yuv420p", output], temp);
      }
      segmentFiles.push(output);
    }

    await writeFile(path.join(temp, "segments.txt"), segmentFiles.map(file => `file '${file}'`).join("\n"));
    await runFfmpeg(["-f", "concat", "-safe", "0", "-i", "segments.txt", "-c", "copy", "background.mp4"], temp);
    const captions = (metadata.captions || []).map(value => String(value).trim()).filter(Boolean);
    if (captions.length) await writeFile(path.join(temp, "captions.ass"), makeAss(captions, duration, metadata, width, height), "utf8");
    const args = ["-i", "background.mp4", "-i", "voice.mp3"];
    if (captions.length) args.push("-vf", "ass=captions.ass");
    args.push("-c:v", "libx264", "-preset", "veryfast", "-crf", "21", "-c:a", "aac", "-b:a", "192k", "-shortest", "-movflags", "+faststart", "novel-video.mp4");
    await runFfmpeg(args, temp);
    const video = await readFile(path.join(temp, "novel-video.mp4"));
    const safeTitle = String(metadata.title || "novel-video").replace(/[^a-zA-Z0-9ก-๙_-]+/g, "-").slice(0, 80);
    return new Response(new Uint8Array(video), { headers: { "Content-Type": "video/mp4", "Content-Disposition": `attachment; filename="${encodeURIComponent(safeTitle)}.mp4"` } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "เรนเดอร์วิดีโอไม่สำเร็จ" }, { status: 500 });
  } finally {
    await rm(temp, { recursive: true, force: true });
  }
}
