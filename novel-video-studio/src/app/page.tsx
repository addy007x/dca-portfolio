/* eslint-disable @next/next/no-img-element */
"use client";

import {
  BookOpenText, Check, Clapperboard, Download, FileAudio,
  FileText, Film, Image as ImageIcon, LoaderCircle, Mic2,
  Pause, Play, Plus, RefreshCcw, Scissors, Sparkles, Trash2, Upload, WandSparkles,
} from "lucide-react";
import { DragEvent, useEffect, useRef, useState } from "react";
import { sentenceGroups, splitIntoChapters } from "@/lib/chapters";
import type { Chapter, ProjectSettings } from "@/lib/types";

type Background = { id: string; name: string; url: string; file: File };

const defaultSettings: ProjectSettings = {
  projectName: "นิยายเสียงของฉัน",
  aspectRatio: "9:16",
  voice: "coral",
  voiceTone: "เล่าเรื่องอบอุ่น มีอารมณ์ตามฉาก ออกเสียงภาษาไทยชัด และเว้นจังหวะธรรมชาติ",
  speed: 1,
  captionStyle: "story",
  captionColor: "#ffffff",
};

const voices = [
  { id: "coral", label: "Coral", detail: "ผู้หญิง · อบอุ่น" },
  { id: "nova", label: "Nova", detail: "ผู้หญิง · นุ่มนวล" },
  { id: "shimmer", label: "Shimmer", detail: "ผู้หญิง · สดใส" },
  { id: "onyx", label: "Onyx", detail: "ผู้ชาย · หนักแน่น" },
  { id: "echo", label: "Echo", detail: "ผู้ชาย · สุขุม" },
  { id: "alloy", label: "Alloy", detail: "เป็นกลาง · ธรรมชาติ" },
];

