import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadEnv, boolEnv, listEnv, numberEnv } from "./env.js";
import { fetchMexcEvents } from "./mexc.js";
import { formatLineMessage, sendLineMessage } from "./line.js";
import { loadState, rememberEvent, saveState } from "./storage.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
loadEnv(rootDir);

const args = new Set(process.argv.slice(2));
const config = {
  rootDir,
  statePath: path.join(rootDir, "data", "events.json"),
  lineChannelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN || "",
  lineToId: process.env.LINE_TO_ID || "",
  lineNotifyToken: process.env.LINE_NOTIFY_TOKEN || "",
  announcementUrls: listEnv("MEXC_ANNOUNCEMENT_URLS", [
    "https://www.mexc.com/support/search?query=launchpad"
  ]),
  includeFinished: boolEnv("MEXC_INCLUDE_FINISHED", false),
  notifyOnFirstRun: args.has("--notify-existing") || boolEnv("MEXC_NOTIFY_ON_FIRST_RUN", false),
  chromeFallback: boolEnv("MEXC_CHROME_FALLBACK", true),
  chromePath: process.env.CHROME_PATH || "",
  requestTimeoutMs: numberEnv("MEXC_REQUEST_TIMEOUT_MS", 15000),
  chromeTimeoutMs: numberEnv("MEXC_CHROME_TIMEOUT_MS", 30000),
  intervalMs: numberEnv("MEXC_CHECK_INTERVAL_MINUTES", 10) * 60 * 1000,
  timeZone: process.env.TZ || "Asia/Bangkok"
};

async function runCheck() {
  const state = await loadState(config.statePath);
  const firstRun = !state.updatedAt;
  const events = await fetchMexcEvents(config);
  const newEvents = events.filter(event => !state.events[event.id]?.notifiedAt && !state.events[event.id]);

  if (firstRun && !config.notifyOnFirstRun) {
    for (const event of events) rememberEvent(state, event, false);
    await saveState(config.statePath, state);
    console.log(`[mexc] seeded ${events.length} events. No notification sent on first run.`);
    return;
  }

  let sent = 0;
  for (const event of newEvents) {
    const message = formatLineMessage(event);
    const result = await sendLineMessage(message, config);
    rememberEvent(state, event, !result?.skipped);
    if (result?.skipped) {
      console.warn(`[mexc] notification skipped because LINE token is empty: ${event.title}`);
      continue;
    }
    sent += 1;
    console.log(`[mexc] notified: ${event.title}`);
  }

  for (const event of events) {
    if (!state.events[event.id]) rememberEvent(state, event, false);
  }
  await saveState(config.statePath, state);
  console.log(`[mexc] checked ${events.length} events, new=${newEvents.length}, sent=${sent}`);
}

async function main() {
  console.log(`[mexc] Launchpad monitor started. interval=${Math.round(config.intervalMs / 60000)}m`);
  await runCheck().catch(error => console.error(`[mexc] check failed: ${error.stack || error.message}`));
  if (args.has("--once")) return;
  setInterval(() => {
    runCheck().catch(error => console.error(`[mexc] check failed: ${error.stack || error.message}`));
  }, config.intervalMs);
}

main();
