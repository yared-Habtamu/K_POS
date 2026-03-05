# POS Desktop (Electron)

This desktop app wraps the existing `web` app in Electron and adds local offline storage.

## 1) Prerequisites

- Node.js 18+ (recommended: Node 20 or 22)
- pnpm installed globally
- Backend MongoDB connection working (`backend` must start successfully)

## 2) First-time setup

From repository root:

```bash
cd web
pnpm install

cd ../desktop
pnpm install
```

## 3) Run in development mode (recommended while coding)

Start backend first:

```bash
cd backend
pnpm run dev
```

Then start desktop dev:

```bash
cd desktop
pnpm run dev
```

What `pnpm run dev` does:

- Starts Vite for `web` on `http://localhost:5173`
- Waits for that URL
- Launches Electron

If port `5173` is busy, stop the process using it and run again.

## 4) Build installer (.exe) for Windows

Step 1: Build frontend

```bash
cd web
pnpm build
```

Step 2: Package desktop app

```bash
cd ../desktop
pnpm run package
```

Output files are created in `desktop/dist`:

- `pos-desktop Setup 0.1.0.exe` (installer)
- `pos-desktop-0.1.0-win.zip` (zip package)
- `win-unpacked/` (portable unpacked app)

## 5) Install and run on your PC

1. Open `desktop/dist`
2. Run `pos-desktop Setup 0.1.0.exe`
3. Launch installed app from Start menu/desktop shortcut

## 6) Offline behavior (current implementation)

- Local file database path: Electron `app.getPath('userData')` → `pos-local.json`
- Sales can be queued locally
- Sync loop runs every ~30 seconds:
  - Pushes queued sales to `http://localhost:4000/api/sales` (or `POS_BACKEND_URL`)
  - Pulls product list from `http://localhost:4000/api/products` into local cache

Exposed preload APIs:

- `window.posApi.saveSale(sale)`
- `window.posApi.getQueuedSales()`
- `window.posApi.getCachedProducts()`

## 7) Common issues

### White page in installed app

Usually means old installer/build is being used.

Fix:

1. Rebuild `web`
2. Re-run desktop packaging
3. Reinstall using the latest `.exe`

```bash
pnpm --dir "C:\Users\hp\Desktop\POS\pos\web" build
pnpm --dir "C:\Users\hp\Desktop\POS\pos\desktop" run package
```

### 404 page in installed app

If you see `404 Oops! Page not found`, reinstall with the newest packaged build after the router fix.

### Packaging run from wrong folder

If you get `No package.json found`, run with explicit directory:

```bash
pnpm --dir "C:\Users\hp\Desktop\POS\pos\desktop" run package
```

### Login credentials (default admin)

If backend created default admin user:

- Username: `kiya123`
- Password: `abc123`

## 8) Current scripts (`desktop/package.json`)

- `pnpm run start` → run Electron app directly
- `pnpm run dev` → start web dev + Electron together
- `pnpm run package` → build Windows installer/zip
