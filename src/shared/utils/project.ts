import type { ExportPreset, ProjectFileV1 } from "../types";

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
    zoomSegments: project.zoomSegments ?? [],
    cursorPath: project.cursorPath ?? [],
    exportPresets: project.exportPresets?.length ? project.exportPresets : DEFAULT_EXPORT_PRESETS,
    background: project.background ?? { mode: "preset", preset: "slate" },
    includeBrowserFrame: project.includeBrowserFrame ?? false
  };
}

