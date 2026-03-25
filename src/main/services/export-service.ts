import { BrowserWindow, app, dialog } from "electron";
import path from "node:path";
import fs from "node:fs/promises";
import { spawn, ChildProcessWithoutNullStreams } from "node:child_process";
import ffmpegPath from "ffmpeg-static";
import { IPC_CHANNELS } from "../../shared/ipc";
import type { ExportJob, ExportRequest, ExportAspectRatio, ZoomSegment } from "../../shared/types";

export interface RenderAdapter {
  start(request: ExportRequest): Promise<ExportJob>;
  cancel(jobId: string): Promise<boolean>;
}

const ratios: Record<ExportAspectRatio, { width: number; height: number }> = {
  "16:9": { width: 1920, height: 1080 },
  "9:16": { width: 1080, height: 1920 },
  "1:1": { width: 1080, height: 1080 }
};

const backgroundColors = {
  slate: "0x111823",
  ocean: "0x11253A",
  sunset: "0x291621"
} as const;

export class ExportValidationError extends Error {
  constructor(
    public readonly code: "NO_SOURCE_RECORDING" | "FFMPEG_UNAVAILABLE" | "INVALID_PRESET" | "INVALID_OUTPUT_PATH",
    message: string
  ) {
    super(message);
    this.name = "ExportValidationError";
  }
}

function getRatio(aspectRatio: ExportAspectRatio): { width: number; height: number } {
  const target = ratios[aspectRatio];
  if (!target) {
    throw new ExportValidationError("INVALID_PRESET", `Unsupported aspect ratio: ${aspectRatio}`);
  }
  return target;
}

function ensureMp4Extension(filePath: string): string {
  return path.extname(filePath).toLowerCase() === ".mp4" ? filePath : `${filePath}.mp4`;
}

function resolveOutputPath(defaultPath: string): string {
  if (!defaultPath || defaultPath.trim().length === 0) {
    throw new ExportValidationError("INVALID_OUTPUT_PATH", "No output path was selected.");
  }
  return ensureMp4Extension(defaultPath);
}

function toSeconds(ms: number): string {
  return (ms / 1000).toFixed(3);
}

function buildNestedExpression(segments: ZoomSegment[], valueForSegment: (segment: ZoomSegment) => string, fallback: string): string {
  return segments.reduceRight(
    (expression, segment) =>
      `if(between(t,${toSeconds(segment.startMs)},${toSeconds(segment.endMs)}),${valueForSegment(segment)},${expression})`,
    fallback
  );
}

function buildVideoFilter(
  request: ExportRequest,
  target: { width: number; height: number },
  options: { withPad: boolean }
): string {
  const segments = [...request.project.zoomSegments].sort((a, b) => a.startMs - b.startMs);
  const scaleExpression = buildNestedExpression(segments, (segment) => segment.scale.toFixed(3), "1");
  const targetXExpression = buildNestedExpression(segments, (segment) => segment.targetX.toFixed(4), "0.5");
  const targetYExpression = buildNestedExpression(segments, (segment) => segment.targetY.toFixed(4), "0.5");
  const browserFrameCropTop =
    request.preset.includeBrowserFrame || !request.project.recording
      ? 0
      : Math.max(0, Math.round(request.project.recording.height * 0.06));
  const filterParts = [];
  if (browserFrameCropTop > 0) {
    filterParts.push(`crop=iw:ih-${browserFrameCropTop}:0:${browserFrameCropTop}`);
  }

  const cropWidthExpression = `iw/(${scaleExpression})`;
  const cropHeightExpression = `ih/(${scaleExpression})`;
  const cropXExpression = `max(0,min(iw-(${cropWidthExpression}),iw*(${targetXExpression})-(${cropWidthExpression})/2))`;
  const cropYExpression = `max(0,min(ih-(${cropHeightExpression}),ih*(${targetYExpression})-(${cropHeightExpression})/2))`;

  filterParts.push(`crop='${cropWidthExpression}':'${cropHeightExpression}':'${cropXExpression}':'${cropYExpression}'`);
  filterParts.push(`scale=${target.width}:${target.height}:force_original_aspect_ratio=decrease`);
  if (options.withPad) {
    const backgroundFill =
      request.preset.background.mode === "preset" ? backgroundColors[request.preset.background.preset] : backgroundColors.slate;
    filterParts.push(`pad=${target.width}:${target.height}:(ow-iw)/2:(oh-ih)/2:${backgroundFill}`);
  }
  return filterParts.join(",");
}

