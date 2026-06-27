import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";

const LAUNCHPAD_URL = "https://www.mexc.com/launchpad";
const LAUNCHPAD_API_URL = "https://www.mexc.com/api/financialactivity/launchpad/list";
const DEFAULT_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36",
  "Accept": "application/json,text/plain,*/*",
  "Accept-Language": "en-US,en;q=0.9",
  "Referer": LAUNCHPAD_URL
};

export async function fetchMexcEvents(config) {
  const events = [];
  const launchpadPayload = await fetchLaunchpadPayload(config);
  events.push(...normalizeLaunchpadPayload(launchpadPayload, config));

  for (const url of config.announcementUrls) {
    try {
      const html = await fetchText(url, config);
      events.push(...extractAnnouncementEvents(html, url));
    } catch (error) {
      console.warn(`[mexc] announcement source failed: ${url} (${error.message})`);
    }
  }

  return dedupeEvents(events)
    .filter(event => config.includeFinished || event.status !== "FINISHED")
    .sort((a, b) => (Date.parse(a.startTime || 0) || 0) - (Date.parse(b.startTime || 0) || 0));
}

async function fetchLaunchpadPayload(config) {
  try {
    const api = await fetchJson(LAUNCHPAD_API_URL, config);
    const payload = api?.data || api;
    if (payload?.launchpads) return payload;
  } catch (error) {
    console.warn(`[mexc] direct launchpad API failed: ${error.message}`);
  }

  const html = await fetchText(LAUNCHPAD_URL, config);
  const nextData = parseNextData(html);
  const payload = nextData?.props?.pageProps?.fallback?.["/api/financialactivity/launchpad/list"];
  if (!payload?.launchpads) throw new Error("MEXC Launchpad data not found in page fallback");
  return payload;
}

async function fetchJson(url, config) {
  const text = await fetchText(url, config);
  return JSON.parse(text);
}

async function fetchText(url, config) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.requestTimeoutMs);
  try {
    const response = await fetch(url, {
      headers: DEFAULT_HEADERS,
      signal: controller.signal,
      redirect: "follow"
    });
    const text = await response.text();
    if (!response.ok || /Access Denied/i.test(text)) {
      throw new Error(`HTTP ${response.status} ${response.statusText || ""}`.trim());
    }
    return text;
  } catch (error) {
    if (!config.chromeFallback) throw error;
    return fetchTextWithChrome(url, config);
  } finally {
    clearTimeout(timer);
  }
}

async function fetchTextWithChrome(url, config) {
  const chromePath = await findChrome(config.chromePath);
  if (!chromePath) throw new Error("Chrome fallback enabled but Chrome was not found");
  const userDataDir = await fs.mkdtemp(path.join(os.tmpdir(), "mexc-alert-chrome-"));
  try {
    return await runChromeDump(chromePath, url, userDataDir, config.chromeTimeoutMs);
  } finally {
    await fs.rm(userDataDir, { recursive: true, force: true }).catch(() => {});
  }
}

async function findChrome(chromePath) {
  const candidates = [
    chromePath,
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/usr/bin/google-chrome",
    "/usr/bin/google-chrome-stable",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser"
  ].filter(Boolean);
  for (const candidate of candidates) {
    try {
      await fs.access(candidate);
      return candidate;
    } catch (_) {}
  }
  return "";
}

function runChromeDump(chromePath, url, userDataDir, timeoutMs) {
  return new Promise((resolve, reject) => {
    const args = [
      "--headless=new",
      "--disable-gpu",
      "--no-first-run",
      "--disable-extensions",
      `--user-data-dir=${userDataDir}`,
      "--virtual-time-budget=6000",
      "--dump-dom",
      url
    ];
    const child = spawn(chromePath, args, { windowsHide: true });
    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      reject(new Error(`Chrome dump timed out after ${timeoutMs}ms`));
    }, timeoutMs);
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", chunk => { stdout += chunk; });
    child.stderr.on("data", chunk => { stderr += chunk; });
    child.on("error", error => {
      clearTimeout(timer);
      reject(error);
    });
    child.on("close", code => {
      clearTimeout(timer);
      if (code !== 0 && !stdout) {
        reject(new Error(`Chrome exited ${code}: ${stderr.slice(0, 300)}`));
        return;
      }
      if (/Access Denied/i.test(stdout)) {
        reject(new Error("Chrome received Access Denied page"));
        return;
      }
      resolve(stdout);
    });
  });
}

