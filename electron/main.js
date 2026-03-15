const {
  app,
  BrowserWindow,
  ipcMain,
  desktopCapturer,
  session,
  globalShortcut,
} = require("electron");
const path = require("path");
const fs = require("fs");

const snapshotDir = path.join(app.getPath("temp"), "screen-assist-snapshots");
const isDev = !app.isPackaged;

function createMainWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    title: "Screen Assist",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  win.setContentProtection(true);

  const devServerUrl =
    process.env.VITE_DEV_SERVER_URL || "http://127.0.0.1:5173";

  if (isDev) {
    win.loadURL(devServerUrl);
    win.webContents.openDevTools({ mode: "detach" });
  } else {
    win.loadFile(path.join(__dirname, "../dist/index.html"));
  }
}

app.whenReady().then(() => {
  ipcMain.handle("list-sources", async () => {
    const sources = await desktopCapturer.getSources({
      types: ["screen", "window"],
      thumbnailSize: { width: 320, height: 200 },
      fetchWindowIcons: true,
    });
    return sources.map((s) => ({
      id: s.id,
      name: s.name,
      thumbnail: s.thumbnail.toDataURL(),
    }));
  });

  // Hide the main window during capture without transferring OS focus to another window.
  // win.minimize() hands focus to the next window in Z-order (usually the captured source),
  // so instead we make it invisible and pass mouse events through while keeping it foreground.
  ipcMain.handle("minimize-window", () => {
    const win =
      BrowserWindow.getFocusedWindow() || BrowserWindow.getAllWindows()[0];
    if (win) {
      win.setOpacity(0);
      win.setIgnoreMouseEvents(true, { forward: true });
    }
  });

  ipcMain.handle("restore-window", () => {
    const win = BrowserWindow.getAllWindows()[0];
    if (win) {
      win.setIgnoreMouseEvents(false);
      win.setOpacity(1);
      win.focus();
    }
  });

  // Auto-resolve getDisplayMedia() requests with the primary screen
  // so the renderer's system-picker flow works without a native dialog
  session.defaultSession.setDisplayMediaRequestHandler(
    async (_request, callback) => {
      const sources = await desktopCapturer.getSources({ types: ["screen"] });
      callback({ video: sources[0] || null });
    },
  );

  // Snapshot file management — save/read/delete PNG files in a temp folder
  ipcMain.handle("save-snapshot", (_event, dataUrl) => {
    if (!fs.existsSync(snapshotDir)) fs.mkdirSync(snapshotDir, { recursive: true });
    const filePath = path.join(snapshotDir, `snapshot-${Date.now()}.png`);
    const base64 = dataUrl.replace(/^data:image\/png;base64,/, "");
    fs.writeFileSync(filePath, base64, "base64");
    return filePath;
  });

  ipcMain.handle("read-snapshot", (_event, filePath) => {
    if (!filePath || !fs.existsSync(filePath)) return null;
    const resolved = path.resolve(filePath);
    if (!resolved.startsWith(snapshotDir)) return null;
    const buf = fs.readFileSync(resolved);
    return `data:image/png;base64,${buf.toString("base64")}`;
  });

  ipcMain.handle("delete-snapshot", (_event, filePath) => {
    if (!filePath) return;
    const resolved = path.resolve(filePath);
    if (!resolved.startsWith(snapshotDir)) return;
    if (fs.existsSync(resolved)) fs.unlinkSync(resolved);
  });

  createMainWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

app.on("will-quit", () => {
  globalShortcut.unregisterAll();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
