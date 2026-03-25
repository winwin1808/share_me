import { BrowserWindow, app, dialog } from "electron";
import path from "node:path";
import fs from "node:fs/promises";
import { spawn, ChildProcessWithoutNullStreams } from "node:child_process";
import ffmpegPath from "ffmpeg-static";
import { IPC_CHANNELS } from "../../shared/ipc";
import type { ExportJob, ExportRequest, ExportAspectRatio } from "../../shared/types";

export interface RenderAdapter {
  start(request: ExportRequest): Promise<ExportJob>;
  cancel(jobId: string): Promise<boolean>;
}

const ratios: Record<ExportAspectRatio, { width: number; height: number }> = {
  "16:9": { width: 1920, height: 1080 },
  "9:16": { width: 1080, height: 1920 },
  "1:1": { width: 1080, height: 1080 }
};

export class FfmpegRenderAdapter implements RenderAdapter {
  private jobs = new Map<string, ChildProcessWithoutNullStreams>();

  async start(request: ExportRequest): Promise<ExportJob> {
    const sourceVideoPath = request.sourceVideoPath ?? request.project.recording?.videoPath;
    if (!sourceVideoPath) {
      throw new Error("No source recording available for export.");
    }
    if (!ffmpegPath) {
      throw new Error("ffmpeg-static is not available.");
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

    await fs.mkdir(path.dirname(result.filePath), { recursive: true });
    const target = ratios[request.preset.aspectRatio];
    const filter = `scale=${target.width}:${target.height}:force_original_aspect_ratio=decrease,pad=${target.width}:${target.height}:(ow-iw)/2:(oh-ih)/2:black`;
    const args = ["-y", "-i", sourceVideoPath, "-vf", filter, "-c:v", "libx264", "-pix_fmt", "yuv420p", result.filePath];
    const child = spawn(ffmpegPath, args);
    const jobId = crypto.randomUUID();
    this.jobs.set(jobId, child);

    const job: ExportJob = {
      id: jobId,
      projectId: request.project.id,
      preset: request.preset,
      outputPath: result.filePath,
      status: "running",
      progress: 0
    };
    this.emitProgress(job);

    child.stderr.on("data", () => {
      job.progress = Math.min(job.progress + 0.1, 0.95);
      this.emitProgress(job);
    });

    child.on("close", (code) => {
      this.jobs.delete(jobId);
      job.status = code === 0 ? "completed" : "failed";
      job.progress = code === 0 ? 1 : job.progress;
      if (code !== 0) {
        job.error = `ffmpeg exited with code ${code}`;
      }
      this.emitProgress(job);
    });

    return job;
  }

  async cancel(jobId: string): Promise<boolean> {
    const job = this.jobs.get(jobId);
    if (!job) {
      return false;
    }
    job.kill("SIGTERM");
    this.jobs.delete(jobId);
    return true;
  }

  private emitProgress(job: ExportJob): void {
    for (const window of BrowserWindow.getAllWindows()) {
      window.webContents.send(IPC_CHANNELS.exportProgress, job);
    }
  }
}
