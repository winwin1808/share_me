import { app, BrowserWindow } from "electron";
import path from "node:path";
import fs from "node:fs";
import { registerIpcHandlers } from "./services/ipc";

const isDev = !app.isPackaged;

function writeDebugLog(message: string): void {
  try {
    const logDir = app.getPath("logs");
    fs.mkdirSync(logDir, { recursive: true });
    const line = `[${new Date().toISOString()}] ${message}\n`;
    fs.appendFileSync(path.join(logDir, "cursorful-desktop.log"), line, "utf8");
  } catch {
    // Ignore logging failures.
  }
}

function createWindow(): void {
  const window = new BrowserWindow({
    width: 1440,
    height: 960,
    minWidth: 1180,
    minHeight: 780,
    titleBarStyle: "hiddenInset",
    backgroundColor: "#09111f",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      sandbox: false,
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  window.webContents.on("did-fail-load", (_event, errorCode, errorDescription, validatedURL, isMainFrame) => {
    writeDebugLog(
      `did-fail-load code=${errorCode} description=${errorDescription} url=${validatedURL} mainFrame=${String(isMainFrame)}`
    );
  });
  window.webContents.on("render-process-gone", (_event, details) => {
    writeDebugLog(`render-process-gone reason=${details.reason} exitCode=${details.exitCode}`);
  });
  window.webContents.on("console-message", (_event, level, message, line, sourceId) => {
    writeDebugLog(`console-message level=${level} source=${sourceId}:${line} message=${message}`);
  });
  window.webContents.on("did-finish-load", () => {
    writeDebugLog(`did-finish-load url=${window.webContents.getURL()}`);
  });
  window.webContents.on("preload-error", (_event, preloadPath, error) => {
    writeDebugLog(`preload-error path=${preloadPath} error=${error.message}`);
  });

  if (isDev) {
    window.loadURL("http://127.0.0.1:5173");
    if (process.env.OPEN_DEVTOOLS === "1") {
      window.webContents.openDevTools({ mode: "detach" });
    }
  } else {
    window.loadFile(path.join(app.getAppPath(), "dist", "index.html"));
  }
}

app.whenReady().then(() => {
  writeDebugLog(`app-ready packaged=${String(app.isPackaged)} appPath=${app.getAppPath()}`);
  registerIpcHandlers();
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  writeDebugLog("window-all-closed");
  if (process.platform !== "darwin") {
    app.quit();
  }
});

process.on("uncaughtException", (error) => {
  writeDebugLog(`uncaught-exception ${error.stack ?? error.message}`);
});

process.on("unhandledRejection", (reason) => {
  writeDebugLog(`unhandled-rejection ${String(reason)}`);
});