function parseNextData(html) {
  const marker = '<script id="__NEXT_DATA__" type="application/json">';
  const start = html.indexOf(marker);
  if (start < 0) return null;
  const jsonStart = start + marker.length;
  const end = html.indexOf("</script>", jsonStart);
  if (end < 0) return null;
  return JSON.parse(html.slice(jsonStart, end));
}

function normalizeLaunchpadPayload(payload, config) {
  const items = Array.isArray(payload?.launchpads) ? payload.launchpads : [];
  return items.map(item => {
    const token = cleanToken(item.activityCoin || item.activityCoinFullName || "");
    const id = `mexc-launchpad:${item.launchpadId || item.id || token}`;
    const url = buildLaunchpadUrl(item);
    return {
      id,
      title: `MEXC Launchpad: ${item.activityCoinFullName || item.activityCoin || token || "New Token"}`,
      token,
      url,
      startTime: toIso(item.startTime || item.preStartTime),
      endTime: toIso(item.endTime || item.settleTime || item.settleEndTime),
      startText: formatBangkok(item.startTime || item.preStartTime, config.timeZone),
      endText: formatBangkok(item.endTime || item.settleTime || item.settleEndTime, config.timeZone),
      status: item.activityStatus || "",
      source: "launchpad",
      raw: {
        id: item.id,
        launchpadId: item.launchpadId,
        activityStatus: item.activityStatus
      }
    };
  });
}

function buildLaunchpadUrl(item) {
  const token = encodeURIComponent(String(item.activityCoin || item.activityCoinFullName || "token"));
  const id = encodeURIComponent(String(item.id || item.launchpadId || ""));
  return id ? `https://www.mexc.com/launchpad/${token}/${id}` : LAUNCHPAD_URL;
}

function extractAnnouncementEvents(html, sourceUrl) {
  const links = [];
  const pattern = /<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let match;
  while ((match = pattern.exec(html))) {
    const href = decodeHtml(stripTags(match[1]));
    const title = decodeHtml(stripTags(match[2])).replace(/\s+/g, " ").trim();
    const haystack = `${title} ${href}`.toLowerCase();
    if (!title || !haystack.includes("launchpad")) continue;
    const url = new URL(href, sourceUrl).toString();
    links.push({
      id: `mexc-announcement:${stableId(url || title)}`,
      title,
      token: extractToken(title),
      url,
      startTime: "",
      endTime: "",
      startText: "-",
      endText: "-",
      status: "ANNOUNCEMENT",
      source: "announcement"
    });
  }
  return links;
}

function dedupeEvents(events) {
  const map = new Map();
  for (const event of events) {
    if (!event?.id) continue;
    if (!map.has(event.id)) map.set(event.id, event);
  }
  return [...map.values()];
}

function cleanToken(value) {
  return String(value || "")
    .replace(/\((PRE|POST|NEW)\)/gi, "")
    .replace(/[^A-Z0-9._-]/gi, "")
    .trim()
    .toUpperCase();
}

function extractToken(title) {
  const paren = String(title || "").match(/\(([A-Z0-9._-]{2,20})\)/i);
  if (paren) return paren[1].toUpperCase();
  const token = String(title || "").match(/\b([A-Z0-9]{2,12})\b(?=\s*(Token|Launchpad|Listing|Airdrop|USDT)?)/i);
  return token ? token[1].toUpperCase() : "";
}

function toIso(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return "";
  return new Date(n).toISOString();
}

function formatBangkok(value, timeZone) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return "-";
  return new Intl.DateTimeFormat("th-TH", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).format(new Date(n));
}

function stripTags(value) {
  return String(value || "").replace(/<[^>]+>/g, " ");
}

function decodeHtml(value) {
  return String(value || "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'");
}

function stableId(value) {
  let hash = 0;
  for (const char of String(value || "")) hash = ((hash << 5) - hash + char.charCodeAt(0)) | 0;
  return Math.abs(hash).toString(36);
}
