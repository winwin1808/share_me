import { BrowserWindow, app, dialog } from "electron";
import path from "node:path";
import fs from "node:fs/promises";
import syncFs from "node:fs";
import { spawn, ChildProcessWithoutNullStreams } from "node:child_process";
import ffmpegPath from "ffmpeg-static";
import { IPC_CHANNELS } from "../../shared/ipc";
import type { CaptureCropRegion, CursorPoint, ExportAspectRatio, ExportJob, ExportRequest, RecordingSession, ZoomSegment } from "../../shared/types";

export interface RenderAdapter {
  start(request: ExportRequest): Promise<ExportJob>;
  cancel(jobId: string): Promise<boolean>;
}

const ratios: Record<Exclude<ExportAspectRatio, "native">, { width: number; height: number }> = {
  "16:9": { width: 1920, height: 1080 },
  "9:16": { width: 1080, height: 1920 },
  "1:1": { width: 1080, height: 1080 }
};

const backgroundColors = {
  slate: "0x111823",
  ocean: "0x11253A",
  sunset: "0x291621"
} as const;
const ZOOM_RAMP_FRACTION = 0.22;

export class ExportValidationError extends Error {
  constructor(
    public readonly code: "NO_SOURCE_RECORDING" | "FFMPEG_UNAVAILABLE" | "INVALID_PRESET" | "INVALID_OUTPUT_PATH",
    message: string
  ) {
    super(message);
    this.name = "ExportValidationError";
  }
}

function toEvenDimension(value: number): number {
  const rounded = Math.max(2, Math.round(value));
  return rounded % 2 === 0 ? rounded : rounded - 1;
}

function getNativeRatio(recording?: RecordingSession): { width: number; height: number } {
  const width = recording?.frameBounds?.width ?? recording?.width;
  const height = recording?.frameBounds?.height ?? recording?.height;
  if (!width || !height) {
    throw new ExportValidationError("INVALID_PRESET", "Unsupported aspect ratio: native");
  }
  return {
    width: toEvenDimension(width),
    height: toEvenDimension(height)
  };
}

