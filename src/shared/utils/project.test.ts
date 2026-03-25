import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_EXPORT_PRESETS, createProject, ensureProjectShape, normalizeProjectFile } from "./project";
import type { ProjectFileV1 } from "../types";

beforeEach(() => {
  vi.stubGlobal("crypto", {
    randomUUID: vi.fn(() => "test-uuid")
  } as unknown as Crypto);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("project utils", () => {
  it("creates a new project with stable defaults", () => {
    const before = Date.now();
    const project = createProject();
    const after = Date.now();

    expect(project.version).toBe(1);
    expect(project.id).toBe("test-uuid");
    expect(project.name).toBe("Untitled Project");
    expect(project.storagePath).toBeUndefined();
    expect(new Date(project.createdAt).getTime()).toBeGreaterThanOrEqual(before);
    expect(new Date(project.updatedAt).getTime()).toBeLessThanOrEqual(after + 1000);
    expect(project.recording).toBeUndefined();
    expect(project.zoomSegments).toEqual([]);
    expect(project.cursorPath).toEqual([]);
    expect(project.exportPresets).toHaveLength(3);
    expect(project.exportPresets).toStrictEqual(DEFAULT_EXPORT_PRESETS);
    expect(project.background).toEqual({ mode: "preset", preset: "slate" });
    expect(project.includeBrowserFrame).toBe(false);
  });

  it("normalizes legacy project files without losing existing data", () => {
    const legacy = {
      version: 0,
      id: "legacy-id",
      name: "Legacy",
      createdAt: "2024-01-01T00:00:00.000Z",
      updatedAt: "2024-01-02T00:00:00.000Z"
    } as unknown as ProjectFileV1;

    const normalized = ensureProjectShape(legacy);

    expect(normalized.version).toBe(1);
    expect(normalized.id).toBe("legacy-id");
    expect(normalized.name).toBe("Legacy");
    expect(normalized.zoomSegments).toEqual([]);
    expect(normalized.cursorPath).toEqual([]);
    expect(normalized.exportPresets).toStrictEqual(DEFAULT_EXPORT_PRESETS);
    expect(normalized.background).toEqual({ mode: "preset", preset: "slate" });
    expect(normalized.includeBrowserFrame).toBe(false);
  });

  it("preserves explicit project fields", () => {
    const project = ensureProjectShape({
      version: 1,
      id: "project-id",
      name: "Custom",
      createdAt: "2024-01-01T00:00:00.000Z",
      updatedAt: "2024-01-02T00:00:00.000Z",
      storagePath: "/tmp/custom.cursorful.json",
      recording: undefined,
      zoomSegments: [],
      cursorPath: [],
      exportPresets: [DEFAULT_EXPORT_PRESETS[0]],
      background: { mode: "custom", preset: "ocean", customImagePath: "/tmp/bg.png" },
      includeBrowserFrame: true
    });

    expect(project.exportPresets).toHaveLength(1);
    expect(project.background).toEqual({ mode: "custom", preset: "ocean", customImagePath: "/tmp/bg.png" });
    expect(project.includeBrowserFrame).toBe(true);
    expect(project.storagePath).toBe("/tmp/custom.cursorful.json");
  });

  it("preserves recording references and cursor paths when reopening saved projects", () => {
    const savedProject = ensureProjectShape({
      version: 1,
      id: "saved-project",
      name: "Saved",
      createdAt: "2024-01-01T00:00:00.000Z",
      updatedAt: "2024-01-02T00:00:00.000Z",
      recording: {
        id: "recording-1",
        sourceId: "source-1",
        sourceType: "browser-window",
        sourceName: "Chrome",
        startedAt: "2024-01-01T00:00:00.000Z",
        endedAt: "2024-01-01T00:01:00.000Z",
        durationMs: 60000,
        fps: 30,
        width: 1280,
        height: 720,
        audioEnabled: false,
        videoPath: "/Users/test/Movies/recording.webm"
      },
      zoomSegments: [
        {
          id: "zoom-1",
          startMs: 1000,
          endMs: 2200,
          targetX: 0.25,
          targetY: 0.75,
          scale: 1.9,
          followCursor: false,
          easing: "easeOut"
        }
      ],
      cursorPath: [{ t: 1000, x: 0.25, y: 0.75 }],
      exportPresets: [DEFAULT_EXPORT_PRESETS[0], DEFAULT_EXPORT_PRESETS[1]],
      background: { mode: "custom", preset: "ocean", customImagePath: "/tmp/bg.png" },
      includeBrowserFrame: true
    });

    expect(savedProject.recording?.videoPath).toBe("/Users/test/Movies/recording.webm");
    expect(savedProject.cursorPath).toEqual([{ t: 1000, x: 0.25, y: 0.75 }]);
    expect(savedProject.zoomSegments).toHaveLength(1);
    expect(savedProject.exportPresets).toHaveLength(2);
    expect(savedProject.background).toEqual({ mode: "custom", preset: "ocean", customImagePath: "/tmp/bg.png" });
    expect(savedProject.includeBrowserFrame).toBe(true);
  });

  it("normalizes unknown project payloads into safe defaults", () => {
    const project = normalizeProjectFile({
      id: "",
      name: "",
      createdAt: 123,
      updatedAt: null,
      storagePath: "",
      zoomSegments: null,
      cursorPath: undefined,
      exportPresets: [],
      background: null,
      includeBrowserFrame: 1
    });

    expect(project.id).toBe("test-uuid");
    expect(project.name).toBe("Untitled Project");
    expect(project.storagePath).toBeUndefined();
    expect(project.zoomSegments).toEqual([]);
    expect(project.cursorPath).toEqual([]);
    expect(project.exportPresets).toStrictEqual(DEFAULT_EXPORT_PRESETS);
    expect(project.background).toEqual({ mode: "preset", preset: "slate" });
    expect(project.includeBrowserFrame).toBe(true);
  });
});
