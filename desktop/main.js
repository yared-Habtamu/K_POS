const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const fs = require("fs");

let win;
let isSyncing = false;
let lastSyncAt = null;
let lastSyncError = null;

function getBuiltIndexPath() {
  const packagedPath = path.join(
    process.resourcesPath,
    "web-dist",
    "index.html",
  );
  const repoBuildPath = path.join(__dirname, "..", "web", "dist", "index.html");

  if (app.isPackaged && fs.existsSync(packagedPath)) {
    return packagedPath;
  }

  return repoBuildPath;
}

async function loadStartupFallback(errorText) {
  const builtIndexPath = getBuiltIndexPath();
  if (fs.existsSync(builtIndexPath)) {
    await win.loadFile(builtIndexPath);
    return;
  }

  const html = `<!doctype html>
  <html>
    <head>
      <meta charset="utf-8" />
      <title>POS Desktop</title>
      <style>
        body { font-family: Segoe UI, Arial, sans-serif; padding: 24px; color: #111; }
        h2 { margin-top: 0; }
        code { background: #f3f3f3; padding: 2px 6px; border-radius: 4px; }
        .muted { color: #666; }
      </style>
    </head>
    <body>
      <h2>POS Desktop could not load the UI</h2>
      <p>The dev server at <code>http://localhost:5173</code> is not running, and built files were not found at <code>web/dist</code>.</p>
      <p>Start the web app first:</p>
      <pre>cd web\npnpm install\npnpm dev</pre>
      <p>Or build once for packaged loading:</p>
      <pre>cd web\npnpm build</pre>
      <p class="muted">Details: ${String(errorText || "").replace(/</g, "&lt;")}</p>
    </body>
  </html>`;
  await win.loadURL(`data:text/html;charset=UTF-8,${encodeURIComponent(html)}`);
}

