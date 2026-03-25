import type {
  CaptureSetup,
  ExportPreset,
  FrameAspectRatio,
  ProjectFileV1,
  RecordingSession,
  CaptureSourceType
} from "../types";

export const DEFAULT_EXPORT_PRESETS: ExportPreset[] = [
  {
    aspectRatio: "16:9",
    outputName: "cursorful-export-16x9.mp4",
    includeBrowserFrame: false,
    background: { mode: "preset", preset: "slate" }
  },
  {
    aspectRatio: "9:16",
    outputName: "cursorful-export-9x16.mp4",
    includeBrowserFrame: false,
    background: { mode: "preset", preset: "ocean" }
  },
  {
    aspectRatio: "1:1",
    outputName: "cursorful-export-1x1.mp4",
    includeBrowserFrame: false,
    background: { mode: "preset", preset: "sunset" }
  }
];

export function createProject(name = "Untitled Project"): ProjectFileV1 {
  const now = new Date().toISOString();
  return {
    version: 1,
    id: crypto.randomUUID(),
    name,
    createdAt: now,
    updatedAt: now,
    storagePath: undefined,
    captureSetup: {
      frameAspectRatio: "16:9"
    },
    zoomSegments: [],
    cursorPath: [],
    exportPresets: DEFAULT_EXPORT_PRESETS,
    background: { mode: "preset", preset: "slate" },
    includeBrowserFrame: false
  };
}

export function ensureProjectShape(project: ProjectFileV1): ProjectFileV1 {
  return {
    ...project,
    version: 1,
    storagePath: project.storagePath,
    captureSetup: normalizeCaptureSetup(project.captureSetup) ?? { frameAspectRatio: "16:9" },
    zoomSegments: project.zoomSegments ?? [],
    cursorPath: project.cursorPath ?? [],
    exportPresets: project.exportPresets?.length ? project.exportPresets : DEFAULT_EXPORT_PRESETS,
    background: project.background ?? { mode: "preset", preset: "slate" },
    includeBrowserFrame: project.includeBrowserFrame ?? false
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function normalizeCaptureSourceType(value: unknown): CaptureSourceType | undefined {
  if (value === "tab" || value === "window" || value === "screen") {
    return value;
  }
  if (value === "browser-tab") {
    return "tab";
  }
  if (value === "browser-window") {
    return "window";
  }
  if (value === "desktop-window") {
    return "screen";
  }
  return undefined;
}

function normalizeFrameAspectRatio(value: unknown): FrameAspectRatio {
  return value === "native" || value === "9:16" || value === "1:1" ? value : "16:9";
}

function normalizeCaptureSetup(value: unknown): CaptureSetup | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  if (!("frameAspectRatio" in value) && !("cropRegion" in value) && !("sourceId" in value) && !("sourceType" in value)) {
    return undefined;
  }

  const cropCandidate = value.cropRegion;
  const cropRegion =
    isRecord(cropCandidate) &&
    typeof cropCandidate.x === "number" &&
    typeof cropCandidate.y === "number" &&
    typeof cropCandidate.width === "number" &&
    typeof cropCandidate.height === "number"
      ? {
          x: cropCandidate.x,
          y: cropCandidate.y,
          width: cropCandidate.width,
          height: cropCandidate.height
        }
      : undefined;

  const captureSetup: CaptureSetup = {
    frameAspectRatio: normalizeFrameAspectRatio(value.frameAspectRatio)
  };
  if (typeof value.sourceId === "string" && value.sourceId) {
    captureSetup.sourceId = value.sourceId;
  }
  const sourceType = normalizeCaptureSourceType(value.sourceType);
  if (sourceType) {
    captureSetup.sourceType = sourceType;
  }
  if (typeof value.sourceName === "string" && value.sourceName) {
    captureSetup.sourceName = value.sourceName;
  }
  if (cropRegion) {
    captureSetup.cropRegion = cropRegion;
  }
  return captureSetup;
}

function normalizeRecordingSession(value: unknown): RecordingSession | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  const requiredKeys: Array<keyof RecordingSession> = [
    "id",
    "sourceId",
    "sourceType",
    "sourceName",
    "startedAt",
    "durationMs",
    "fps",
    "width",
    "height",
    "audioEnabled"
  ];
  if (!requiredKeys.every((key) => key in value)) {
    return undefined;
  }

  return {
    id: String(value.id),
    sourceId: String(value.sourceId),
    sourceType: normalizeCaptureSourceType(value.sourceType) ?? "window",
    sourceName: String(value.sourceName),
    startedAt: String(value.startedAt),
    endedAt: typeof value.endedAt === "string" ? value.endedAt : undefined,
    durationMs: Number(value.durationMs),
    fps: Number(value.fps),
    width: Number(value.width),
    height: Number(value.height),
    audioEnabled: Boolean(value.audioEnabled),
    captureSetup: normalizeCaptureSetup(value.captureSetup),
    sourceBounds:
      isRecord(value.sourceBounds) && typeof value.sourceBounds.width === "number" && typeof value.sourceBounds.height === "number"
        ? { width: value.sourceBounds.width, height: value.sourceBounds.height }
        : undefined,
    frameBounds:
      isRecord(value.frameBounds) && typeof value.frameBounds.width === "number" && typeof value.frameBounds.height === "number"
        ? { width: value.frameBounds.width, height: value.frameBounds.height }
        : undefined,
    permissionStatus:
      value.permissionStatus === "granted" ||
      value.permissionStatus === "denied" ||
      value.permissionStatus === "restricted"
        ? value.permissionStatus
        : "unknown",
    sourceStatus: value.sourceStatus === "available" || value.sourceStatus === "unavailable" ? value.sourceStatus : "unknown",
    videoPath: typeof value.videoPath === "string" && value.videoPath ? value.videoPath : undefined
  };
}

