import { EventEmitter } from "node:events";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { spawnMock, showSaveDialogMock, getPathMock, sendMock, mkdirMock } = vi.hoisted(() => ({
  spawnMock: vi.fn(),
  showSaveDialogMock: vi.fn(),
  getPathMock: vi.fn(),
  sendMock: vi.fn(),
  mkdirMock: vi.fn()
}));

class MockChildProcess extends EventEmitter {
  stdout = new EventEmitter();
  stderr = new EventEmitter();
  kill = vi.fn();
}

vi.mock("node:child_process", () => ({
  default: {
    spawn: spawnMock
  },
  spawn: spawnMock
}));

vi.mock("ffmpeg-static", () => ({
  default: "/usr/local/bin/ffmpeg"
}));

vi.mock("node:fs/promises", () => ({
  default: {
    mkdir: mkdirMock
  },
  mkdir: mkdirMock
}));

vi.mock("electron", () => ({
  BrowserWindow: {
    getAllWindows: () => [{ webContents: { send: sendMock } }]
  },
  app: {
    getPath: getPathMock,
    getVersion: () => "0.1.0"
  },
  dialog: {
    showSaveDialog: showSaveDialogMock
  },
  ipcMain: {
    handle: vi.fn()
  }
}));

import { FfmpegRenderAdapter } from "./export-service";

