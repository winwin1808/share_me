import { app, dialog, ipcMain } from "electron";
import path from "node:path";
import fs from "node:fs/promises";
import { IPC_CHANNELS } from "../../shared/ipc";
import type { ExportRequest, ProjectFileV1, RecordingSession, SavedRecordingPayload, SystemInfo } from "../../shared/types";
import { ElectronDesktopCaptureAdapter } from "./capture-service";
import { EnvironmentCodeSignConfigProvider } from "./code-sign-config";
import { FfmpegRenderAdapter } from "./export-service";
import { createProject, ensureProjectShape } from "../../shared/utils/project";

const captureAdapter = new ElectronDesktopCaptureAdapter();
const renderAdapter = new FfmpegRenderAdapter();
const codeSignConfig = new EnvironmentCodeSignConfigProvider();

function projectsDir(): string {
  return path.join(app.getPath("documents"), "CursorfulDesktopMvp", "projects");
}

function recordingsDir(): string {
  return path.join(app.getPath("videos"), "CursorfulDesktopMvp");
}

async function saveProjectFile(project: ProjectFileV1): Promise<ProjectFileV1> {
  const normalized = ensureProjectShape({ ...project, updatedAt: new Date().toISOString() });
  await fs.mkdir(projectsDir(), { recursive: true });
  const filePath = path.join(projectsDir(), `${normalized.id}.cursorful.json`);
  await fs.writeFile(filePath, JSON.stringify(normalized, null, 2), "utf8");
  return normalized;
}

async function saveRecording(payload: SavedRecordingPayload): Promise<RecordingSession> {
  await fs.mkdir(recordingsDir(), { recursive: true });
  const outputPath = path.join(recordingsDir(), `${payload.session.id}.webm`);
  await fs.writeFile(outputPath, Buffer.from(payload.data));
  return { ...payload.session, videoPath: outputPath };
}

export function registerIpcHandlers(): void {
  ipcMain.handle(IPC_CHANNELS.captureListSources, () => captureAdapter.listSources());
  ipcMain.handle(IPC_CHANNELS.projectCreate, (_event, name?: string) => createProject(name));
  ipcMain.handle(IPC_CHANNELS.projectOpen, async () => {
    const result = await dialog.showOpenDialog({
      title: "Open project",
      defaultPath: projectsDir(),
      properties: ["openFile"],
      filters: [{ name: "Cursorful Projects", extensions: ["json"] }]
    });
    if (result.canceled || result.filePaths.length === 0) {
      return null;
    }
    const data = await fs.readFile(result.filePaths[0], "utf8");
    return ensureProjectShape(JSON.parse(data));
  });
  ipcMain.handle(IPC_CHANNELS.projectSave, (_event, project: ProjectFileV1) => saveProjectFile(project));
  ipcMain.handle(IPC_CHANNELS.exportStart, (_event, request: ExportRequest) => renderAdapter.start(request));
  ipcMain.handle(IPC_CHANNELS.exportCancel, (_event, jobId: string) => renderAdapter.cancel(jobId));
  ipcMain.handle(IPC_CHANNELS.appPickFile, async (_event, extensions?: string[]) => {
    const result = await dialog.showOpenDialog({
      properties: ["openFile"],
      filters: [{ name: "Files", extensions: extensions && extensions.length > 0 ? extensions : ["*"] }]
    });
    return result.canceled ? null : result.filePaths[0];
  });
  ipcMain.handle(IPC_CHANNELS.appGetSystemInfo, async (): Promise<SystemInfo> => ({
    platform: process.platform,
    arch: process.arch,
    appVersion: app.getVersion(),
    electronVersion: process.versions.electron,
    ffmpegAvailable: true,
    signingConfigured: codeSignConfig.isSigningConfigured()
  }));
  ipcMain.handle(IPC_CHANNELS.recordingSave, async (_event, payload: SavedRecordingPayload) => saveRecording(payload));
}