export default function Home() {
  const [sourceMode, setSourceMode] = useState<"paste" | "file">("paste");
  const [manuscript, setManuscript] = useState("");
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [settings, setSettings] = useState<ProjectSettings>(defaultSettings);
  const [backgrounds, setBackgrounds] = useState<Background[]>([]);
  const [backgroundPrompt, setBackgroundPrompt] = useState("");
  const [activeBackground, setActiveBackground] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [status, setStatus] = useState("เริ่มจากต้นฉบับของคุณ");
  const [busy, setBusy] = useState<"extract" | "voice" | "image" | "render" | "">("");
  const [playing, setPlaying] = useState(false);
  const [subtitleIndex, setSubtitleIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);
  const imageInput = useRef<HTMLInputElement>(null);
  const audioInput = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  const selectedChapters = chapters.filter(chapter => chapter.selected);
  const selectedText = selectedChapters.map(chapter => `${chapter.title}\n${chapter.text}`).join("\n\n");
  const captions = sentenceGroups(selectedText, 46);
  const characterCount = selectedText.length;
  const estimatedMinutes = Math.max(1, Math.ceil(characterCount / 430));

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("novel-video-studio.project.v1") || "null");
      queueMicrotask(() => {
        if (saved?.manuscript) {
          setManuscript(saved.manuscript);
          setChapters(splitIntoChapters(saved.manuscript));
        }
        if (saved?.settings) setSettings({ ...defaultSettings, ...saved.settings });
      });
    } catch { /* ignore damaged drafts */ }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      localStorage.setItem("novel-video-studio.project.v1", JSON.stringify({ manuscript, settings }));
    }, 500);
    return () => clearTimeout(timer);
  }, [manuscript, settings]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const update = () => {
      const ratio = audio.duration ? audio.currentTime / audio.duration : 0;
      setProgress(ratio * 100);
      const count = Math.max(1, captions.length);
      setSubtitleIndex(Math.min(count - 1, Math.floor(ratio * count)));
    };
    const stop = () => setPlaying(false);
    audio.addEventListener("timeupdate", update);
    audio.addEventListener("ended", stop);
    return () => { audio.removeEventListener("timeupdate", update); audio.removeEventListener("ended", stop); };
  }, [captions.length]);

  function parseText(value: string) {
    setManuscript(value);
    const next = splitIntoChapters(value);
    setChapters(next);
    setAudioBlob(null);
    setAudioUrl("");
    setVideoUrl("");
    setStatus(next.length ? `พบ ${next.length} ตอน เลือกตอนที่ต้องการสร้างได้เลย` : "ยังไม่พบข้อความ");
  }

  async function uploadManuscript(file?: File) {
    if (!file) return;
    setBusy("extract");
    setError("");
    setStatus(`กำลังอ่าน ${file.name}`);
    try {
      const form = new FormData();
      form.append("file", file);
      const response = await fetch("/api/extract", { method: "POST", body: form });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "อ่านไฟล์ไม่สำเร็จ");
      setSettings(current => ({ ...current, projectName: result.name || current.projectName }));
      parseText(result.text);
      setSourceMode("paste");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "อ่านไฟล์ไม่สำเร็จ");
    } finally { setBusy(""); }
  }

  function toggleChapter(id: string) {
    setChapters(items => items.map(chapter => chapter.id === id ? { ...chapter, selected: !chapter.selected } : chapter));
    setAudioBlob(null);
    setAudioUrl("");
    setVideoUrl("");
  }

  async function generateVoice() {
    if (!selectedText) return setError("เลือกอย่างน้อย 1 ตอนก่อนสร้างเสียง");
    if (characterCount > 30000) return setError("เวอร์ชันเริ่มต้นรองรับครั้งละไม่เกิน 30,000 ตัวอักษร กรุณาเลือกตอนให้น้อยลง");
    setBusy("voice");
    setError("");
    setStatus("AI กำลังอ่านต้นฉบับและสร้างเสียงพากย์");
    try {
      const response = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: selectedText, voice: settings.voice, tone: settings.voiceTone, speed: settings.speed }),
      });
      if (!response.ok) throw new Error((await response.json()).error || "สร้างเสียงไม่สำเร็จ");
      const blob = await response.blob();
      if (audioUrl) URL.revokeObjectURL(audioUrl);
      const url = URL.createObjectURL(blob);
      setAudioBlob(blob);
      setAudioUrl(url);
      setStatus("เสียงพากย์พร้อมแล้ว ทดลองฟังและปรับภาพต่อได้");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "สร้างเสียงไม่สำเร็จ");
    } finally { setBusy(""); }
  }

  function previewBrowserVoice() {
    if (!selectedText || !("speechSynthesis" in window)) return;
    speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(selectedText.slice(0, 1200));
    utterance.lang = "th-TH";
    utterance.rate = settings.speed;
    speechSynthesis.speak(utterance);
    setStatus("กำลังทดลองเสียงจากเบราว์เซอร์ 1,200 ตัวอักษรแรก");
  }

  function setAudioFile(file?: File) {
    if (!file) return;
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioBlob(file);
    setAudioUrl(URL.createObjectURL(file));
    setStatus(`ใช้เสียงจากไฟล์ ${file.name}`);
  }

  function addBackgroundFiles(files: FileList | File[]) {
    const next = [...files].filter(file => file.type.startsWith("image/")).slice(0, Math.max(0, 12 - backgrounds.length));
    setBackgrounds(items => [...items, ...next.map(file => ({ id: crypto.randomUUID(), name: file.name, url: URL.createObjectURL(file), file }))]);
    setStatus(`เพิ่มภาพแล้ว ${next.length} ภาพ`);
  }

  async function createAiBackground() {
    if (!backgroundPrompt.trim()) return setError("เขียนบรรยากาศหรือฉากที่ต้องการก่อน");
    setBusy("image");
    setError("");
    setStatus("AI กำลังวาดภาพพื้นหลังแนวตั้ง");
    try {
      const response = await fetch("/api/image", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ prompt: backgroundPrompt }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "สร้างภาพไม่สำเร็จ");
      const blob = await (await fetch(result.dataUrl)).blob();
      const file = new File([blob], `ai-scene-${backgrounds.length + 1}.png`, { type: "image/png" });
      addBackgroundFiles([file]);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "สร้างภาพไม่สำเร็จ");
    } finally { setBusy(""); }
  }

  function removeBackground(id: string) {
    setBackgrounds(items => items.filter(item => item.id !== id));
    setActiveBackground(0);
  }

  function toggleAudio() {
    const audio = audioRef.current;
    if (!audio || !audioUrl) return;
    if (audio.paused) { audio.play(); setPlaying(true); }
    else { audio.pause(); setPlaying(false); }
  }

  async function renderVideo() {
    if (!audioBlob) return setError("สร้างเสียง AI หรืออัปโหลดไฟล์เสียงก่อนเรนเดอร์");
    if (!captions.length) return setError("ยังไม่มีข้อความสำหรับทำซับ");
    setBusy("render");
    setError("");
    setVideoUrl("");
    setStatus("FFmpeg กำลังประกอบภาพ เสียง และซับเป็น MP4");
    try {
      const form = new FormData();
      form.append("audio", audioBlob, "narration.mp3");
      backgrounds.forEach(background => form.append("backgrounds", background.file));
      form.append("metadata", JSON.stringify({
        title: settings.projectName,
        captions,
        captionStyle: settings.captionStyle,
        captionColor: settings.captionColor,
        aspectRatio: settings.aspectRatio,
      }));
      const response = await fetch("/api/render", { method: "POST", body: form });
      if (!response.ok) throw new Error((await response.json()).error || "เรนเดอร์ไม่สำเร็จ");
      const blob = await response.blob();
      setVideoUrl(URL.createObjectURL(blob));
      setStatus("วิดีโอ MP4 พร้อมดาวน์โหลดแล้ว");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "เรนเดอร์ไม่สำเร็จ");
    } finally { setBusy(""); }
  }

  function resetProject() {
    if (!confirm("ล้างต้นฉบับและเริ่มโปรเจกต์ใหม่หรือไม่?")) return;
    localStorage.removeItem("novel-video-studio.project.v1");
    location.reload();
  }

  const previewBackground = backgrounds[activeBackground]?.url;
  const activeCaption = captions[subtitleIndex] || "ซับจะปรากฏตามจังหวะเสียงพากย์";

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand-block"><span className="brand-symbol"><BookOpenText size={21} /></span><div><strong>NOVEL VIDEO STUDIO</strong><small>AI narration and vertical video editor</small></div></div>
        <div className="header-status"><span className={busy ? "status-dot working" : "status-dot"} />{status}</div>
        <button className="ghost-button reset-button" onClick={resetProject} aria-label="เริ่มโปรเจกต์ใหม่"><RefreshCcw size={16} /><span className="reset-label">โปรเจกต์ใหม่</span></button>
      </header>

      <main className="studio-grid">
        <aside className="source-pane pane">
          <div className="pane-title"><span className="step">1</span><div><h1>ต้นฉบับ</h1><p>อัปโหลดไฟล์หรือวางข้อความ</p></div></div>
          <label className="field-label">ชื่อโปรเจกต์</label>
          <input className="field" value={settings.projectName} onChange={event => setSettings({ ...settings, projectName: event.target.value })} />
          <div className="segmented">
            <button className={sourceMode === "paste" ? "active" : ""} onClick={() => setSourceMode("paste")}><FileText size={15} /> วางข้อความ</button>
            <button className={sourceMode === "file" ? "active" : ""} onClick={() => setSourceMode("file")}><Upload size={15} /> อัปโหลดไฟล์</button>
          </div>
          {sourceMode === "paste" ? (
            <textarea className="manuscript-input" value={manuscript} onChange={event => parseText(event.target.value)} placeholder="วางเนื้อหานิยายตรงนี้...&#10;&#10;ระบบจะหา บทที่ / ตอนที่ / Chapter และแยกให้อัตโนมัติ" />
          ) : (
            <button className="drop-zone" onClick={() => fileInput.current?.click()} onDragOver={event => event.preventDefault()} onDrop={(event: DragEvent) => { event.preventDefault(); uploadManuscript(event.dataTransfer.files[0]); }}>
              {busy === "extract" ? <LoaderCircle className="spin" /> : <FileText />}
              <strong>เลือก .txt, .docx หรือ .pdf</strong><span>สูงสุด 15 MB</span>
              <input ref={fileInput} hidden type="file" accept=".txt,.docx,.pdf" onChange={event => uploadManuscript(event.target.files?.[0])} />
            </button>
          )}
          <div className="source-stats"><span>{manuscript.length.toLocaleString()} ตัวอักษร</span><span>ประมาณ {Math.ceil(manuscript.length / 430)} นาที</span></div>
          <div className="section-heading"><span>ตอนและบท</span><small>{selectedChapters.length}/{chapters.length} เลือกอยู่</small></div>
          <div className="chapter-list">
            {chapters.length ? chapters.map((chapter, index) => (
              <label className={`chapter-row ${chapter.selected ? "selected" : ""}`} key={chapter.id}>
                <input type="checkbox" checked={chapter.selected} onChange={() => toggleChapter(chapter.id)} />
                <span className="chapter-number">{String(index + 1).padStart(2, "0")}</span>
                <span><strong>{chapter.title}</strong><small>{chapter.text.length.toLocaleString()} ตัวอักษร</small></span>
              </label>
            )) : <div className="empty-list">เมื่อมีต้นฉบับ รายการตอนจะอยู่ตรงนี้</div>}
          </div>
        </aside>

        <section className="preview-pane">
          <div className="preview-header"><div><strong>STORY PREVIEW</strong><span>{settings.aspectRatio} · {estimatedMinutes} นาทีโดยประมาณ</span></div><div className="format-switch"><button className={settings.aspectRatio === "9:16" ? "active" : ""} onClick={() => setSettings({ ...settings, aspectRatio: "9:16" })}>9:16</button><button className={settings.aspectRatio === "16:9" ? "active" : ""} onClick={() => setSettings({ ...settings, aspectRatio: "16:9" })}>16:9</button></div></div>
          <div className="stage-wrap">
            <div className={`video-stage ${settings.aspectRatio === "16:9" ? "landscape" : "portrait"}`} style={previewBackground ? { backgroundImage: `linear-gradient(to bottom, rgba(8,9,15,.08), rgba(8,9,15,.58)), url(${previewBackground})` } : undefined}>
              {!previewBackground && <div className="stage-placeholder"><Film size={38} /><strong>เพิ่มภาพพื้นหลัง</strong><span>หรือสร้างภาพ AI จากฉากในนิยาย</span></div>}
              <div className={`caption-preview caption-${settings.captionStyle}`} style={{ color: settings.captionColor }}>{activeCaption}</div>
              <div className="stage-title">{settings.projectName}</div>
              <div className="safe-guides" />
            </div>
          </div>
          <div className="transport-bar">
            <button className="round-button" onClick={toggleAudio} disabled={!audioUrl}>{playing ? <Pause size={17} /> : <Play size={17} />}</button>
            <div className="transport-copy"><strong>{audioUrl ? "เสียงพากย์พร้อม" : "ยังไม่มีเสียงพากย์"}</strong><span>{activeCaption}</span></div>
            <div className="time-value">{estimatedMinutes}:00</div>
          </div>
          <div className="progress-track"><span style={{ width: `${progress}%` }} /></div>
          <div className="storyboard">
            {(backgrounds.length ? backgrounds : Array.from({ length: Math.min(4, Math.max(1, selectedChapters.length)) }, () => null as Background | null)).map((background, index) => (
              <button key={background ? background.id : index} className={`story-card ${activeBackground === index ? "active" : ""}`} onClick={() => setActiveBackground(index)}>
                {background ? <img src={background.url} alt="" /> : <span><ImageIcon size={18} /></span>}
                <small>ฉาก {index + 1}</small>
              </button>
            ))}
          </div>
          {videoUrl && (
            <div className="success-sheet">
              <div className="success-icon"><Check /></div><div><strong>วิดีโอพร้อมแล้ว</strong><span>H.264 · AAC · MP4 พร้อมลง TikTok / Shorts</span></div>
              <a className="download-button" href={videoUrl} download={`${settings.projectName || "novel-video"}.mp4`}><Download size={17} /> ดาวน์โหลด MP4</a>
            </div>
          )}
        </section>

        <aside className="production-pane pane">
          <div className="pane-title"><span className="step">2</span><div><h2>เสียงและวิดีโอ</h2><p>ตั้งค่าการเล่า ภาพ และซับ</p></div></div>
          <div className="production-section">
            <div className="section-heading"><span><Mic2 size={15} /> เสียงพากย์ AI</span><small>{characterCount.toLocaleString()} ตัวอักษร</small></div>
            <label className="field-label">ผู้บรรยาย</label>
            <select className="field" value={settings.voice} onChange={event => setSettings({ ...settings, voice: event.target.value })}>{voices.map(voice => <option key={voice.id} value={voice.id}>{voice.label} — {voice.detail}</option>)}</select>
            <label className="field-label">ทิศทางการเล่า</label>
            <textarea className="field compact-area" value={settings.voiceTone} onChange={event => setSettings({ ...settings, voiceTone: event.target.value })} />
            <label className="range-control"><span>ความเร็ว <b>{settings.speed.toFixed(2)}x</b></span><input type="range" min="0.7" max="1.3" step="0.05" value={settings.speed} onChange={event => setSettings({ ...settings, speed: Number(event.target.value) })} /></label>
            <button className="primary-button" onClick={generateVoice} disabled={busy === "voice"}>{busy === "voice" ? <LoaderCircle className="spin" /> : <WandSparkles />} สร้างเสียงพากย์ AI</button>
            <div className="inline-actions"><button onClick={previewBrowserVoice}><Play size={14} /> ทดลองเสียงเครื่อง</button><button onClick={() => audioInput.current?.click()}><FileAudio size={14} /> ใช้ไฟล์เสียง</button><input ref={audioInput} hidden type="file" accept="audio/*" onChange={event => setAudioFile(event.target.files?.[0])} /></div>
          </div>

          <div className="production-section">
            <div className="section-heading"><span><ImageIcon size={15} /> ภาพและพื้นหลัง</span><small>{backgrounds.length}/12 ภาพ</small></div>
            <button className="image-upload" onClick={() => imageInput.current?.click()}><Plus size={15} /> เพิ่มภาพจากเครื่อง<input ref={imageInput} hidden multiple type="file" accept="image/*" onChange={event => event.target.files && addBackgroundFiles(event.target.files)} /></button>
            <div className="background-grid">{backgrounds.map((background, index) => <div className="background-thumb" key={background.id}><button onClick={() => setActiveBackground(index)}><img src={background.url} alt={background.name} /></button><button className="delete-thumb" onClick={() => removeBackground(background.id)}><Trash2 size={12} /></button></div>)}</div>
            <label className="field-label">สร้างภาพ AI จากฉาก</label>
            <div className="prompt-row"><input className="field" value={backgroundPrompt} onChange={event => setBackgroundPrompt(event.target.value)} placeholder="เช่น ห้องสมุดเก่ายามฝนตก โทนลึกลับ" /><button onClick={createAiBackground} disabled={busy === "image"}>{busy === "image" ? <LoaderCircle className="spin" /> : <Sparkles />}</button></div>
          </div>

          <div className="production-section">
            <div className="section-heading"><span><Scissors size={15} /> ซับอัตโนมัติ</span><small>{captions.length} ช่วง</small></div>
            <div className="caption-options">
              {(["story", "minimal", "impact"] as const).map(style => <button key={style} className={settings.captionStyle === style ? "active" : ""} onClick={() => setSettings({ ...settings, captionStyle: style })}>{style === "story" ? "เล่านิยาย" : style === "minimal" ? "เรียบง่าย" : "เน้นคำ"}</button>)}
            </div>
            <label className="color-control"><span>สีข้อความ</span><input type="color" value={settings.captionColor} onChange={event => setSettings({ ...settings, captionColor: event.target.value })} /></label>
          </div>

          <div className="render-section">
            <div className="render-title"><span className="step">3</span><div><strong>เรนเดอร์ MP4</strong><small>FFmpeg · H.264 · พร้อมลงโซเชียล</small></div></div>
            <ul><li className={selectedText ? "done" : ""}><Check /> มีต้นฉบับที่เลือก</li><li className={audioBlob ? "done" : ""}><Check /> มีเสียงพากย์</li><li className={captions.length ? "done" : ""}><Check /> สร้างซับแล้ว</li></ul>
            <button className="render-button" onClick={renderVideo} disabled={busy === "render"}>{busy === "render" ? <><LoaderCircle className="spin" /> กำลังเรนเดอร์...</> : <><Clapperboard /> สร้างวิดีโอ MP4</>}</button>
            <p>หากไม่ใส่ภาพ ระบบจะใช้พื้นหลังสีเข้มและใส่ซับให้อัตโนมัติ</p>
          </div>
          {error && <div className="error-box">{error}</div>}
        </aside>
      </main>
      <audio ref={audioRef} src={audioUrl} preload="metadata" />
    </div>
  );
}
