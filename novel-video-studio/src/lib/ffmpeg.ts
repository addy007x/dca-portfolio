import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import ffmpegPath from "ffmpeg-static";

export function runFfmpeg(args: string[], cwd: string) {
  const localBinary = path.join(process.cwd(), "node_modules", "ffmpeg-static", process.platform === "win32" ? "ffmpeg.exe" : "ffmpeg");
  const binary = process.env.FFMPEG_PATH || (existsSync(localBinary) ? localBinary : ffmpegPath);
  if (!binary) throw new Error("FFmpeg binary is unavailable");
  return new Promise<void>((resolve, reject) => {
    const process = spawn(binary, ["-hide_banner", "-loglevel", "error", "-y", ...args], { cwd, windowsHide: true });
    let stderr = "";
    process.stderr.on("data", chunk => { stderr += chunk.toString(); });
    process.on("error", reject);
    process.on("close", code => code === 0 ? resolve() : reject(new Error(stderr || `FFmpeg exited with code ${code}`)));
  });
}

export function assTime(seconds: number) {
  const safe = Math.max(0, seconds);
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const secs = Math.floor(safe % 60);
  const centis = Math.floor((safe - Math.floor(safe)) * 100);
  return `${hours}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}.${String(centis).padStart(2, "0")}`;
}

export function escapeAss(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/\{/g, "\\{").replace(/\}/g, "\\}").replace(/\n/g, "\\N");
}