describe("FfmpegRenderAdapter", () => {
  beforeEach(() => {
    spawnMock.mockReset();
    showSaveDialogMock.mockReset();
    getPathMock.mockReset();
    sendMock.mockReset();
    mkdirMock.mockReset();
    getPathMock.mockReturnValue("/Users/test/Movies");
    mkdirMock.mockResolvedValue(undefined);
  });

  it("builds a 16:9 export job with padding filter", async () => {
    const child = new MockChildProcess();
    spawnMock.mockReturnValue(child);
    showSaveDialogMock.mockResolvedValue({ canceled: false, filePath: "/Users/test/Movies/output.mp4" });

    const adapter = new FfmpegRenderAdapter();
    const job = await adapter.start({
      project: {
        id: "project-1",
        version: 1,
        name: "Project",
        createdAt: "2024-01-01T00:00:00.000Z",
        updatedAt: "2024-01-01T00:00:00.000Z",
        zoomSegments: [
          {
            id: "zoom-1",
            startMs: 0,
            endMs: 1400,
            targetX: 0.25,
            targetY: 0.75,
            scale: 1.8,
            followCursor: false,
            easing: "easeInOut"
          }
        ],
        cursorPath: [],
        exportPresets: [],
        background: { mode: "preset", preset: "slate" },
        includeBrowserFrame: false,
        recording: { id: "rec-1", sourceId: "source-1", sourceType: "browser-window", sourceName: "Chrome", startedAt: "2024-01-01T00:00:00.000Z", durationMs: 1200, fps: 30, width: 1280, height: 720, audioEnabled: false, videoPath: "/Users/test/recording.webm" }
      },
      preset: {
        aspectRatio: "16:9",
        outputName: "cursorful-export-16x9.mp4",
        includeBrowserFrame: false,
        background: { mode: "preset", preset: "slate" }
      }
    });

    expect(job.status).toBe("running");
    expect(spawnMock).toHaveBeenCalledWith("/usr/local/bin/ffmpeg", expect.any(Array));
    const args = spawnMock.mock.calls[0][1];
    expect(args).toEqual(expect.arrayContaining(["-i", "/Users/test/recording.webm", "-vf", expect.any(String)]));
    const filter = args[args.indexOf("-vf") + 1];
    expect(filter).toContain("crop=iw:ih-43:0:43");
    expect(filter).toContain("if(between(t,0.000,1.400),1.800,1)");
    expect(filter).toContain("pad=1920:1080:(ow-iw)/2:(oh-ih)/2:0x111823");
    expect(args).toEqual(expect.arrayContaining(["-c:v", "libx264", "-pix_fmt", "yuv420p", "/Users/test/Movies/output.mp4"]));

    child.stdout.emit("data", Buffer.from("out_time_ms=600000\nprogress=continue\n"));
    expect(sendMock).toHaveBeenCalledWith("export:progress", expect.objectContaining({ status: "running" }));

    child.emit("close", 0);
    expect(sendMock).toHaveBeenCalledWith("export:progress", expect.objectContaining({ status: "completed", progress: 1 }));
    expect(job.outputPath).toBe("/Users/test/Movies/output.mp4");
  });

  it("cancels an active export job", async () => {
    const child = new MockChildProcess();
    spawnMock.mockReturnValue(child);
    showSaveDialogMock.mockResolvedValue({ canceled: false, filePath: "/Users/test/Movies/output.mp4" });

    const adapter = new FfmpegRenderAdapter();
    const job = await adapter.start({
      project: {
        id: "project-1",
        version: 1,
        name: "Project",
        createdAt: "2024-01-01T00:00:00.000Z",
        updatedAt: "2024-01-01T00:00:00.000Z",
        zoomSegments: [],
        cursorPath: [],
        exportPresets: [],
        background: { mode: "preset", preset: "slate" },
        includeBrowserFrame: false,
        recording: { id: "rec-1", sourceId: "source-1", sourceType: "browser-window", sourceName: "Chrome", startedAt: "2024-01-01T00:00:00.000Z", durationMs: 1200, fps: 30, width: 1280, height: 720, audioEnabled: false, videoPath: "/Users/test/recording.webm" }
      },
      preset: {
        aspectRatio: "9:16",
        outputName: "cursorful-export-9x16.mp4",
        includeBrowserFrame: false,
        background: { mode: "preset", preset: "ocean" }
      }
    });

    const cancelled = await adapter.cancel(job.id);
    expect(cancelled).toBe(true);
    expect(sendMock).toHaveBeenCalledWith("export:progress", expect.objectContaining({ status: "cancelled" }));
    expect(child.kill).toHaveBeenCalledWith("SIGTERM");
  });

  it("returns cancelled when the save dialog is dismissed", async () => {
    showSaveDialogMock.mockResolvedValue({ canceled: true, filePath: undefined });

    const adapter = new FfmpegRenderAdapter();
    const job = await adapter.start({
      project: {
        id: "project-1",
        version: 1,
        name: "Project",
        createdAt: "2024-01-01T00:00:00.000Z",
        updatedAt: "2024-01-01T00:00:00.000Z",
        zoomSegments: [],
        cursorPath: [],
        exportPresets: [],
        background: { mode: "preset", preset: "slate" },
        includeBrowserFrame: false,
        recording: { id: "rec-1", sourceId: "source-1", sourceType: "browser-window", sourceName: "Chrome", startedAt: "2024-01-01T00:00:00.000Z", durationMs: 1200, fps: 30, width: 1280, height: 720, audioEnabled: false, videoPath: "/Users/test/recording.webm" }
      },
      preset: {
        aspectRatio: "1:1",
        outputName: "cursorful-export-1x1.mp4",
        includeBrowserFrame: false,
        background: { mode: "preset", preset: "sunset" }
      }
    });

    expect(job.status).toBe("cancelled");
    expect(spawnMock).not.toHaveBeenCalled();
  });

  it("throws a clear error when no source recording is available", async () => {
    const adapter = new FfmpegRenderAdapter();

    await expect(
      adapter.start({
        project: {
          id: "project-1",
          version: 1,
          name: "Project",
          createdAt: "2024-01-01T00:00:00.000Z",
          updatedAt: "2024-01-01T00:00:00.000Z",
          zoomSegments: [],
          cursorPath: [],
          exportPresets: [],
          background: { mode: "preset", preset: "slate" },
          includeBrowserFrame: false
        },
        preset: {
          aspectRatio: "16:9",
          outputName: "cursorful-export-16x9.mp4",
          includeBrowserFrame: false,
          background: { mode: "preset", preset: "slate" }
        }
      })
    ).rejects.toMatchObject({
      name: "ExportValidationError",
      code: "NO_SOURCE_RECORDING",
      message: "No source recording is available for export."
    });
    expect(spawnMock).not.toHaveBeenCalled();
  });

  it("prefers an explicit sourceVideoPath override", async () => {
    const child = new MockChildProcess();
    spawnMock.mockReturnValue(child);
    showSaveDialogMock.mockResolvedValue({ canceled: false, filePath: "/Users/test/Movies/output.mp4" });

    const adapter = new FfmpegRenderAdapter();
    await adapter.start({
      sourceVideoPath: "/Users/test/override.webm",
      project: {
        id: "project-1",
        version: 1,
        name: "Project",
        createdAt: "2024-01-01T00:00:00.000Z",
        updatedAt: "2024-01-01T00:00:00.000Z",
        zoomSegments: [],
        cursorPath: [],
        exportPresets: [],
        background: { mode: "preset", preset: "slate" },
        includeBrowserFrame: false,
        recording: {
          id: "rec-1",
          sourceId: "source-1",
          sourceType: "browser-window",
          sourceName: "Chrome",
          startedAt: "2024-01-01T00:00:00.000Z",
          durationMs: 1200,
          fps: 30,
          width: 1280,
          height: 720,
          audioEnabled: false,
          videoPath: "/Users/test/recording.webm"
        }
      },
      preset: {
        aspectRatio: "1:1",
        outputName: "cursorful-export-1x1.mp4",
        includeBrowserFrame: false,
        background: { mode: "preset", preset: "sunset" }
      }
    });

    expect(spawnMock).toHaveBeenCalledWith(
      "/usr/local/bin/ffmpeg",
      expect.arrayContaining(["-i", "/Users/test/override.webm"])
    );
  });

  it("uses filter_complex when a custom background image is provided", async () => {
    const child = new MockChildProcess();
    spawnMock.mockReturnValue(child);
    showSaveDialogMock.mockResolvedValue({ canceled: false, filePath: "/Users/test/Movies/output.mp4" });

    const adapter = new FfmpegRenderAdapter();
    await adapter.start({
      project: {
        id: "project-1",
        version: 1,
        name: "Project",
        createdAt: "2024-01-01T00:00:00.000Z",
        updatedAt: "2024-01-01T00:00:00.000Z",
        zoomSegments: [],
        cursorPath: [],
        exportPresets: [],
        background: { mode: "custom", preset: "ocean", customImagePath: "/Users/test/bg.png" },
        includeBrowserFrame: false,
        recording: {
          id: "rec-1",
          sourceId: "source-1",
          sourceType: "browser-window",
          sourceName: "Chrome",
          startedAt: "2024-01-01T00:00:00.000Z",
          durationMs: 1200,
          fps: 30,
          width: 1280,
          height: 720,
          audioEnabled: false,
          videoPath: "/Users/test/recording.webm"
        }
      },
      preset: {
        aspectRatio: "16:9",
        outputName: "cursorful-export-16x9.mp4",
        includeBrowserFrame: false,
        background: { mode: "custom", preset: "ocean", customImagePath: "/Users/test/bg.png" }
      }
    });

    const args = spawnMock.mock.calls[0][1];
    expect(args).toEqual(expect.arrayContaining(["-loop", "1", "-i", "/Users/test/bg.png", "-filter_complex", expect.any(String)]));
    const filterComplex = args[args.indexOf("-filter_complex") + 1];
    expect(filterComplex).toContain("[1:v]scale=1920:1080[bg]");
    expect(filterComplex).toContain("[bg][fg]overlay=(W-w)/2:(H-h)/2:shortest=1");
  });
});
