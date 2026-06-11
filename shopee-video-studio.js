(() => {
  "use strict";

  const STORAGE_KEY = "siamfolio.shopeeVideoStudio.v1";
  const SESSION_KEY = "siamfolio.googleSession";
  const apiUrl = (window.AUTH_CONFIG?.apiUrl || "").replace(/\/$/, "");
  const $ = id => document.getElementById(id);
  const canvas = $("videoCanvas");
  const ctx = canvas.getContext("2d");
  const voiceAudio = $("voiceAudio");
  const musicAudio = $("musicAudio");

  const defaultState = {
    productName: "",
    price: "",
    benefits: "",
    audience: "",
    offer: "",
    tone: "friendly",
    duration: 20,
    brandColor: "#ee4d2d",
    captionStyle: "bold",
    musicVolume: 0.12,
    assets: [],
    scenes: [],
  };

  let state = loadState();
  let currentTime = 0;
  let playing = false;
  let muted = false;
  let startedAt = 0;
  let animationFrame = 0;
  let toastTimer = 0;
  let voiceBlob = null;
  let musicBlob = null;
  let ffmpegInstance = null;
  let saveTimer = 0;
  let dragIndex = -1;
  const imageCache = new Map();

  function loadState() {
    try {
      return { ...defaultState, ...JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}") };
    } catch {
      return { ...defaultState };
    }
  }

  function saveState() {
    clearTimeout(saveTimer);
    $("saveState").innerHTML = '<i data-lucide="cloud-upload"></i> กำลังบันทึก';
    saveTimer = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
        $("saveState").innerHTML = '<i data-lucide="cloud-check"></i> บันทึกแล้ว';
      } catch {
        $("saveState").textContent = "พื้นที่บันทึกเต็ม";
      }
      refreshIcons();
    }, 350);
  }

  function getSession() {
    try { return JSON.parse(localStorage.getItem(SESSION_KEY) || "null"); }
    catch { return null; }
  }

  function refreshIcons() {
    if (window.lucide) window.lucide.createIcons({ attrs: { "stroke-width": 1.8 } });
  }

  function toast(message) {
    const el = $("toast");
    el.textContent = message;
    el.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove("show"), 3200);
  }

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>'"]/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[char]);
  }

  function formatTime(seconds) {
    const safe = Math.max(0, Number(seconds) || 0);
    const min = Math.floor(safe / 60);
    const sec = Math.floor(safe % 60);
    return `${String(min).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  }

  function totalDuration() {
    const sum = state.scenes.reduce((total, scene) => total + Math.max(.5, Number(scene.duration) || 0), 0);
    return sum || Number(state.duration) || 20;
  }

  function bindFields() {
    ["productName", "price", "benefits", "audience", "offer", "tone", "duration", "brandColor", "captionStyle", "musicVolume"].forEach(id => {
      const element = $(id);
      element.value = state[id];
      element.addEventListener("input", () => {
        state[id] = id === "duration" || id === "musicVolume" ? Number(element.value) : element.value;
        if (id === "duration" && state.scenes.length) redistributeDuration();
        if (id === "musicVolume") {
          musicAudio.volume = Number(element.value);
          $("musicVolumeValue").textContent = `${Math.round(Number(element.value) * 100)}%`;
        }
        saveState();
        updateTimeline();
        updateChecklist();
        renderFrame(currentTime);
      });
    });
    $("musicVolumeValue").textContent = `${Math.round(state.musicVolume * 100)}%`;
  }

  function redistributeDuration() {
    const each = Math.max(1.5, Number(state.duration) / state.scenes.length);
    state.scenes = state.scenes.map(scene => ({ ...scene, duration: Number(each.toFixed(1)) }));
    renderSceneEditor();
  }

  async function resizeImage(file) {
    const rawUrl = await fileToDataUrl(file);
    const image = await loadImage(rawUrl);
    const maxEdge = 1280;
    const scale = Math.min(1, maxEdge / Math.max(image.width, image.height));
    const out = document.createElement("canvas");
    out.width = Math.round(image.width * scale);
    out.height = Math.round(image.height * scale);
    out.getContext("2d").drawImage(image, 0, 0, out.width, out.height);
    return out.toDataURL("image/jpeg", .86);
  }

  function fileToDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  function loadImage(src) {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = reject;
      image.src = src;
    });
  }

  async function addImages(files) {
    const selected = [...files].filter(file => file.type.startsWith("image/")).slice(0, Math.max(0, 8 - state.assets.length));
    if (!selected.length) return;
    $("previewStatus").textContent = "กำลังเตรียมรูป...";
    for (const file of selected) {
      try {
        const dataUrl = await resizeImage(file);
        state.assets.push({ id: crypto.randomUUID?.() || `${Date.now()}-${Math.random()}`, name: file.name, dataUrl });
      } catch {
        toast(`อ่านรูป ${file.name} ไม่สำเร็จ`);
      }
    }
    if (!state.scenes.length) state.scenes = makeLocalScript().scenes;
    saveState();
    renderAssets();
    renderSceneEditor();
    updateTimeline();
    updateChecklist();
    await renderFrame(currentTime);
    $("previewStatus").textContent = `${state.assets.length} ภาพ · ${state.scenes.length} ฉาก`;
  }

  function renderAssets() {
    $("assetStrip").innerHTML = state.assets.map((asset, index) => `
      <div class="asset-thumb" draggable="true" data-index="${index}">
        <img src="${asset.dataUrl}" alt="${escapeHtml(asset.name)}">
        <span class="asset-index">${index + 1}</span>
        <button type="button" data-remove="${index}" title="ลบรูป"><i data-lucide="x"></i></button>
      </div>`).join("");
    $("emptyPreview").hidden = state.assets.length > 0;
    $("assetStrip").querySelectorAll("[data-remove]").forEach(button => button.addEventListener("click", event => {
      event.stopPropagation();
      state.assets.splice(Number(button.dataset.remove), 1);
      saveState();
      renderAssets();
      updateChecklist();
      renderFrame(currentTime);
    }));
    $("assetStrip").querySelectorAll(".asset-thumb").forEach(thumb => {
      thumb.addEventListener("dragstart", () => { dragIndex = Number(thumb.dataset.index); });
      thumb.addEventListener("dragover", event => event.preventDefault());
      thumb.addEventListener("drop", event => {
        event.preventDefault();
        const target = Number(thumb.dataset.index);
        if (dragIndex < 0 || dragIndex === target) return;
        const [asset] = state.assets.splice(dragIndex, 1);
        state.assets.splice(target, 0, asset);
        dragIndex = -1;
        saveState();
        renderAssets();
        renderFrame(currentTime);
      });
    });
    refreshIcons();
  }

  function makeLocalScript() {
    const name = state.productName.trim() || "สินค้าชิ้นนี้";
    const benefits = state.benefits.split(/[,\n]/).map(item => item.trim()).filter(Boolean).slice(0, 3);
    const points = benefits.length ? benefits : ["ใช้ง่ายในทุกวัน", "คุ้มค่าเกินราคา"];
    const scenes = [
      { headline: `หยุดเลื่อนก่อน! ${name}`, caption: state.audience || "ของดีที่อยากให้คุณลอง", narration: `หยุดเลื่อนก่อน ถ้าคุณกำลังมองหาของดี ลองดู ${name} ตัวนี้`, duration: 3 },
      ...points.map((point, index) => ({ headline: point, caption: `จุดเด่นที่ ${index + 1}`, narration: `${point} ออกแบบมาให้ใช้งานได้ง่ายในชีวิตประจำวัน`, duration: 4 })),
      { headline: state.offer || state.price || "โปรพิเศษวันนี้", caption: "กดสั่งซื้อที่ตะกร้าได้เลย", narration: `${state.offer || state.price || "โปรพิเศษวันนี้"} สนใจแล้วกดสั่งซื้อที่ตะกร้าได้เลย`, duration: 4 },
    ];
    const each = Math.max(1.5, Number(state.duration) / scenes.length);
    return { scenes: scenes.map(scene => ({ ...scene, duration: Number(each.toFixed(1)) })) };
  }

  async function generateScript() {
    const button = $("generateScriptBtn");
    button.disabled = true;
    button.innerHTML = '<i data-lucide="loader-circle"></i> AI กำลังเขียน...';
    refreshIcons();
    const session = getSession();
    const payload = {
      productName: state.productName,
      price: state.price,
      benefits: state.benefits,
      audience: state.audience,
      offer: state.offer,
      tone: state.tone,
      duration: state.duration,
      cta: "กดสั่งซื้อที่ตะกร้าได้เลย",
    };
    let result = null;
    if (apiUrl && session?.token) {
      try {
        const response = await fetch(`${apiUrl}/api/video/script`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.token}` },
          body: JSON.stringify(payload),
        });
        if (!response.ok) throw new Error(`AI ${response.status}`);
        result = await response.json();
      } catch (error) {
        toast(`AI ออนไลน์ยังไม่พร้อม ใช้โหมดร่างแทน: ${error.message}`);
      }
    }
    if (!result?.scenes?.length) result = { ...makeLocalScript(), mode: "local" };
    state.scenes = result.scenes.map(scene => ({
      headline: String(scene.headline || "จุดเด่นสินค้า"),
      caption: String(scene.caption || ""),
      narration: String(scene.narration || scene.caption || ""),
      duration: Math.max(1.5, Number(scene.duration) || 3),
    }));
    state.duration = Math.round(totalDuration());
    $("duration").value = state.duration;
    $("aiModeText").textContent = result.mode === "openai" ? "เขียนด้วย OpenAI แล้ว คุณแก้ข้อความแต่ละฉากต่อได้" : "สร้างร่างอัตโนมัติแล้ว ล็อกอินและตั้ง OPENAI_API_KEY เพื่อใช้ AI เต็มรูปแบบ";
    saveState();
    renderSceneEditor();
    updateTimeline();
    updateChecklist();
    renderFrame(0);
    button.disabled = false;
    button.innerHTML = '<i data-lucide="wand-sparkles"></i> เขียนสคริปต์ด้วย AI';
    refreshIcons();
  }

  function renderSceneEditor() {
    $("sceneEditor").innerHTML = state.scenes.map((scene, index) => `
      <details class="scene-card" ${index === 0 ? "open" : ""}>
        <summary><b>${index + 1}</b><span>${escapeHtml(scene.headline)}</span><small>${Number(scene.duration).toFixed(1)}s</small></summary>
        <div class="scene-fields">
          <input class="field" data-scene="${index}" data-key="headline" value="${escapeHtml(scene.headline)}" placeholder="ข้อความใหญ่">
          <input class="field" data-scene="${index}" data-key="caption" value="${escapeHtml(scene.caption)}" placeholder="คำบรรยายบนคลิป">
          <textarea class="field" rows="2" data-scene="${index}" data-key="narration" placeholder="เสียงพากย์">${escapeHtml(scene.narration)}</textarea>
          <input class="field" type="number" min="1.5" max="15" step="0.5" data-scene="${index}" data-key="duration" value="${Number(scene.duration).toFixed(1)}">
          <div class="scene-actions"><button type="button" data-delete-scene="${index}">ลบฉาก</button></div>
        </div>
      </details>`).join("");
    $("sceneEditor").querySelectorAll("[data-scene]").forEach(input => input.addEventListener("input", () => {
      const scene = state.scenes[Number(input.dataset.scene)];
      scene[input.dataset.key] = input.dataset.key === "duration" ? Math.max(1.5, Number(input.value) || 1.5) : input.value;
      state.duration = Math.round(totalDuration());
      saveState();
      updateTimeline();
      updateChecklist();
      renderFrame(currentTime);
    }));
    $("sceneEditor").querySelectorAll("[data-delete-scene]").forEach(button => button.addEventListener("click", () => {
      state.scenes.splice(Number(button.dataset.deleteScene), 1);
      saveState();
      renderSceneEditor();
      updateTimeline();
      updateChecklist();
      renderFrame(currentTime);
    }));
  }

  function addScene() {
    state.scenes.push({ headline: "จุดเด่นใหม่", caption: "เพิ่มรายละเอียดที่นี่", narration: "แก้ข้อความเสียงพากย์สำหรับฉากนี้", duration: 3 });
    saveState();
    renderSceneEditor();
    updateTimeline();
    updateChecklist();
  }

  function updateTimeline() {
    const total = totalDuration();
    $("timeline").max = total;
    $("timeline").value = Math.min(currentTime, total);
    $("currentTime").textContent = formatTime(currentTime);
    $("totalTime").textContent = formatTime(total);
    let cursor = 0;
    const active = sceneAt(currentTime).index;
    $("sceneTimeline").innerHTML = state.scenes.map((scene, index) => {
      const start = cursor;
      cursor += Number(scene.duration) || 0;
      return `<button class="scene-chip ${active === index ? "active" : ""}" data-seek="${start}"><strong>${escapeHtml(scene.headline)}</strong><span>${Number(scene.duration).toFixed(1)} วิ</span></button>`;
    }).join("");
    $("sceneTimeline").querySelectorAll("[data-seek]").forEach(button => button.addEventListener("click", () => seek(Number(button.dataset.seek))));
  }

  function sceneAt(time) {
    let cursor = 0;
    for (let index = 0; index < state.scenes.length; index++) {
      const duration = Math.max(.5, Number(state.scenes[index].duration) || 0);
      if (time < cursor + duration || index === state.scenes.length - 1) {
        return { scene: state.scenes[index], index, progress: Math.min(1, Math.max(0, (time - cursor) / duration)) };
      }
      cursor += duration;
    }
    return { scene: null, index: -1, progress: 0 };
  }

  function drawCover(image, progress, index) {
    const cw = canvas.width;
    const ch = canvas.height;
    const base = Math.max(cw / image.naturalWidth, ch / image.naturalHeight);
    const zoom = base * (1.03 + progress * .08);
    const width = image.naturalWidth * zoom;
    const height = image.naturalHeight * zoom;
    const drift = (index % 2 ? -1 : 1) * progress * 22;
    ctx.drawImage(image, (cw - width) / 2 + drift, (ch - height) / 2, width, height);
  }

  function roundedRect(x, y, width, height, radius) {
    ctx.beginPath();
    ctx.roundRect(x, y, width, height, radius);
  }

  function fitText(text, maxWidth, startSize, minSize = 28) {
    let size = startSize;
    while (size > minSize) {
      ctx.font = `800 ${size}px Manrope, IBM Plex Sans Thai, sans-serif`;
      if (ctx.measureText(text).width <= maxWidth) break;
      size -= 2;
    }
    return size;
  }

  async function renderFrame(time) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (!state.assets.length || !state.scenes.length) {
      ctx.fillStyle = "#211814";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      return;
    }
    const { scene, index, progress } = sceneAt(Math.min(time, totalDuration() - .001));
    const asset = state.assets[index % state.assets.length];
    if (!imageCache.has(asset.id)) {
      try { imageCache.set(asset.id, await loadImage(asset.dataUrl)); } catch { return; }
    }
    drawCover(imageCache.get(asset.id), progress, index);

    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, "rgba(10,7,5,.18)");
    gradient.addColorStop(.48, "rgba(10,7,5,.04)");
    gradient.addColorStop(1, "rgba(10,7,5,.78)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "rgba(255,255,255,.94)";
    roundedRect(42, 46, 190, 48, 24);
    ctx.fill();
    ctx.fillStyle = "#241a16";
    ctx.font = "700 22px Manrope, IBM Plex Sans Thai, sans-serif";
    ctx.fillText(state.productName || "PRODUCT PICK", 62, 78, 150);

    if (state.price) {
      ctx.fillStyle = state.brandColor;
      roundedRect(500, 46, 175, 55, 14);
      ctx.fill();
      ctx.fillStyle = "#fff";
      ctx.font = "800 26px Manrope, IBM Plex Sans Thai, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(state.price, 587, 82, 145);
      ctx.textAlign = "left";
    }

    const enter = Math.min(1, progress / .16);
    const yShift = (1 - enter) * 28;
    const panelY = state.captionStyle === "clean" ? 890 : 830;
    ctx.globalAlpha = enter;
    ctx.fillStyle = state.captionStyle === "premium" ? "rgba(24,18,15,.84)" : "rgba(255,253,249,.94)";
    roundedRect(38, panelY + yShift, 644, 310, 24);
    ctx.fill();
    ctx.fillStyle = state.captionStyle === "premium" ? "#f5d9a0" : state.brandColor;
    roundedRect(38, panelY + yShift, 10, 310, 6);
    ctx.fill();
    const titleColor = state.captionStyle === "premium" ? "#fff" : "#211814";
    ctx.fillStyle = titleColor;
    const titleSize = fitText(scene.headline, 555, 58, 34);
    ctx.font = `800 ${titleSize}px Manrope, IBM Plex Sans Thai, sans-serif`;
    ctx.fillText(scene.headline, 75, panelY + 88 + yShift, 555);
    ctx.fillStyle = state.captionStyle === "premium" ? "rgba(255,255,255,.74)" : "#675b54";
    ctx.font = "600 29px IBM Plex Sans Thai, sans-serif";
    wrapText(scene.caption, 75, panelY + 145 + yShift, 550, 40, 3);

    ctx.fillStyle = state.brandColor;
    roundedRect(75, panelY + 230 + yShift, 550, 58, 29);
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.font = "700 27px IBM Plex Sans Thai, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(index === state.scenes.length - 1 ? "กดสั่งซื้อที่ตะกร้าได้เลย" : "ดูต่ออีกนิด มีของดีบอกต่อ", 350, panelY + 269 + yShift, 510);
    ctx.textAlign = "left";
    ctx.globalAlpha = 1;

    ctx.fillStyle = "rgba(255,255,255,.34)";
    roundedRect(42, 1215, 636, 7, 4);
    ctx.fill();
    ctx.fillStyle = state.brandColor;
    roundedRect(42, 1215, 636 * Math.min(1, time / totalDuration()), 7, 4);
    ctx.fill();
  }

  function wrapText(text, x, y, maxWidth, lineHeight, maxLines) {
    const words = String(text || "").split(/\s+/);
    const lines = [];
    let line = "";
    for (const word of words) {
      const test = line ? `${line} ${word}` : word;
      if (ctx.measureText(test).width > maxWidth && line) {
        lines.push(line);
        line = word;
      } else line = test;
    }
    if (line) lines.push(line);
    lines.slice(0, maxLines).forEach((value, index) => ctx.fillText(value, x, y + index * lineHeight, maxWidth));
  }

  function seek(value) {
    currentTime = Math.max(0, Math.min(totalDuration(), value));
    if (playing) startedAt = performance.now() - currentTime * 1000;
    if (voiceAudio.src && Number.isFinite(voiceAudio.duration)) voiceAudio.currentTime = Math.min(currentTime, voiceAudio.duration || 0);
    if (musicAudio.src && Number.isFinite(musicAudio.duration)) musicAudio.currentTime = currentTime % (musicAudio.duration || 1);
    updateTimeline();
    renderFrame(currentTime);
  }

  function togglePlay() {
    if (!state.assets.length || !state.scenes.length) return toast("เพิ่มรูปและสร้างสคริปต์ก่อนเล่นพรีวิว");
    playing ? pause() : play();
  }

  function play() {
    if (currentTime >= totalDuration()) currentTime = 0;
    playing = true;
    startedAt = performance.now() - currentTime * 1000;
    $("playBtn").innerHTML = '<i data-lucide="pause"></i>';
    if (!muted) {
      if (voiceAudio.src) { voiceAudio.currentTime = Math.min(currentTime, voiceAudio.duration || 0); voiceAudio.play().catch(() => {}); }
      if (musicAudio.src) { musicAudio.currentTime = currentTime % (musicAudio.duration || 1); musicAudio.play().catch(() => {}); }
    }
    refreshIcons();
    animate();
  }

  function pause() {
    playing = false;
    cancelAnimationFrame(animationFrame);
    voiceAudio.pause();
    musicAudio.pause();
    $("playBtn").innerHTML = '<i data-lucide="play"></i>';
    refreshIcons();
  }

  function animate() {
    if (!playing) return;
    currentTime = (performance.now() - startedAt) / 1000;
    if (currentTime >= totalDuration()) {
      currentTime = totalDuration();
      pause();
    }
    renderFrame(currentTime);
    updateTimeline();
    if (playing) animationFrame = requestAnimationFrame(animate);
  }

  function narrationText() {
    return state.scenes.map(scene => scene.narration).filter(Boolean).join(" ");
  }

  async function generateVoice() {
    const text = narrationText();
    if (!text) return toast("สร้างสคริปต์ก่อนสร้างเสียงพากย์");
    const session = getSession();
    const button = $("generateVoiceBtn");
    button.disabled = true;
    $("voiceStatus").textContent = "AI กำลังพากย์...";
    if (apiUrl && session?.token) {
      try {
        const response = await fetch(`${apiUrl}/api/video/tts`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.token}` },
          body: JSON.stringify({ text, voice: $("voiceSelect").value, style: toneInstruction() }),
        });
        if (!response.ok) throw new Error((await response.json().catch(() => ({}))).error || `TTS ${response.status}`);
        voiceBlob = await response.blob();
        voiceAudio.src = URL.createObjectURL(voiceBlob);
        $("voiceStatus").textContent = "เสียง AI พร้อม";
        toast("สร้างเสียงพากย์ AI แล้ว กรุณาตรวจฟังก่อนส่งออก");
      } catch (error) {
        $("voiceStatus").textContent = "ใช้เสียงทดลองในเครื่อง";
        toast(`เสียง AI ยังไม่พร้อม: ${error.message}`);
        previewBrowserVoice();
      }
    } else {
      $("voiceStatus").textContent = "ใช้เสียงทดลองในเครื่อง";
      previewBrowserVoice();
    }
    button.disabled = false;
    updateChecklist();
  }

  function toneInstruction() {
    const tones = {
      friendly: "พูดภาษาไทยเป็นธรรมชาติ เป็นกันเอง ยิ้มในน้ำเสียง ชัดเจน",
      energetic: "พูดภาษาไทยกระฉับกระเฉง จังหวะเร็วเล็กน้อย เหมือนคลิปขายสินค้าสั้น",
      premium: "พูดภาษาไทยนุ่ม สุภาพ พรีเมียม เว้นจังหวะอย่างมั่นใจ",
      review: "พูดภาษาไทยเหมือนผู้ใช้รีวิวจริง เป็นธรรมชาติและน่าเชื่อถือ",
    };
    return tones[state.tone] || tones.friendly;
  }

  function previewBrowserVoice() {
    if (!("speechSynthesis" in window)) return toast("เบราว์เซอร์นี้ไม่มีเสียงอ่านทดลอง");
    speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(narrationText());
    utterance.lang = "th-TH";
    utterance.rate = state.tone === "energetic" ? 1.12 : state.tone === "premium" ? .92 : 1;
    speechSynthesis.speak(utterance);
  }

  function previewVoice() {
    if (voiceAudio.src) {
      voiceAudio.currentTime = 0;
      voiceAudio.play().catch(() => toast("กดอีกครั้งเพื่ออนุญาตเสียง"));
    } else previewBrowserVoice();
  }

  function updateChecklist() {
    const checks = { images: state.assets.length > 0, script: state.scenes.length > 0 && state.scenes.every(scene => scene.headline && scene.narration), voice: !!voiceBlob };
    Object.entries(checks).forEach(([key, done]) => {
      const item = document.querySelector(`[data-check="${key}"]`);
      if (!item) return;
      item.classList.toggle("done", done);
      const icon = item.querySelector("svg");
      if (icon) icon.setAttribute("data-lucide", done ? "circle-check" : "circle");
    });
    refreshIcons();
  }

  async function exportVideo() {
    if (!state.assets.length) return toast("เพิ่มรูปสินค้าอย่างน้อย 1 รูปก่อนส่งออก");
    if (!state.scenes.length) return toast("สร้างสคริปต์ก่อนส่งออก");
    pause();
    const button = $("exportBtn");
    button.disabled = true;
    $("exportProgress").hidden = false;
    $("exportProgressBar").style.width = "0%";
    $("exportNote").textContent = "กำลังเรนเดอร์แบบเรียลไทม์ อย่าปิดหน้านี้";

    try {
      const canvasStream = canvas.captureStream(30);
      const audio = await buildExportAudio();
      const tracks = [...canvasStream.getVideoTracks(), ...(audio?.stream.getAudioTracks() || [])];
      const combined = new MediaStream(tracks);
      const mp4Type = ["video/mp4;codecs=avc1.42E01E,mp4a.40.2", "video/mp4"].find(type => MediaRecorder.isTypeSupported(type));
      const webmType = ["video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm"].find(type => MediaRecorder.isTypeSupported(type));
      const mimeType = mp4Type || webmType;
      if (!mimeType) throw new Error("เบราว์เซอร์ไม่รองรับการบันทึกวิดีโอ");
      const chunks = [];
      const recorder = new MediaRecorder(combined, { mimeType, videoBitsPerSecond: 7_000_000 });
      recorder.ondataavailable = event => { if (event.data.size) chunks.push(event.data); };
      const stopped = new Promise(resolve => { recorder.onstop = resolve; });
      recorder.start(500);
      audio?.start();

      const duration = totalDuration();
      const exportStart = performance.now();
      await new Promise(resolve => {
        const tick = () => {
          const elapsed = (performance.now() - exportStart) / 1000;
          renderFrame(Math.min(duration - .001, elapsed));
          $("exportProgressBar").style.width = `${Math.min(94, elapsed / duration * 94)}%`;
          if (elapsed >= duration) return resolve();
          requestAnimationFrame(tick);
        };
        tick();
      });
      recorder.stop();
      audio?.stop();
      await stopped;
      let blob = new Blob(chunks, { type: mimeType });
      let extension = mimeType.includes("mp4") ? "mp4" : "webm";
      if (extension === "webm") {
        $("exportNote").textContent = "กำลังแปลงเป็น MP4 ครั้งแรกอาจใช้เวลาสักครู่";
        try {
          blob = await convertToMp4(blob);
          extension = "mp4";
        } catch (error) {
          toast("เครื่องนี้แปลง MP4 ไม่สำเร็จ จึงส่งออก WebM สำรองแทน");
          console.warn(error);
        }
      }
      downloadBlob(blob, `${slugify(state.productName || "shopee-product-video")}.${extension}`);
      $("exportProgressBar").style.width = "100%";
      $("exportNote").textContent = extension === "mp4" ? "ส่งออก MP4 สำเร็จ พร้อมอัปโหลดไป Shopee Video" : "ส่งออก WebM แล้ว แนะนำแปลงเป็น MP4 ก่อนอัปโหลด";
    } catch (error) {
      toast(`ส่งออกไม่สำเร็จ: ${error.message}`);
      $("exportNote").textContent = "ตรวจสอบรูป สคริปต์ และลองใหม่อีกครั้ง";
    } finally {
      button.disabled = false;
      renderFrame(currentTime);
    }
  }

  async function buildExportAudio() {
    if (!voiceBlob && !musicBlob) return null;
    const audioContext = new AudioContext();
    const destination = audioContext.createMediaStreamDestination();
    const sources = [];
    const addBlob = async (blob, volume, loop) => {
      if (!blob) return;
      const buffer = await audioContext.decodeAudioData(await blob.arrayBuffer());
      const source = audioContext.createBufferSource();
      source.buffer = buffer;
      source.loop = loop;
      const gain = audioContext.createGain();
      gain.gain.value = volume;
      source.connect(gain).connect(destination);
      sources.push(source);
    };
    await addBlob(voiceBlob, 1, false);
    await addBlob(musicBlob, state.musicVolume, true);
    return {
      stream: destination.stream,
      start() { sources.forEach(source => source.start()); },
      stop() { sources.forEach(source => { try { source.stop(); } catch {} }); audioContext.close(); },
    };
  }

  async function convertToMp4(webmBlob) {
    if (!window.FFmpeg) await loadScript("https://unpkg.com/@ffmpeg/ffmpeg@0.11.6/dist/ffmpeg.min.js");
    const { createFFmpeg, fetchFile } = window.FFmpeg;
    if (!ffmpegInstance) {
      ffmpegInstance = createFFmpeg({
        log: false,
        corePath: "https://unpkg.com/@ffmpeg/core@0.11.0/dist/ffmpeg-core.js",
        progress: ({ ratio }) => { $("exportProgressBar").style.width = `${94 + Math.max(0, Math.min(1, ratio)) * 6}%`; },
      });
      await ffmpegInstance.load();
    }
    ffmpegInstance.FS("writeFile", "input.webm", await fetchFile(webmBlob));
    await ffmpegInstance.run("-i", "input.webm", "-c:v", "libx264", "-preset", "ultrafast", "-pix_fmt", "yuv420p", "-c:a", "aac", "-movflags", "+faststart", "output.mp4");
    const data = ffmpegInstance.FS("readFile", "output.mp4");
    ffmpegInstance.FS("unlink", "input.webm");
    ffmpegInstance.FS("unlink", "output.mp4");
    return new Blob([data.buffer], { type: "video/mp4" });
  }

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = src;
      script.onload = resolve;
      script.onerror = () => reject(new Error("โหลดตัวแปลง MP4 ไม่สำเร็จ"));
      document.head.appendChild(script);
    });
  }

  function downloadBlob(blob, filename) {
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 10_000);
  }

  function slugify(value) {
    return String(value).trim().toLowerCase().replace(/[^a-z0-9ก-๙]+/g, "-").replace(/^-|-$/g, "") || "product-video";
  }

  function resetProject() {
    if (!confirm("เริ่มโปรเจกต์ใหม่และล้างข้อมูลในหน้านี้หรือไม่?")) return;
    state = { ...defaultState, assets: [], scenes: [] };
    voiceBlob = null;
    musicBlob = null;
    localStorage.removeItem(STORAGE_KEY);
    location.reload();
  }

  function setupEvents() {
    bindFields();
    $("imageInput").addEventListener("change", event => addImages(event.target.files));
    const zone = $("uploadZone");
    ["dragenter", "dragover"].forEach(type => zone.addEventListener(type, event => { event.preventDefault(); zone.classList.add("dragging"); }));
    ["dragleave", "drop"].forEach(type => zone.addEventListener(type, event => { event.preventDefault(); zone.classList.remove("dragging"); }));
    zone.addEventListener("drop", event => addImages(event.dataTransfer.files));
    $("generateScriptBtn").addEventListener("click", generateScript);
    $("addSceneBtn").addEventListener("click", addScene);
    $("generateVoiceBtn").addEventListener("click", generateVoice);
    $("previewVoiceBtn").addEventListener("click", previewVoice);
    $("voiceFileInput").addEventListener("change", event => {
      voiceBlob = event.target.files[0] || null;
      if (voiceBlob) {
        voiceAudio.src = URL.createObjectURL(voiceBlob);
        $("voiceStatus").textContent = `ไฟล์เสียง: ${voiceBlob.name}`;
        updateChecklist();
      }
    });
    $("musicInput").addEventListener("change", event => {
      musicBlob = event.target.files[0] || null;
      if (musicBlob) {
        musicAudio.src = URL.createObjectURL(musicBlob);
        musicAudio.volume = state.musicVolume;
        $("musicFileName").textContent = musicBlob.name;
      }
    });
    $("playBtn").addEventListener("click", togglePlay);
    $("timeline").addEventListener("input", event => seek(Number(event.target.value)));
    $("safeZoneBtn").addEventListener("click", () => { $("safeZone").hidden = !$("safeZone").hidden; });
    $("muteBtn").addEventListener("click", () => {
      muted = !muted;
      voiceAudio.muted = muted;
      musicAudio.muted = muted;
      $("muteBtn").innerHTML = `<i data-lucide="${muted ? "volume-x" : "volume-2"}"></i>`;
      refreshIcons();
    });
    $("exportBtn").addEventListener("click", exportVideo);
    $("newProjectBtn").addEventListener("click", resetProject);
    $("backBtn").addEventListener("click", () => { location.href = "dashboard-design.html"; });
  }

  function init() {
    setupEvents();
    renderAssets();
    renderSceneEditor();
    updateTimeline();
    updateChecklist();
    renderFrame(0);
    const session = getSession();
    $("aiModeText").textContent = session?.token
      ? "พร้อมใช้ AI เขียนสคริปต์และสร้างเสียงพากย์จาก Worker"
      : "ยังไม่พบ session: ใช้ร่างอัตโนมัติและเสียงทดลองในเครื่องได้";
    refreshIcons();
  }

  init();
})();
