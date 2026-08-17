import { spawn } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const OS_INPUT_PS1 = path.join(__dirname, "os-input.ps1");
const OS_WINDOW_PS1 = path.join(__dirname, "os-window.ps1");

export async function getWindowClientOrigin(titleMatch) {
  const full = ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", OS_WINDOW_PS1, "-TitleMatch", titleMatch];
  const out = await new Promise((resolve, reject) => {
    const child = spawn("powershell", full, { windowsHide: false });
    let o = "";
    let e = "";
    child.stdout.on("data", (d) => (o += d));
    child.stderr.on("data", (d) => (e += d));
    child.on("error", reject);
    child.on("close", (code) => (code === 0 ? resolve(o) : reject(new Error(e.trim() || `exit ${code}`))));
  });
  try {
    return JSON.parse(out.trim());
  } catch {
    return null;
  }
}

export function runPS(args) {
  return new Promise((resolve, reject) => {
    const full = ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", OS_INPUT_PS1, ...args];
    const child = spawn("powershell", full, { windowsHide: false });
    let out = "";
    let err = "";
    child.stdout.on("data", (d) => (out += d));
    child.stderr.on("data", (d) => (err += d));
    child.on("error", reject);
    child.on("close", (code) =>
      code === 0 ? resolve(out) : reject(new Error(err.trim() || `powershell exit ${code}`))
    );
  });
}

export async function osRun(args, label = "") {
  console.log(`[os] ${label || args.join(" ")}`);
  await runPS(args);
}

export async function osMove(x, y, glide = true) {
  const args = [];
  if (glide) args.push("-Glide", "-X", String(x), "-Y", String(y));
  await runPS(args);
}

export async function osClick(x, y, { glide = true } = {}) {
  const args = [];
  if (glide) args.push("-Glide", "-X", String(x), "-Y", String(y));
  args.push("-Click");
  await runPS(args);
}

export async function osType(text) {
  await runPS(["-Type", text]);
}

export async function osKey(key) {
  await runPS(["-Key", key]);
}

export async function osScroll(lines = 3) {
  await runPS(["-ScrollDown", "-ScrollLines", String(lines)]);
}

export async function osDoubleClick(x, y) {
  const args = ["-Glide", "-X", String(x), "-Y", String(y), "-DoubleClick"];
  await runPS(args);
}

/* Convert a Playwright locator's DOM bounding box to PHYSICAL screen pixels.
   Truth source: Win32 ClientToScreen of the matching Chrome window, so the
   conversion is independent of CDP window-bounds units and browser chrome. */
export async function elementScreenPoint(page, locator) {
  const box = await locator.boundingBox();
  if (!box) return null;
  const title = (await page.title().catch(() => "")) || (await page.url().catch(() => ""));
  const win = await getWindowClientOrigin(title);
  const m = await page.evaluate(() => ({
    dpr: window.devicePixelRatio,
  }));
  if (win && win.client) {
    const cx = box.x + box.width / 2;
    const cy = box.y + box.height / 2;
    return {
      x: Math.round(win.client.x + cx * m.dpr),
      y: Math.round(win.client.y + cy * m.dpr),
      dpr: m.dpr,
      client: win.client,
      box,
      source: "win32",
      title: win.title,
    };
  }
  return null;
}

export async function osClickLocator(page, locator, { glide = true, before = null, after = null } = {}) {
  const pt = await elementScreenPoint(page, locator);
  if (!pt) throw new Error("no screen point for locator");
  if (before) await before(pt);
  const args = [];
  if (glide) args.push("-Glide", "-X", String(pt.x), "-Y", String(pt.y));
  args.push("-Click");
  await runPS(args);
  if (after) await after(pt);
  return pt;
}
