import { EventEmitter } from "node:events";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { spawnMock, showSaveDialogMock, getPathMock, sendMock, mkdirMock, existsSyncMock } = vi.hoisted(() => ({
  spawnMock: vi.fn(),
  showSaveDialogMock: vi.fn(),
  getPathMock: vi.fn(),
  sendMock: vi.fn(),
  mkdirMock: vi.fn(),
  existsSyncMock: vi.fn()
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
  default: "/Applications/Shareme.app/Contents/Resources/app.asar/node_modules/ffmpeg-static/ffmpeg"
}));

vi.mock("node:fs/promises", () => ({
  default: {
    mkdir: mkdirMock
  },
  mkdir: mkdirMock
}));

vi.mock("node:fs", () => ({
  default: {
    existsSync: existsSyncMock
  },
  existsSync: existsSyncMock
}));

vi.mock("electron", () => ({
  BrowserWindow: {
    getAllWindows: () => [{ webContents: { send: sendMock } }]
  },
  app: {
    getPath: getPathMock,
    getVersion: () => "0.1.0",
    isPackaged: false
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
    existsSyncMock.mockReset();
    getPathMock.mockReturnValue("/Users/test/Movies");
    mkdirMock.mockResolvedValue(undefined);
    existsSyncMock.mockReturnValue(false);
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
        recording: { id: "rec-1", sourceId: "source-1", sourceType: "window", sourceName: "Chrome", startedAt: "2024-01-01T00:00:00.000Z", durationMs: 1200, fps: 30, width: 1280, height: 720, audioEnabled: false, videoPath: "/Users/test/recording.webm" }
      },
      preset: {
        aspectRatio: "16:9",
        outputName: "Shareme-export-16x9.mp4",
        includeBrowserFrame: false,
        background: { mode: "preset", preset: "slate" }
      }
    });

    expect(job.status).toBe("running");
    expect(spawnMock).toHaveBeenCalledWith(
      "/Applications/Shareme.app/Contents/Resources/app.asar/node_modules/ffmpeg-static/ffmpeg",
      expect.any(Array)
    );
    const args = spawnMock.mock.calls[0][1];
    expect(args).toEqual(expect.arrayContaining(["-i", "/Users/test/recording.webm", "-vf", expect.any(String)]));
    const filter = args[args.indexOf("-vf") + 1];
    expect(filter).toContain("crop=1280:677:0:43");
    expect(filter).toContain("pow");
    expect(filter).toContain("(1.0000+((1.8000)-1.0000)*");
    expect(filter).toContain("scale='1280*(");
    expect(filter).toContain("crop=1280:677:'max(0,min(iw-1280");
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
        recording: { id: "rec-1", sourceId: "source-1", sourceType: "window", sourceName: "Chrome", startedAt: "2024-01-01T00:00:00.000Z", durationMs: 1200, fps: 30, width: 1280, height: 720, audioEnabled: false, videoPath: "/Users/test/recording.webm" }
      },
      preset: {
        aspectRatio: "9:16",
        outputName: "Shareme-export-9x16.mp4",
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
        recording: { id: "rec-1", sourceId: "source-1", sourceType: "window", sourceName: "Chrome", startedAt: "2024-01-01T00:00:00.000Z", durationMs: 1200, fps: 30, width: 1280, height: 720, audioEnabled: false, videoPath: "/Users/test/recording.webm" }
      },
      preset: {
        aspectRatio: "1:1",
        outputName: "Shareme-export-1x1.mp4",
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
          outputName: "Shareme-export-16x9.mp4",
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
          sourceType: "window",
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
        outputName: "Shareme-export-1x1.mp4",
        includeBrowserFrame: false,
        background: { mode: "preset", preset: "sunset" }
      }
    });

    expect(spawnMock).toHaveBeenCalledWith(
      "/Applications/Shareme.app/Contents/Resources/app.asar/node_modules/ffmpeg-static/ffmpeg",
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
          sourceType: "window",
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
        outputName: "Shareme-export-16x9.mp4",
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

  it("supports native export by falling back to source bounds when frame dimensions are missing", async () => {
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
        background: { mode: "preset", preset: "slate" },
        includeBrowserFrame: false,
        recording: {
          id: "rec-1",
          sourceId: "source-1",
          sourceType: "window",
          sourceName: "Chrome",
          startedAt: "2024-01-01T00:00:00.000Z",
          durationMs: 1200,
          fps: 30,
          width: 0,
          height: 0,
          audioEnabled: false,
          sourceBounds: { width: 1441, height: 901 },
          videoPath: "/Users/test/recording.webm"
        }
      },
      preset: {
        aspectRatio: "native",
        outputName: "Shareme-export-native.mp4",
        includeBrowserFrame: false,
        background: { mode: "preset", preset: "slate" }
      }
    });

    const args = spawnMock.mock.calls[0][1];
    const filter = args[args.indexOf("-vf") + 1];
    expect(filter).toContain("scale=1440:900:force_original_aspect_ratio=decrease");
    expect(filter).toContain("pad=1440:900:(ow-iw)/2:(oh-ih)/2:0x111823");
  });

  it("applies capture crop regions before zoom-based export filters", async () => {
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
        captureSetup: {
          frameAspectRatio: "9:16",
          cropRegion: { x: 0.1, y: 0.1, width: 0.4, height: 0.6 }
        },
        zoomSegments: [],
        cursorPath: [],
        exportPresets: [],
        background: { mode: "preset", preset: "slate" },
        includeBrowserFrame: false,
        recording: {
          id: "rec-1",
          sourceId: "source-1",
          sourceType: "window",
          sourceName: "Chrome",
          startedAt: "2024-01-01T00:00:00.000Z",
          durationMs: 1200,
          fps: 30,
          width: 1280,
          height: 720,
          audioEnabled: false,
          captureSetup: {
            frameAspectRatio: "9:16",
            cropRegion: { x: 0.1, y: 0.1, width: 0.4, height: 0.6 }
          },
          videoPath: "/Users/test/recording.webm"
        }
      },
      preset: {
        aspectRatio: "9:16",
        outputName: "Shareme-export-9x16.mp4",
        includeBrowserFrame: false,
        background: { mode: "preset", preset: "slate" }
      }
    });

    const args = spawnMock.mock.calls[0][1];
    const filter = args[args.indexOf("-vf") + 1];
    expect(filter).toContain("crop=512:432:128:72");
  });

  it("builds dynamic cursor-follow expressions for follow-cursor zoom segments", async () => {
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
        zoomSegments: [
          {
            id: "zoom-follow",
            startMs: 0,
            endMs: 1400,
            targetX: 0.3,
            targetY: 0.7,
            scale: 1.8,
            followCursor: true,
            easing: "linear"
          }
        ],
        cursorPath: [
          { t: 0, x: 0.2, y: 0.3 },
          { t: 700, x: 0.6, y: 0.5 },
          { t: 1400, x: 0.8, y: 0.7 }
        ],
        exportPresets: [],
        background: { mode: "preset", preset: "slate" },
        includeBrowserFrame: false,
        recording: {
          id: "rec-1",
          sourceId: "source-1",
          sourceType: "window",
          sourceName: "Chrome",
          startedAt: "2024-01-01T00:00:00.000Z",
          durationMs: 1400,
          fps: 30,
          width: 1280,
          height: 720,
          audioEnabled: false,
          videoPath: "/Users/test/recording.webm"
        }
      },
      preset: {
        aspectRatio: "16:9",
        outputName: "Shareme-export-16x9.mp4",
        includeBrowserFrame: false,
        background: { mode: "preset", preset: "slate" }
      }
    });

    const args = spawnMock.mock.calls[0][1];
    const filter = args[args.indexOf("-vf") + 1];
    expect(filter).toContain("if(lte(t,0.000),0.2000");
    expect(filter).toContain("if(between(t,0.000,0.700)");
    expect(filter).toContain("((t-0.000)/0.700)");
    expect(filter).toContain("if(between(t,0.700,1.400)");
  });

  it("uses the unpacked ffmpeg binary path in packaged apps", async () => {
    const child = new MockChildProcess();
    spawnMock.mockReturnValue(child);
    showSaveDialogMock.mockResolvedValue({ canceled: false, filePath: "/Users/test/Movies/output.mp4" });
    existsSyncMock.mockReturnValue(true);

    const { app } = await import("electron");
    (app as { isPackaged: boolean }).isPackaged = true;

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
        background: { mode: "preset", preset: "slate" },
        includeBrowserFrame: false,
        recording: {
          id: "rec-1",
          sourceId: "source-1",
          sourceType: "window",
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
        outputName: "Shareme-export-16x9.mp4",
        includeBrowserFrame: false,
        background: { mode: "preset", preset: "slate" }
      }
    });

    expect(spawnMock).toHaveBeenCalledWith(
      "/Applications/Shareme.app/Contents/Resources/app.asar.unpacked/node_modules/ffmpeg-static/ffmpeg",
      expect.any(Array)
    );

    (app as { isPackaged: boolean }).isPackaged = false;
  });
});
