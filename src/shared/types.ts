export type CaptureSourceType = "tab" | "window" | "screen";
export type FrameAspectRatio = "native" | "16:9" | "9:16" | "1:1";
export type ExportAspectRatio = Exclude<FrameAspectRatio, "native">;
export type ZoomEasing = "easeInOut" | "easeOut" | "linear";
export type ExportJobStatus = "idle" | "running" | "completed" | "failed" | "cancelled";
export type CapturePermissionStatus = "unknown" | "granted" | "denied" | "restricted";
export type CaptureSourceStatus = "unknown" | "available" | "unavailable";
export type TrayCommand = "record" | "select-input" | "open-editor" | "stop-recording" | "quit";

export interface CaptureBounds {
  width: number;
  height: number;
}

export interface CaptureCropRegion {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface CaptureSetup {
  sourceId?: string;
  sourceType?: CaptureSourceType;
  sourceName?: string;
  frameAspectRatio: FrameAspectRatio;
  cropRegion?: CaptureCropRegion;
}

export interface CaptureSource {
  id: string;
  name: string;
  thumbnailDataUrl?: string;
  sourceType: CaptureSourceType;
  displayId?: string;
  width?: number;
  height?: number;
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
  captureSetup?: CaptureSetup;
  sourceBounds?: CaptureBounds;
  frameBounds?: CaptureBounds;
  permissionStatus?: CapturePermissionStatus;
  sourceStatus?: CaptureSourceStatus;
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
  captureSetup?: CaptureSetup;
  recording?: RecordingSession;
  zoomSegments: ZoomSegment[];
  cursorPath: CursorPoint[];
  exportPresets: ExportPreset[];
  background: BackgroundConfig;
  includeBrowserFrame: boolean;
}

export interface TimelineEventViewModel {
  id: string;
  label: string;
  startMs: number;
  endMs: number;
  kind: "zoom" | "marker" | "recording";
  selected?: boolean;
  active?: boolean;
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
