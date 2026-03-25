import type { ExportPreset, ProjectFileV1, RecordingSession } from "../types";

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
    sourceType: value.sourceType === "browser-tab" || value.sourceType === "desktop-window" ? value.sourceType : "browser-window",
    sourceName: String(value.sourceName),
    startedAt: String(value.startedAt),
    endedAt: typeof value.endedAt === "string" ? value.endedAt : undefined,
    durationMs: Number(value.durationMs),
    fps: Number(value.fps),
    width: Number(value.width),
    height: Number(value.height),
    audioEnabled: Boolean(value.audioEnabled),
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
    recording: normalizeRecordingSession(value.recording),
    zoomSegments: Array.isArray(value.zoomSegments) ? (value.zoomSegments as ProjectFileV1["zoomSegments"]) : [],
    cursorPath: Array.isArray(value.cursorPath) ? (value.cursorPath as ProjectFileV1["cursorPath"]) : [],
    exportPresets: normalizeExportPresets(value.exportPresets),
    background: normalizeBackground(value.background),
    includeBrowserFrame: Boolean(value.includeBrowserFrame)
  });
}
