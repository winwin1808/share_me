import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ProjectFileV1 } from "../../shared/types";

const { readFileMock, writeFileMock, mkdirMock, getPathMock } = vi.hoisted(() => ({
  readFileMock: vi.fn(),
  writeFileMock: vi.fn(),
  mkdirMock: vi.fn(),
  getPathMock: vi.fn()
}));

vi.mock("node:fs/promises", () => ({
  default: {
    readFile: readFileMock,
    writeFile: writeFileMock,
    mkdir: mkdirMock
  },
  readFile: readFileMock,
  writeFile: writeFileMock,
  mkdir: mkdirMock
}));

vi.mock("electron", () => ({
  app: {
    getPath: getPathMock
  }
}));

import { defaultProjectFilePath, loadProject, resolveProjectFilePath, saveProject } from "./project-storage";

describe("project storage", () => {
  beforeEach(() => {
    readFileMock.mockReset();
    writeFileMock.mockReset();
    mkdirMock.mockReset();
    getPathMock.mockReset();
    getPathMock.mockReturnValue("/Users/test/Documents");
    vi.stubGlobal("crypto", {
      randomUUID: vi.fn(() => "test-uuid")
    } as unknown as Crypto);
  });

  it("builds default project paths under the documents workspace root", () => {
    expect(defaultProjectFilePath("project-1")).toBe(
      "/Users/test/Documents/CursorfulDesktopMvp/projects/project-1.cursorful.json"
    );
  });

  it("prefers the existing storage path when present", () => {
    expect(
      resolveProjectFilePath({
        version: 1,
        id: "project-1",
        name: "Project",
        createdAt: "2024-01-01T00:00:00.000Z",
        updatedAt: "2024-01-01T00:00:00.000Z",
        captureSetup: { frameAspectRatio: "16:9" },
        storagePath: "/tmp/project.cursorful.json",
        zoomSegments: [],
        cursorPath: [],
        exportPresets: [],
        background: { mode: "preset", preset: "slate" },
        includeBrowserFrame: false
      })
    ).toBe("/tmp/project.cursorful.json");
  });

  it("saves projects back to the chosen path and stamps the storage path", async () => {
    const project: ProjectFileV1 = {
      version: 1,
      id: "project-1",
      name: "Project",
      createdAt: "2024-01-01T00:00:00.000Z",
      updatedAt: "2024-01-01T00:00:00.000Z",
      captureSetup: { frameAspectRatio: "16:9" },
      zoomSegments: [],
      cursorPath: [],
      exportPresets: [],
      background: { mode: "preset", preset: "slate" },
      includeBrowserFrame: false
    };

    const saved = await saveProject(project);

    expect(mkdirMock).toHaveBeenCalledWith(
      "/Users/test/Documents/CursorfulDesktopMvp/projects",
      expect.objectContaining({ recursive: true })
    );
    expect(writeFileMock).toHaveBeenCalledWith(
      "/Users/test/Documents/CursorfulDesktopMvp/projects/project-1.cursorful.json",
      expect.stringContaining('"storagePath": "/Users/test/Documents/CursorfulDesktopMvp/projects/project-1.cursorful.json"'),
      "utf8"
    );
    expect(saved.storagePath).toBe("/Users/test/Documents/CursorfulDesktopMvp/projects/project-1.cursorful.json");
  });

  it("loads and normalizes project files from disk", async () => {
    readFileMock.mockResolvedValue(
      JSON.stringify({
        id: "project-1",
        name: "Project",
        createdAt: "2024-01-01T00:00:00.000Z",
        updatedAt: "2024-01-02T00:00:00.000Z",
        captureSetup: { frameAspectRatio: "9:16", cropRegion: { x: 0.1, y: 0.2, width: 0.7, height: 0.6 } },
        zoomSegments: [],
        cursorPath: [],
        exportPresets: [],
        background: { mode: "preset", preset: "slate" },
        includeBrowserFrame: false
      })
    );

    const project = await loadProject("/tmp/project.cursorful.json");

    expect(readFileMock).toHaveBeenCalledWith("/tmp/project.cursorful.json", "utf8");
    expect(project.storagePath).toBe("/tmp/project.cursorful.json");
    expect(project.id).toBe("project-1");
    expect(project.captureSetup).toEqual({ frameAspectRatio: "9:16", cropRegion: { x: 0.1, y: 0.2, width: 0.7, height: 0.6 } });
  });

  it("rejects invalid project JSON with a helpful message", async () => {
    readFileMock.mockResolvedValue("{not json");

    await expect(loadProject("/tmp/broken.cursorful.json")).rejects.toThrow(
      "Invalid project file /tmp/broken.cursorful.json:"
    );
  });
});
