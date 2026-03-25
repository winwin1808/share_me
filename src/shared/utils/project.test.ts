import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_EXPORT_PRESETS, createProject, ensureProjectShape } from "./project";
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
  });
});
