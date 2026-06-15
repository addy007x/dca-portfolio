import { spawn } from "node:child_process";
import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";

const chromePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const previewUrl = "http://127.0.0.1:5173/dca-portfolio/pos/index.html";
const qaDir = path.resolve("qa", "mobile-scanner");
const profileDir = path.join(qaDir, "profile");
const port = 9337;

await rm(qaDir, { recursive: true, force: true });
await mkdir(profileDir, { recursive: true });

const chrome = spawn(chromePath, [
  "--headless=new",
  "--disable-gpu",
  "--disable-dev-shm-usage",
  "--no-first-run",
  `--remote-debugging-port=${port}`,
  `--user-data-dir=${profileDir}`,
  "--window-size=390,844",
  previewUrl
], { stdio: "ignore" });

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function findTarget() {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      const targets = await fetch(`http://127.0.0.1:${port}/json/list`).then((response) => response.json());
      const target = targets.find((item) => item.type === "page" && item.url.includes("/pos/"));
      if (target) return target;
    } catch {}
    await sleep(250);
  }
  throw new Error("Chrome target did not start");
}

const target = await findTarget();
const socket = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve, reject) => {
  socket.addEventListener("open", resolve, { once: true });
  socket.addEventListener("error", reject, { once: true });
});

let commandId = 0;
const pending = new Map();
socket.addEventListener("message", ({ data }) => {
  const message = JSON.parse(data);
  if (!message.id || !pending.has(message.id)) return;
  const { resolve, reject } = pending.get(message.id);
  pending.delete(message.id);
  if (message.error) reject(new Error(message.error.message));
  else resolve(message.result);
});

function command(method, params = {}) {
  commandId += 1;
  return new Promise((resolve, reject) => {
    pending.set(commandId, { resolve, reject });
    socket.send(JSON.stringify({ id: commandId, method, params }));
  });
}

async function evaluate(expression) {
  const result = await command("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text);
  return result.result.value;
}

async function screenshot(filename) {
  const result = await command("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
  await writeFile(path.join(qaDir, filename), Buffer.from(result.data, "base64"));
}

await command("Page.enable");
await command("Runtime.enable");
await sleep(1800);

const saleButtonFound = await evaluate(`Boolean(document.querySelector('button[aria-label="เปิดกล้องสแกนบาร์โค้ด"]'))`);
if (!saleButtonFound) throw new Error("Sale scanner button was not found");
await evaluate(`document.querySelector('button[aria-label="เปิดกล้องสแกนบาร์โค้ด"]').click()`);
await sleep(1800);
const saleModalText = await evaluate(`document.querySelector('.scanner-modal')?.innerText || ''`);
if (!saleModalText.includes("สแกนสินค้าที่ขาย") || !saleModalText.includes("กรอกรหัสเอง")) throw new Error("Sale scanner modal is incomplete");
await screenshot("sale-scanner-mobile.png");

await evaluate(`(() => {
  const input = document.querySelector('.manual-barcode input');
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
  setter.call(input, '8850127000011');
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.closest('form').requestSubmit();
})()`);
await sleep(500);
const saleAdded = await evaluate(`document.querySelector('.cart-items')?.innerText.includes('นมสดรสจืด') || false`);
if (!saleAdded) throw new Error("Manual barcode fallback did not add the scanned product");

await evaluate(`document.querySelector('.add-product-category').click()`);
await sleep(300);
const addScannerFound = await evaluate(`Boolean(document.querySelector('.scan-field-button'))`);
if (!addScannerFound) throw new Error("Add-product scanner button was not found");
await evaluate(`document.querySelector('.scan-field-button').click()`);
await sleep(1800);
const productModalText = await evaluate(`document.querySelector('.scanner-modal')?.innerText || ''`);
if (!productModalText.includes("สแกนบาร์โค้ดสินค้าใหม่")) throw new Error("Product scanner modal is incomplete");
await screenshot("product-scanner-mobile.png");

await evaluate(`(() => {
  const input = document.querySelector('.scanner-modal .manual-barcode input');
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
  setter.call(input, '1234567890123');
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.closest('form').requestSubmit();
})()`);
await sleep(400);
const productBarcodeFilled = await evaluate(`document.querySelector('.product-modal input[inputmode="numeric"]')?.value === '1234567890123'`);
if (!productBarcodeFilled) throw new Error("Product barcode was not filled after scanning");

console.log(JSON.stringify({ saleButtonFound, addScannerFound, saleModal: true, productModal: true, saleAdded, productBarcodeFilled }));
socket.close();
chrome.kill();
