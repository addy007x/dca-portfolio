import fs from "node:fs/promises";
import path from "node:path";

export async function loadState(filePath) {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    const state = JSON.parse(raw);
    return {
      createdAt: state.createdAt || new Date().toISOString(),
      updatedAt: state.updatedAt || null,
      events: state.events && typeof state.events === "object" ? state.events : {}
    };
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
    return { createdAt: new Date().toISOString(), updatedAt: null, events: {} };
  }
}

export async function saveState(filePath, state) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  const next = { ...state, updatedAt: new Date().toISOString() };
  await fs.writeFile(filePath, `${JSON.stringify(next, null, 2)}\n`, "utf8");
}

export function isEmptyState(state) {
  return !state?.events || Object.keys(state.events).length === 0;
}

export function rememberEvent(state, event, notified = false) {
  state.events[event.id] = {
    id: event.id,
    title: event.title,
    token: event.token,
    url: event.url,
    startTime: event.startTime,
    endTime: event.endTime,
    source: event.source,
    firstSeenAt: state.events[event.id]?.firstSeenAt || new Date().toISOString(),
    notifiedAt: notified ? new Date().toISOString() : state.events[event.id]?.notifiedAt || null
  };
}
