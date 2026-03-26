import { app, BrowserWindow, Menu, Tray, nativeImage, protocol, net } from "electron";
import path from "node:path";
import fs from "node:fs";
import { pathToFileURL } from "node:url";
import type { TrayCommand } from "../shared/types";
import { IPC_CHANNELS } from "../shared/ipc";
import { registerIpcHandlers } from "./services/ipc";

protocol.registerSchemesAsPrivileged([
  {
    scheme: "shareme-file",
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      corsEnabled: true,
      stream: true
    }
  }
]);

const isDev = !app.isPackaged;
let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;

function getAppLogoPath(): string {
  const roundedIconPath = path.join(app.getAppPath(), "build", "icon.png");
  if (fs.existsSync(roundedIconPath)) {
    return roundedIconPath;
  }
  return path.join(app.getAppPath(), "logo.png");
}

function readWindowSizeEnv(name: "WINDOW_WIDTH" | "WINDOW_HEIGHT", fallback: number): number {
  const raw = process.env[name];
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function writeDebugLog(message: string): void {
  try {
    const logDir = app.getPath("logs");
    fs.mkdirSync(logDir, { recursive: true });
    const line = `[${new Date().toISOString()}] ${message}\n`;
    fs.appendFileSync(path.join(logDir, "shareme-desktop.log"), line, "utf8");
  } catch {
    // Ignore logging failures.
  }
}

function registerFileProtocol(): void {
  protocol.handle("shareme-file", (request) => {
    const url = new URL(request.url);
    const decodedPath = decodeURIComponent(url.pathname);
    const rawPath = url.hostname === "local" ? decodedPath : decodeURIComponent(`${url.hostname}${url.pathname}`);
    const resolvedPath = process.platform === "win32" && /^\/[A-Za-z]:/.test(rawPath) ? rawPath.slice(1) : rawPath;
    return net.fetch(pathToFileURL(resolvedPath).toString());
  });
}

function createWindow(): void {
  const width = readWindowSizeEnv("WINDOW_WIDTH", 1440);
  const height = readWindowSizeEnv("WINDOW_HEIGHT", 960);

  mainWindow = new BrowserWindow({
    width,
    height,
    minWidth: Math.min(width, 1180),
    minHeight: 860,
    titleBarStyle: "hiddenInset",
    backgroundColor: "#09111f",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      sandbox: false,
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  if (process.platform === "darwin" && app.dock) {
    const dockIconPath = getAppLogoPath();
    if (fs.existsSync(dockIconPath)) {
      app.dock.setIcon(dockIconPath);
    }
  }

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
      <rect x="10" y="10" width="44" height="44" rx="12" fill="black" />
      <rect x="20" y="20" width="24" height="24" rx="7" fill="white" opacity="0.001" />
      <path d="M24 40V24h8c4 0 8 3 8 8s-4 8-8 8h-8zm6-4h2c2 0 4-1 4-4s-2-4-4-4h-2v8z" fill="white" />
    </svg>
  `);
  const image = nativeImage.createFromDataURL(`data:image/svg+xml;charset=utf-8,${svg}`);
  image.setTemplateImage(true);
  return image;
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
  tray.setToolTip("Shareme");
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
  registerFileProtocol();
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
