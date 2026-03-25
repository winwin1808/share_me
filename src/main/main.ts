import { app, BrowserWindow, Menu, Tray, nativeImage } from "electron";
import path from "node:path";
import fs from "node:fs";
import type { TrayCommand } from "../shared/types";
import { IPC_CHANNELS } from "../shared/ipc";
import { registerIpcHandlers } from "./services/ipc";

const isDev = !app.isPackaged;
let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;

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
  mainWindow = new BrowserWindow({
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

  mainWindow.webContents.on("did-fail-load", (_event, errorCode, errorDescription, validatedURL, isMainFrame) => {
    writeDebugLog(
      `did-fail-load code=${errorCode} description=${errorDescription} url=${validatedURL} mainFrame=${String(isMainFrame)}`
    );
  });
  mainWindow.webContents.on("render-process-gone", (_event, details) => {
    writeDebugLog(`render-process-gone reason=${details.reason} exitCode=${details.exitCode}`);
  });
  mainWindow.webContents.on("console-message", (_event, level, message, line, sourceId) => {
    writeDebugLog(`console-message level=${level} source=${sourceId}:${line} message=${message}`);
  });
  mainWindow.webContents.on("did-finish-load", () => {
    writeDebugLog(`did-finish-load url=${mainWindow?.webContents.getURL()}`);
  });
  mainWindow.webContents.on("preload-error", (_event, preloadPath, error) => {
    writeDebugLog(`preload-error path=${preloadPath} error=${error.message}`);
  });
  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  if (isDev) {
    mainWindow.loadURL("http://127.0.0.1:5173");
    if (process.env.OPEN_DEVTOOLS === "1") {
      mainWindow.webContents.openDevTools({ mode: "detach" });
    }
  } else {
    mainWindow.loadFile(path.join(app.getAppPath(), "dist", "index.html"));
  }
}

function createTrayIcon() {
  const svg = encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#1677ff" />
          <stop offset="100%" stop-color="#7fb3ff" />
        </linearGradient>
      </defs>
      <rect x="6" y="6" width="52" height="52" rx="14" fill="url(#g)" />
      <rect x="18" y="18" width="28" height="28" rx="8" fill="white" opacity="0.9" />
      <path d="M24 40V24h8c4 0 8 3 8 8s-4 8-8 8h-8zm6-4h2c2 0 4-1 4-4s-2-4-4-4h-2v8z" fill="#1677ff" />
    </svg>
  `);
  return nativeImage.createFromDataURL(`data:image/svg+xml;charset=utf-8,${svg}`);
}

function ensureMainWindow(): BrowserWindow {
  if (mainWindow) {
    return mainWindow;
  }
  createWindow();
  if (!mainWindow) {
    throw new Error("Failed to create the main window.");
  }
  return mainWindow;
}

function focusMainWindow(): void {
  const window = ensureMainWindow();
  if (window.isMinimized()) {
    window.restore();
  }
  window.show();
  window.focus();
}

function sendTrayCommand(command: TrayCommand): void {
  for (const window of BrowserWindow.getAllWindows()) {
    window.webContents.send(IPC_CHANNELS.trayCommand, command);
  }
}

function createTray(): void {
  if (tray) {
    return;
  }

  tray = new Tray(createTrayIcon());
  tray.setToolTip("Cursorful Desktop MVP");
  tray.setContextMenu(
    Menu.buildFromTemplate([
      {
        label: "Record",
        click: () => {
          focusMainWindow();
          sendTrayCommand("record");
        }
      },
      {
        label: "Select Input",
        click: () => {
          focusMainWindow();
          sendTrayCommand("select-input");
        }
      },
      {
        label: "Open Editor",
        click: () => {
          focusMainWindow();
          sendTrayCommand("open-editor");
        }
      },
      {
        label: "Stop Recording",
        click: () => {
          focusMainWindow();
          sendTrayCommand("stop-recording");
        }
      },
      { type: "separator" },
      {
        label: "Quit",
        click: () => {
          app.quit();
        }
      }
    ])
  );
  tray.on("click", () => {
    focusMainWindow();
    sendTrayCommand("open-editor");
  });
}

app.whenReady().then(() => {
  writeDebugLog(`app-ready packaged=${String(app.isPackaged)} appPath=${app.getAppPath()}`);
  registerIpcHandlers();
  createWindow();
  createTray();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
      createTray();
    } else if (mainWindow) {
      focusMainWindow();
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
