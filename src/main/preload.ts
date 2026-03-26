import { contextBridge, ipcRenderer } from "electron";
import type { DesktopApi } from "../shared/ipc";
import { IPC_CHANNELS } from "../shared/ipc";
import type { ExportJob, ExportRequest, ProjectFileV1, SavedRecordingPayload, TrayCommand } from "../shared/types";

const api: DesktopApi = {
  capture: {
    listSources: () => ipcRenderer.invoke(IPC_CHANNELS.captureListSources),
    getCursorState: () => ipcRenderer.invoke(IPC_CHANNELS.captureGetCursorState)
  },
  project: {
    create: (name?: string) => ipcRenderer.invoke(IPC_CHANNELS.projectCreate, name),
    open: () => ipcRenderer.invoke(IPC_CHANNELS.projectOpen),
    save: (project: ProjectFileV1) => ipcRenderer.invoke(IPC_CHANNELS.projectSave, project)
  },
  exportVideo: {
    start: (request: ExportRequest) => ipcRenderer.invoke(IPC_CHANNELS.exportStart, request),
    cancel: (jobId: string) => ipcRenderer.invoke(IPC_CHANNELS.exportCancel, jobId),
    onProgress: (callback: (job: ExportJob) => void) => {
      const listener = (_event: Electron.IpcRendererEvent, job: ExportJob) => callback(job);
      ipcRenderer.on(IPC_CHANNELS.exportProgress, listener);
      return () => ipcRenderer.removeListener(IPC_CHANNELS.exportProgress, listener);
    }
  },
  app: {
    pickFile: (extensions?: string[]) => ipcRenderer.invoke(IPC_CHANNELS.appPickFile, extensions),
    getSystemInfo: () => ipcRenderer.invoke(IPC_CHANNELS.appGetSystemInfo),
    onTrayCommand: (callback: (command: TrayCommand) => void) => {
      const listener = (_event: Electron.IpcRendererEvent, command: TrayCommand) => callback(command);
      ipcRenderer.on(IPC_CHANNELS.trayCommand, listener);
      return () => ipcRenderer.removeListener(IPC_CHANNELS.trayCommand, listener);
    }
  },
  recording: {
    save: (payload: SavedRecordingPayload) => ipcRenderer.invoke(IPC_CHANNELS.recordingSave, payload)
  }
};

contextBridge.exposeInMainWorld("desktopApi", api);
