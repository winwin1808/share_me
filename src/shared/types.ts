export type CaptureSourceType = "browser-tab" | "browser-window" | "desktop-window";
export type ExportAspectRatio = "16:9" | "9:16" | "1:1";
export type ZoomEasing = "easeInOut" | "easeOut" | "linear";
export type ExportJobStatus = "idle" | "running" | "completed" | "failed" | "cancelled";

export interface CaptureSource {
  id: string;
  name: string;
  thumbnailDataUrl?: string;
  sourceType: CaptureSourceType;
  displayId?: string;
}

export interface RecordingSession {
  id: string;
  sourceId: string;
  sourceType: CaptureSourceType;
  sourceName: string;
  startedAt: string;
  endedAt?: string;
  durationMs: number;
  fps: number;
  width: number;
  height: number;
  audioEnabled: boolean;
  videoPath?: string;
}

export interface ZoomSegment {
  id: string;
  startMs: number;
  endMs: number;
  targetX: number;
  targetY: number;
  scale: number;
  followCursor: boolean;
  easing: ZoomEasing;
}

export interface CursorPoint {
  t: number;
  x: number;
  y: number;
}

export interface BackgroundConfig {
  mode: "preset" | "custom";
  preset: "slate" | "ocean" | "sunset";
  customImagePath?: string;
}

export interface ExportPreset {
  aspectRatio: ExportAspectRatio;
  outputName: string;
  includeBrowserFrame: boolean;
  background: BackgroundConfig;
}

export interface ExportJob {
  id: string;
  projectId: string;
  preset: ExportPreset;
  outputPath: string;
  status: ExportJobStatus;
  error?: string;
  progress: number;
}

export interface ProjectFileV1 {
  version: 1;
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  storagePath?: string;
  recording?: RecordingSession;
  zoomSegments: ZoomSegment[];
  cursorPath: CursorPoint[];
  exportPresets: ExportPreset[];
  background: BackgroundConfig;
  includeBrowserFrame: boolean;
}

export interface SystemInfo {
  platform: NodeJS.Platform;
  arch: string;
  appVersion: string;
  electronVersion: string;
  ffmpegAvailable: boolean;
  signingConfigured: boolean;
  projectsRootDir: string;
  recordingsRootDir: string;
}

export interface ExportRequest {
  project: ProjectFileV1;
  preset: ExportPreset;
  sourceVideoPath?: string;
}

export interface SavedRecordingPayload {
  data: ArrayBuffer;
  session: RecordingSession;
}