function createWindow() {
  win = new BrowserWindow({
    width: 1200,
    height: 800,
    backgroundColor: "#ffffff",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  win.webContents.on(
    "did-fail-load",
    async (_event, errorCode, errorDescription, validatedURL) => {
      const isDevUrl = String(validatedURL || "").startsWith(
        "http://localhost:5173",
      );
      if (isDevUrl) {
        await loadStartupFallback(`${errorDescription} (${errorCode})`);
      }
    },
  );

  const startUrl = process.env.ELECTRON_START_URL;
  if (startUrl) {
    win
      .loadURL(startUrl)
      .catch((err) => loadStartupFallback(err?.message || err));
  } else {
    // Load the built web app
    const indexPath = getBuiltIndexPath();
    if (fs.existsSync(indexPath)) {
      win
        .loadFile(indexPath)
        .catch((err) => loadStartupFallback(err?.message || err));
    } else {
      loadStartupFallback("Built UI not found at web/dist/index.html");
    }
  }
}

// Initialize local DB (JSON file) under app data folder
function openLocalDatabase() {
  const userData = app.getPath("userData");
  if (!fs.existsSync(userData)) fs.mkdirSync(userData, { recursive: true });
  const dbPath = path.join(userData, "pos-local.json");
  if (!fs.existsSync(dbPath)) {
    fs.writeFileSync(
      dbPath,
      JSON.stringify({ sales: [], cache: { products: [] } }, null, 2),
      "utf8",
    );
  }

  const read = () => {
    try {
      const parsed = JSON.parse(fs.readFileSync(dbPath, "utf8"));
      return {
        sales: Array.isArray(parsed.sales) ? parsed.sales : [],
        cache: {
          products: Array.isArray(parsed?.cache?.products)
            ? parsed.cache.products
            : [],
        },
      };
    } catch (e) {
      return { sales: [], cache: { products: [] } };
    }
  };

  const write = (data) => {
    fs.writeFileSync(dbPath, JSON.stringify(data, null, 2), "utf8");
  };

  return { read, write, dbPath };
}

function getBackendUrl() {
  return process.env.POS_BACKEND_URL || "http://localhost:4000";
}

async function syncPendingSales() {
  if (isSyncing) {
    return {
      ok: true,
      skipped: true,
      reason: "sync_in_progress",
      lastSyncAt,
      lastSyncError,
    };
  }

  isSyncing = true;
  const backendUrl = getBackendUrl();
  let syncedCount = 0;
  let failedCount = 0;

  try {
    const db = global.localDb.read();
    const pending = (db.sales || [])
      .filter((sale) => !sale.synced)
      .sort((a, b) => a.created_at - b.created_at);

    for (const row of pending) {
      try {
        const payload = row.payload || {};
        const authToken =
          payload._authToken || payload.authToken || payload.token || null;
        const requestPayload = { ...payload };
        delete requestPayload._authToken;
        delete requestPayload.authToken;
        delete requestPayload.token;

        const headers = { "Content-Type": "application/json" };
        if (authToken) headers.Authorization = `Bearer ${authToken}`;

        const res = await fetch(`${backendUrl}/api/sales`, {
          method: "POST",
          headers,
          body: JSON.stringify(requestPayload),
        });

        if (res.ok) {
          const current = global.localDb.read();
          const sale = current.sales.find((item) => item.id === row.id);
          if (sale) {
            sale.synced = true;
            sale.synced_at = Date.now();
            global.localDb.write(current);
          }
          syncedCount += 1;
        } else {
          failedCount += 1;
          lastSyncError = `POST /api/sales failed: ${res.status}`;
        }
      } catch (e) {
        failedCount += 1;
        lastSyncError = String(e?.message || e || "sync error");
      }
    }

    lastSyncAt = Date.now();

    return {
      ok: true,
      skipped: false,
      syncedCount,
      failedCount,
      lastSyncAt,
      lastSyncError,
    };
  } finally {
    isSyncing = false;
  }
}

app.whenReady().then(() => {
  try {
    const sessionDataDir = path.join(app.getPath("userData"), "session-data");
    if (!fs.existsSync(sessionDataDir))
      fs.mkdirSync(sessionDataDir, { recursive: true });
    app.setPath("sessionData", sessionDataDir);
  } catch (e) {
    // keep default session path if custom path fails
  }

  global.localDb = openLocalDatabase();

  // IPC handlers for renderer
  ipcMain.handle("db:getQueuedSales", () => {
    const db = global.localDb.read();
    return db.sales
      .filter((sale) => !sale.synced)
      .sort((a, b) => a.created_at - b.created_at);
  });

  ipcMain.handle("db:saveSale", (event, sale) => {
    const db = global.localDb.read();
    const id =
      sale.id ||
      `local_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const existingIndex = db.sales.findIndex((item) => item.id === id);
    const record = {
      id,
      payload: sale,
      created_at: Date.now(),
      synced: false,
      synced_at: null,
    };
    if (existingIndex >= 0) db.sales[existingIndex] = record;
    else db.sales.push(record);
    global.localDb.write(db);
    return { id };
  });

  ipcMain.handle("db:markSynced", (event, id) => {
    const db = global.localDb.read();
    const sale = db.sales.find((item) => item.id === id);
    if (sale) {
      sale.synced = true;
      sale.synced_at = Date.now();
      global.localDb.write(db);
    }
    return { ok: true };
  });

  ipcMain.handle("db:getCachedProducts", () => {
    const db = global.localDb.read();
    return db.cache?.products || [];
  });

  ipcMain.handle("db:setCachedProducts", (_event, products) => {
    const db = global.localDb.read();
    db.cache = db.cache || {};
    db.cache.products = Array.isArray(products) ? products : [];
    global.localDb.write(db);
    return { ok: true, count: db.cache.products.length };
  });

  ipcMain.handle("db:runSyncNow", async () => {
    return syncPendingSales();
  });

  ipcMain.handle("db:getSyncStatus", () => {
    const db = global.localDb.read();
    const pendingCount = (db.sales || []).filter((sale) => !sale.synced).length;
    return {
      pendingCount,
      isSyncing,
      lastSyncAt,
      lastSyncError,
    };
  });

  const syncIntervalMs = 30 * 1000;
  setInterval(() => {
    syncPendingSales();
  }, syncIntervalMs);

  createWindow();

  app.on("activate", function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", function () {
  if (process.platform !== "darwin") app.quit();
});
