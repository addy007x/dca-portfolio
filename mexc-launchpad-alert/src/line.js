export function formatLineMessage(event) {
  return [
    "MEXC Launchpad แจ้งเตือนกิจกรรมใหม่",
    `ชื่อกิจกรรม: ${event.title || "-"}`,
    `Token: ${event.token || "-"}`,
    `เวลาเริ่ม: ${event.startText || event.startTime || "-"}`,
    `เวลาสิ้นสุด: ${event.endText || event.endTime || "-"}`,
    `ลิงก์เข้าร่วม: ${event.url || "-"}`
  ].join("\n");
}

export async function sendLineMessage(text, config) {
  if (config.lineNotifyToken) {
    return sendLineNotify(text, config.lineNotifyToken);
  }
  if (!config.lineChannelAccessToken) {
    console.warn("[line] LINE_CHANNEL_ACCESS_TOKEN is empty. Skip notification.");
    return { skipped: true };
  }
  if (config.lineToId) {
    return sendLinePush(text, config.lineChannelAccessToken, config.lineToId);
  }
  return sendLineBroadcast(text, config.lineChannelAccessToken);
}

async function sendLinePush(text, token, to) {
  const response = await fetch("https://api.line.me/v2/bot/message/push", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      to,
      messages: [{ type: "text", text }]
    })
  });
  await assertLineOk(response, "LINE push");
}

async function sendLineBroadcast(text, token) {
  const response = await fetch("https://api.line.me/v2/bot/message/broadcast", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      messages: [{ type: "text", text }]
    })
  });
  await assertLineOk(response, "LINE broadcast");
}

async function sendLineNotify(text, token) {
  const body = new URLSearchParams({ message: text });
  const response = await fetch("https://notify-api.line.me/api/notify", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body
  });
  await assertLineOk(response, "LINE Notify");
}

async function assertLineOk(response, label) {
  if (response.ok) return;
  const body = await response.text().catch(() => "");
  throw new Error(`${label} failed: ${response.status} ${body.slice(0, 300)}`);
}
