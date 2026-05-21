/* Lightweight QZ Tray bridge integration helper.
   This module exposes a small API that attempts to connect to QZ Tray
   running locally and provides `printHtml`, `printRaw`, and `isAvailable`.

   Note: runtime requires the `qz-tray` client library. Install with:
     npm install qz-tray

   The functions fallback to `window.print()` when QZ is not available.
*/
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
let qz: any = null;
try {
  // lazy import to avoid bundler errors if package not installed
  // eslint-disable-next-line global-require
  qz = require("qz-tray");
} catch (e) {
  // not installed — we'll handle gracefully
  qz = null;
}

const DEFAULT_CONFIG = {
  retries: 3,
  retryDelay: 700,
};

export async function connect(options = {}) {
  if (!qz) return false;
  const cfg = { ...DEFAULT_CONFIG, ...options };
  try {
    if (qz.websocket.isActive()) return true;
    await qz.security.setCertificatePromise(() => Promise.resolve(""));
    await qz.websocket.connect();
    return qz.websocket.isActive();
  } catch (err) {
    // retry a few times
    for (let i = 0; i < cfg.retries; i += 1) {
      // eslint-disable-next-line no-await-in-loop
      await new Promise((r) => setTimeout(r, cfg.retryDelay));
      try {
        if (qz.websocket.isActive()) return true;
        // eslint-disable-next-line no-await-in-loop
        await qz.websocket.connect();
        if (qz.websocket.isActive()) return true;
      } catch (_) {}
    }
    return false;
  }
}

export function isAvailable() {
  return !!(
    qz &&
    qz.websocket &&
    qz.websocket.isActive &&
    qz.websocket.isActive()
  );
}

export async function printHtml(
  html: string,
  options: { printer?: string } = {},
) {
  if (qz && qz.websocket && qz.websocket.isActive && qz.websocket.isActive()) {
    // build a config for the target printer if provided
    const cfg = options.printer
      ? qz.configs.create(options.printer)
      : qz.configs.create();

    const data = [{ type: "html", format: "plain", data: html }];
    return qz.print(cfg, data).catch((e) => {
      console.error("QZ printHtml error", e);
      throw e;
    });
  }

  // fallback: open a hidden window and call print
  try {
    const w = window.open("", "_blank", "toolbar=0,location=0,menubar=0");
    if (!w) return window.print();
    w.document.open();
    w.document.write(html);
    w.document.close();
    w.focus();
    setTimeout(() => {
      try {
        w.print();
        w.close();
      } catch (e) {}
    }, 300);
    return Promise.resolve(true);
  } catch (err) {
    console.error("fallback printHtml failed", err);
    return Promise.reject(err);
  }
}

export async function printRaw(
  commands: string | string[],
  options: { printer?: string } = {},
) {
  if (qz && qz.websocket && qz.websocket.isActive && qz.websocket.isActive()) {
    const cfg = options.printer
      ? qz.configs.create(options.printer)
      : qz.configs.create();
    const raw = Array.isArray(commands) ? commands : [commands];
    // send as raw
    return qz.print(cfg, raw).catch((e) => {
      console.error("QZ printRaw error", e);
      throw e;
    });
  }
  return Promise.reject(new Error("QZ not available"));
}

export default {
  connect,
  isAvailable,
  printHtml,
  printRaw,
};