function normalizeExportPresets(value: unknown): ExportPreset[] {
  return Array.isArray(value) && value.length > 0 ? (value as ExportPreset[]) : DEFAULT_EXPORT_PRESETS;
}

function normalizeBackground(value: unknown): ProjectFileV1["background"] {
  if (!isRecord(value)) {
    return { mode: "preset", preset: "slate" };
  }

  const mode = value.mode === "custom" ? "custom" : "preset";
  const preset = value.preset === "ocean" || value.preset === "sunset" ? value.preset : "slate";
  if (mode === "custom") {
    return {
      mode,
      preset,
      customImagePath: typeof value.customImagePath === "string" && value.customImagePath ? value.customImagePath : undefined
    };
  }
  return { mode, preset };
}

export function normalizeProjectFile(value: unknown): ProjectFileV1 {
  if (!isRecord(value)) {
    throw new Error("Invalid project file: expected object.");
  }

  const now = new Date().toISOString();
  const id = typeof value.id === "string" && value.id ? value.id : crypto.randomUUID();
  const createdAt = typeof value.createdAt === "string" ? value.createdAt : now;
  const updatedAt = typeof value.updatedAt === "string" ? value.updatedAt : now;

  return ensureProjectShape({
    version: 1,
    id,
    name: typeof value.name === "string" && value.name ? value.name : "Untitled Project",
    createdAt,
    updatedAt,
    storagePath: typeof value.storagePath === "string" && value.storagePath ? value.storagePath : undefined,
    captureSetup: normalizeCaptureSetup(value.captureSetup),
    recording: normalizeRecordingSession(value.recording),
    zoomSegments: Array.isArray(value.zoomSegments) ? (value.zoomSegments as ProjectFileV1["zoomSegments"]) : [],
    cursorPath: Array.isArray(value.cursorPath) ? (value.cursorPath as ProjectFileV1["cursorPath"]) : [],
    exportPresets: normalizeExportPresets(value.exportPresets),
    background: normalizeBackground(value.background),
    includeBrowserFrame: Boolean(value.includeBrowserFrame)
  });
}