export class FfmpegRenderAdapter implements RenderAdapter {
  private jobs = new Map<string, { process: ChildProcessWithoutNullStreams; job: ExportJob }>();

  async start(request: ExportRequest): Promise<ExportJob> {
    const sourceVideoPath = request.sourceVideoPath ?? request.project.recording?.videoPath;
    if (!sourceVideoPath) {
      throw new ExportValidationError("NO_SOURCE_RECORDING", "No source recording is available for export.");
    }
    if (!ffmpegPath) {
      throw new ExportValidationError("FFMPEG_UNAVAILABLE", "ffmpeg-static is not available.");
    }

    const defaultPath = path.join(app.getPath("videos"), request.preset.outputName);
    const result = await dialog.showSaveDialog({
      title: "Export video",
      defaultPath,
      filters: [{ name: "MP4 Video", extensions: ["mp4"] }]
    });
    if (result.canceled || !result.filePath) {
      return {
        id: crypto.randomUUID(),
        projectId: request.project.id,
        preset: request.preset,
        outputPath: "",
        status: "cancelled",
        progress: 0
      };
    }

    const outputPath = resolveOutputPath(result.filePath);
    await fs.mkdir(path.dirname(outputPath), { recursive: true });
    const target = getRatio(request.preset.aspectRatio);
    const useCustomBackground =
      request.preset.background.mode === "custom" && Boolean(request.preset.background.customImagePath);
    const durationMs = request.project.recording?.durationMs ?? 0;
    const args = ["-y", "-i", sourceVideoPath];
    if (useCustomBackground) {
      args.push("-loop", "1", "-i", request.preset.background.customImagePath as string);
    }
    const editedVideoFilter = buildVideoFilter(request, target, { withPad: !useCustomBackground });
    if (useCustomBackground) {
      args.push(
        "-filter_complex",
        `[1:v]scale=${target.width}:${target.height}[bg];[0:v]${editedVideoFilter}[fg];[bg][fg]overlay=(W-w)/2:(H-h)/2:shortest=1`,
        "-shortest"
      );
    } else {
      args.push("-vf", editedVideoFilter);
    }
    args.push("-c:v", "libx264", "-pix_fmt", "yuv420p", "-progress", "pipe:1", "-nostats", outputPath);
    const child = spawn(ffmpegPath, args);
    const jobId = crypto.randomUUID();
    const job: ExportJob = {
      id: jobId,
      projectId: request.project.id,
      preset: request.preset,
      outputPath,
      status: "running",
      progress: 0
    };
    this.jobs.set(jobId, { process: child, job });
    this.emitProgress(job);

    let progressBuffer = "";
    child.stdout.on("data", (chunk: Buffer) => {
      progressBuffer += chunk.toString("utf8");
      const lines = progressBuffer.split(/\r?\n/);
      progressBuffer = lines.pop() ?? "";

      for (const line of lines) {
        if (line.startsWith("out_time_ms=") && durationMs > 0) {
          const outTimeMs = Number(line.slice("out_time_ms=".length)) / 1000;
          job.progress = Math.min(outTimeMs / durationMs, 0.98);
          this.emitProgress(job);
        }
        if (line === "progress=end") {
          job.progress = 1;
          this.emitProgress(job);
        }
      }
    });

    child.stderr.on("data", (chunk: Buffer) => {
      if (chunk.length === 0) {
        return;
      }
      if (job.progress === 0) {
        job.progress = 0.05;
      }
      this.emitProgress(job);
    });

    child.on("close", (code, signal) => {
      this.jobs.delete(jobId);
      if (signal === "SIGTERM") {
        job.status = "cancelled";
        job.progress = 0;
      } else if (code === 0) {
        job.status = "completed";
        job.progress = 1;
      } else {
        job.status = "failed";
        job.error = `ffmpeg exited with code ${code ?? "unknown"}${signal ? ` and signal ${signal}` : ""}`;
      }
      this.emitProgress(job);
    });

    return job;
  }

  async cancel(jobId: string): Promise<boolean> {
    const entry = this.jobs.get(jobId);
    if (!entry) {
      return false;
    }
    entry.job.status = "cancelled";
    entry.job.progress = 0;
    this.emitProgress(entry.job);
    entry.process.kill("SIGTERM");
    this.jobs.delete(jobId);
    return true;
  }

  private emitProgress(job: ExportJob): void {
    for (const window of BrowserWindow.getAllWindows()) {
      window.webContents.send(IPC_CHANNELS.exportProgress, job);
    }
  }
}
