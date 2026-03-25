import type { CaptureSource, ExportJob, ExportRequest, ProjectFileV1, SavedRecordingPayload, SystemInfo } from "./types";

export const IPC_CHANNELS = {
  captureListSources: "capture:listSources",
  projectCreate: "project:create",
  projectOpen: "project:open",
  projectSave: "project:save",
  exportStart: "export:start",
  exportCancel: "export:cancel",
  exportProgress: "export:progress",
  appPickFile: "app:pickFile",
  appGetSystemInfo: "app:getSystemInfo",
  recordingSave: "recording:save"
} as const;

export interface DesktopApi {
  capture: {
    listSources: () => Promise<CaptureSource[]>;
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
  };
  recording: {
    save: (payload: SavedRecordingPayload) => Promise<ProjectFileV1["recording"]>;
  };
}

