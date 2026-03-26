import type { CaptureSource, ExportJob, ExportRequest, GlobalCursorState, ProjectFileV1, SavedRecordingPayload, SystemInfo, TrayCommand } from "./types";

export const IPC_CHANNELS = {
  captureListSources: "capture:listSources",
  captureGetCursorState: "capture:getCursorState",
  projectCreate: "project:create",
  projectOpen: "project:open",
  projectSave: "project:save",
  exportStart: "export:start",
  exportCancel: "export:cancel",
  exportProgress: "export:progress",
  appPickFile: "app:pickFile",
  appGetSystemInfo: "app:getSystemInfo",
  recordingSave: "recording:save",
  trayCommand: "tray:command"
} as const;

export interface DesktopApi {
  capture: {
    listSources: () => Promise<CaptureSource[]>;
    getCursorState: () => Promise<GlobalCursorState | null>;
  };
  project: {
    create: (name?: string) => Promise<ProjectFileV1>;
    open: () => Promise<ProjectFileV1 | null>;
    save: (project: ProjectFileV1) => Promise<ProjectFileV1>;
  };
  exportVideo: {
    start: (request: ExportRequest) => Promise<ExportJob>;
    cancel: (jobId: string) => Promise<boolean>;
    onProgress: (callback: (job: ExportJob) => void) => () => void;
  };
  app: {
    pickFile: (extensions?: string[]) => Promise<string | null>;
    getSystemInfo: () => Promise<SystemInfo>;
    onTrayCommand: (callback: (command: TrayCommand) => void) => () => void;
  };
  recording: {
    save: (payload: SavedRecordingPayload) => Promise<ProjectFileV1["recording"]>;
  };
}