function getRatio(aspectRatio: ExportAspectRatio, recording?: RecordingSession): { width: number; height: number } {
  if (aspectRatio === "native") {
    return getNativeRatio(recording);
  }
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

function resolveFfmpegExecutablePath(): string {
  if (!ffmpegPath) {
    throw new ExportValidationError("FFMPEG_UNAVAILABLE", "ffmpeg-static is not available.");
  }

  if (!app.isPackaged) {
    return ffmpegPath;
  }

  const unpackedPath = ffmpegPath.replace(`${path.sep}app.asar${path.sep}`, `${path.sep}app.asar.unpacked${path.sep}`);
  if (unpackedPath !== ffmpegPath && syncFs.existsSync(unpackedPath)) {
    return unpackedPath;
  }

  return ffmpegPath;
}

function toSeconds(ms: number): string {
  return (ms / 1000).toFixed(3);
}

function toPixels(value: number, total: number): number {
  return Math.max(0, Math.min(total, Math.round(value * total)));
}

function buildCropFilter(region: CaptureCropRegion, sourceWidth: number, sourceHeight: number): string {
  const cropWidth = Math.max(1, toPixels(region.width, sourceWidth));
  const cropHeight = Math.max(1, toPixels(region.height, sourceHeight));
  const cropX = Math.min(Math.max(0, toPixels(region.x, sourceWidth)), Math.max(0, sourceWidth - cropWidth));
  const cropY = Math.min(Math.max(0, toPixels(region.y, sourceHeight)), Math.max(0, sourceHeight - cropHeight));
  return `crop=${cropWidth}:${cropHeight}:${cropX}:${cropY}`;
}

function buildNestedExpression(segments: ZoomSegment[], valueForSegment: (segment: ZoomSegment) => string, fallback: string): string {
  return segments.reduceRight(
    (expression, segment) =>
      `if(between(t,${toSeconds(segment.startMs)},${toSeconds(segment.endMs)}),${valueForSegment(segment)},${expression})`,
    fallback
  );
}

function buildEaseExpression(easing: ZoomSegment["easing"], progressExpression: string): string {
  const progress = `max(0,min(1,${progressExpression}))`;
  if (easing === "linear") {
    return progress;
  }
  if (easing === "easeOut") {
    return `(1-pow(1-${progress},2))`;
  }
  return `(if(lt(${progress},0.5),2*pow(${progress},2),1-pow(-2*${progress}+2,2)/2))`;
}

function buildSegmentProgressExpression(segment: ZoomSegment): string {
  const duration = Math.max(segment.endMs - segment.startMs, 1);
  return `((t-${toSeconds(segment.startMs)})/${toSeconds(duration)})`;
}

function buildSegmentIntensityExpression(segment: ZoomSegment): string {
  const progress = `max(0,min(1,${buildSegmentProgressExpression(segment)}))`;
  const rampFraction = ZOOM_RAMP_FRACTION.toFixed(2);
  const rampIn = buildEaseExpression(segment.easing, `(${progress}/${rampFraction})`);
  const rampOut = `1-${buildEaseExpression(segment.easing, `((${progress}-(1-${rampFraction}))/${rampFraction})`)}`;
  return `(if(lte(${progress},${rampFraction}),${rampIn},if(gte(${progress},1-${rampFraction}),${rampOut},1)))`;
}

function buildInterpolatedExpression(
  segments: ZoomSegment[],
  fallback: number,
  targetForSegment: (segment: ZoomSegment) => string
): string {
  return buildNestedExpression(
    segments,
    (segment) => {
      const target = targetForSegment(segment);
      const intensity = buildSegmentIntensityExpression(segment);
      return `(${fallback.toFixed(4)}+((${target})-${fallback.toFixed(4)})*${intensity})`;
    },
    fallback.toFixed(4)
  );
}

function buildFollowCursorTargetExpression(
  segment: ZoomSegment,
  cursorPath: CursorPoint[],
  axis: "x" | "y"
): string {
  const staticTarget = axis === "x" ? segment.targetX : segment.targetY;
  const relevantPoints = cursorPath
    .filter((point) => point.t >= segment.startMs && point.t <= segment.endMs)
    .sort((a, b) => a.t - b.t);

  if (relevantPoints.length === 0) {
    return staticTarget.toFixed(4);
  }

  if (relevantPoints.length === 1) {
    return (axis === "x" ? relevantPoints[0].x : relevantPoints[0].y).toFixed(4);
  }

  const expressions: string[] = [];
  const firstPoint = relevantPoints[0];
  expressions.push(
    `if(lte(t,${toSeconds(firstPoint.t)}),${(axis === "x" ? firstPoint.x : firstPoint.y).toFixed(4)},`
  );

  for (let index = 0; index < relevantPoints.length - 1; index += 1) {
    const current = relevantPoints[index];
    const next = relevantPoints[index + 1];
    const currentValue = axis === "x" ? current.x : current.y;
    const nextValue = axis === "x" ? next.x : next.y;
    const duration = Math.max(next.t - current.t, 1);
    const progress = `((t-${toSeconds(current.t)})/${toSeconds(duration)})`;
    const interpolation = `(${currentValue.toFixed(4)}+(${nextValue.toFixed(4)}-${currentValue.toFixed(4)})*max(0,min(1,${progress})))`;
    expressions.push(`if(between(t,${toSeconds(current.t)},${toSeconds(next.t)}),${interpolation},`);
  }

  const lastPoint = relevantPoints[relevantPoints.length - 1];
  expressions.push(`${(axis === "x" ? lastPoint.x : lastPoint.y).toFixed(4)}`);

  return `${expressions.join("")}${")".repeat(relevantPoints.length)}`;
}

function buildVideoFilter(
  request: ExportRequest,
  target: { width: number; height: number },
  options: { withPad: boolean }
): string {
  const segments = [...request.project.zoomSegments].sort((a, b) => a.startMs - b.startMs);
  const scaleExpression = buildInterpolatedExpression(segments, 1, (segment) => segment.scale.toFixed(4));
  const targetXExpression = buildInterpolatedExpression(segments, 0.5, (segment) =>
    segment.followCursor ? buildFollowCursorTargetExpression(segment, request.project.cursorPath, "x") : segment.targetX.toFixed(4)
  );
  const targetYExpression = buildInterpolatedExpression(segments, 0.5, (segment) =>
    segment.followCursor ? buildFollowCursorTargetExpression(segment, request.project.cursorPath, "y") : segment.targetY.toFixed(4)
  );
  const cropRegion = request.project.captureSetup?.cropRegion;
  const browserFrameCropTop =
    request.preset.includeBrowserFrame || !request.project.recording || cropRegion
      ? 0
      : Math.max(0, Math.round(request.project.recording.height * 0.06));
  const filterParts = [];
  if (cropRegion && request.project.recording) {
    filterParts.push(buildCropFilter(cropRegion, request.project.recording.width, request.project.recording.height));
  }
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
    const ffmpegExecutablePath = resolveFfmpegExecutablePath();

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
    const target = getRatio(request.preset.aspectRatio, request.project.recording);
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
    const child = spawn(ffmpegExecutablePath, args);
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
