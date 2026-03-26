import { useEffect, useMemo, useRef, useState } from "react";
import type { MouseEvent, PointerEvent } from "react";
import type {
  CaptureCropRegion,
  CaptureSource,
  CursorPoint,
  ExportJob,
  ExportPreset,
  FrameAspectRatio,
  GlobalCursorState,
  ProjectFileV1,
  RecordingSession,
  ZoomSegment
} from "@shared/types";
import { createProject } from "@shared/utils/project";
import { createZoomSegment, getZoomPreviewTime, getZoomStateAtTime } from "@shared/utils/zoom";

type RecorderState = "idle" | "recording" | "stopped";
type SourceState = "loading" | "ready" | "error";
type PreviewState = "idle" | "live" | "playing" | "paused";
type SaveState = "idle" | "saving" | "saved" | "error";
type CaptureFrameMode = "fit" | "crop";
type PendingTrayAction = "record" | null;

const MIN_ZOOM_SCALE = 1;
const MAX_ZOOM_SCALE = 3;
const MIN_ZOOM_DURATION_MS = 120;
const CURSOR_SAMPLE_INTERVAL_MS = 100;

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function formatError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function isPlaybackInterruptionError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  return error.name === "AbortError" || error.message.includes("play() request was interrupted");
}

function normalizeSegment(segment: ZoomSegment): ZoomSegment {
  const startMs = Math.max(0, Math.round(segment.startMs));
  const endMs = Math.max(startMs + MIN_ZOOM_DURATION_MS, Math.round(segment.endMs));
  return {
    ...segment,
    startMs,
    endMs,
    scale: clamp(segment.scale, MIN_ZOOM_SCALE, MAX_ZOOM_SCALE),
    targetX: clamp(segment.targetX, 0, 1),
    targetY: clamp(segment.targetY, 0, 1)
  };
}

function filePathToUrl(filePath: string): string {
  return `shareme-file://local${encodeURI(filePath)}`;
}

function getFileName(filePath: string): string {
  const normalized = filePath.replaceAll("\\", "/");
  return normalized.split("/").pop() || filePath;
}

function padTimestampPart(value: number): string {
  return value.toString().padStart(2, "0");
}

function formatExportTimestamp(date: Date): string {
  const year = date.getFullYear();
  const month = padTimestampPart(date.getMonth() + 1);
  const day = padTimestampPart(date.getDate());
  const hours = padTimestampPart(date.getHours());
  const minutes = padTimestampPart(date.getMinutes());
  const seconds = padTimestampPart(date.getSeconds());
  return `${year}-${month}-${day}_${hours}-${minutes}-${seconds}`;
}

function createProjectExportPreset(project: ProjectFileV1, frameAspectRatio: FrameAspectRatio): ExportPreset {
  return {
    aspectRatio: frameAspectRatio,
    outputName: `Shareme-export-${formatExportTimestamp(new Date())}.mp4`,
    includeBrowserFrame: project.includeBrowserFrame,
    background: project.background
  };
}

function createProjectFocus(project: ProjectFileV1): number {
  return project.zoomSegments[0] ? getZoomPreviewTime(project.zoomSegments[0]) : 0;
}

function normalizeCropRegion(start: { x: number; y: number }, end: { x: number; y: number }): CaptureCropRegion {
  const x = Math.min(start.x, end.x);
  const y = Math.min(start.y, end.y);
  const width = Math.abs(end.x - start.x);
  const height = Math.abs(end.y - start.y);
  return {
    x,
    y,
    width,
    height
  };
}

function normalizeCursorPosition(cursorState: GlobalCursorState, captureSource: CaptureSource): { x: number; y: number } | null {
  const { displayBounds, displayId } = cursorState;
  if (displayBounds.width <= 0 || displayBounds.height <= 0) {
    return null;
  }

  if (captureSource.sourceType === "screen" && captureSource.displayId && displayId && captureSource.displayId !== displayId) {
    return null;
  }

  const normalizedX = (cursorState.x - displayBounds.x) / displayBounds.width;
  const normalizedY = (cursorState.y - displayBounds.y) / displayBounds.height;

  if (!Number.isFinite(normalizedX) || !Number.isFinite(normalizedY)) {
    return null;
  }

  return {
    x: clamp(normalizedX, 0, 1),
    y: clamp(normalizedY, 0, 1)
  };
}

function loadVideoMetadata(filePath: string): Promise<{ durationMs: number; width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    const cleanup = () => {
      video.onloadedmetadata = null;
      video.onerror = null;
      video.removeAttribute("src");
      video.load();
    };

    video.preload = "metadata";
    video.onloadedmetadata = () => {
      const durationMs = Number.isFinite(video.duration) && video.duration > 0 ? Math.round(video.duration * 1000) : 0;
      const width = video.videoWidth || 1920;
      const height = video.videoHeight || 1080;
      cleanup();
      resolve({ durationMs, width, height });
    };
    video.onerror = () => {
      cleanup();
      reject(new Error("Unable to read the selected video file."));
    };
    video.src = filePathToUrl(filePath);
  });
}

export function useDesktopStudioController() {
  const [project, setProject] = useState<ProjectFileV1>(() => createProject("Shareme Capture"));
  const [sources, setSources] = useState<CaptureSource[]>([]);
  const [selectedSourceId, setSelectedSourceId] = useState<string>("");
  const [recorderState, setRecorderState] = useState<RecorderState>("idle");
  const [sourceState, setSourceState] = useState<SourceState>("loading");
  const [sourceError, setSourceError] = useState<string | null>(null);
  const [captureError, setCaptureError] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [playbackState, setPlaybackState] = useState<PreviewState>("idle");
  const [playheadMs, setPlayheadMs] = useState(0);
  const [recordingDurationMs, setRecordingDurationMs] = useState(0);
  const [recordedPreviewUrl, setRecordedPreviewUrl] = useState<string | null>(null);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [cursorPathVersion, setCursorPathVersion] = useState(0);
  const [exportJob, setExportJob] = useState<ExportJob | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const [systemSummary, setSystemSummary] = useState("Loading system info...");
  const [selectedZoomId, setSelectedZoomId] = useState<string | null>(null);
  const [frameAspectRatio, setFrameAspectRatio] = useState<FrameAspectRatio>(project.captureSetup?.frameAspectRatio ?? "16:9");
  const [captureFrameMode, setCaptureFrameMode] = useState<CaptureFrameMode>("fit");
  const [cropRegion, setCropRegion] = useState<CaptureCropRegion | null>(project.captureSetup?.cropRegion ?? null);
  const [cropDraftRegion, setCropDraftRegion] = useState<CaptureCropRegion | null>(null);
  const [autoZoomOnClickWhileRecording, setAutoZoomOnClickWhileRecording] = useState(
    project.captureSetup?.autoZoomOnClickWhileRecording ?? false
  );
  const [sourcePickerOpen, setSourcePickerOpen] = useState(false);
  const [pendingTrayAction, setPendingTrayAction] = useState<PendingTrayAction>(null);
  const [editorFocusSignal, setEditorFocusSignal] = useState(0);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startedAtRef = useRef(0);
  const timerRef = useRef<number | null>(null);
  const cursorTimerRef = useRef<number | null>(null);
  const cropStartRef = useRef<{ x: number; y: number } | null>(null);
  const playRequestIdRef = useRef(0);
  const lastPreviewPlayheadRef = useRef(0);
  const recordingSourceRef = useRef<CaptureSource | null>(null);
  const recordedCursorPathRef = useRef<CursorPoint[]>([]);
  const cursorSampleInFlightRef = useRef(false);
  const cursorFallbackWarningRef = useRef(false);

  const selectedSource = useMemo(
    () => sources.find((source) => source.id === selectedSourceId) ?? null,
    [sources, selectedSourceId]
  );
  const previewSourceUrl = useMemo(() => {
    if (recordedPreviewUrl) {
      return recordedPreviewUrl;
    }
    if (project.recording?.videoPath) {
      return filePathToUrl(project.recording.videoPath);
    }
    return null;
  }, [project.recording?.videoPath, recordedPreviewUrl]);
  const playheadDurationMs = useMemo(
    () => Math.max(recordingDurationMs, project.recording?.durationMs ?? 0, elapsedMs),
    [elapsedMs, project.recording?.durationMs, recordingDurationMs]
  );
  const activeCursorPath = recorderState === "recording" ? recordedCursorPathRef.current : project.cursorPath;
  const previewZoom = useMemo(
    () => getZoomStateAtTime(project.zoomSegments, playheadMs, activeCursorPath),
    [activeCursorPath, cursorPathVersion, playheadMs, project.zoomSegments]
  );
  const activeZoom = previewZoom.segment;
  const selectedZoom = useMemo(
    () => project.zoomSegments.find((segment) => segment.id === selectedZoomId) ?? null,
    [project.zoomSegments, selectedZoomId]
  );
  const canPreviewPlay = Boolean(previewSourceUrl);
  const hasCropRegion = Boolean(cropRegion);
  const exportPreset = useMemo(() => createProjectExportPreset(project, frameAspectRatio), [frameAspectRatio, project]);

  useEffect(() => {
    void refreshSources();
    void loadSystemInfo();
    const unsubscribe = window.desktopApi.exportVideo.onProgress((job) => {
      setExportJob(job);
      if (job.status === "failed") {
        setExportError(job.error ?? "Export failed.");
      }
      if (job.status === "completed") {
        setExportError(null);
      }
    });
    return () => {
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    const unsubscribeTray = window.desktopApi.app.onTrayCommand((command) => {
      if (command === "record") {
        if (selectedSourceId) {
          void startRecording();
        } else {
          void refreshSources();
          setPendingTrayAction("record");
          setSourcePickerOpen(true);
        }
        return;
      }
      if (command === "select-input") {
        void refreshSources();
        setPendingTrayAction(null);
        setSourcePickerOpen(true);
        return;
      }
      if (command === "open-editor") {
        setEditorFocusSignal((current) => current + 1);
        return;
      }
      if (command === "stop-recording") {
        stopRecording();
      }
    });

    return () => {
      unsubscribeTray();
    };
  }, [selectedSourceId, selectedSource, recorderState, captureFrameMode, cropRegion, frameAspectRatio]);

  useEffect(() => {
    return () => {
      if (recordedPreviewUrl) {
        URL.revokeObjectURL(recordedPreviewUrl);
      }
    };
  }, [recordedPreviewUrl]);

  useEffect(() => {
    if (project.zoomSegments.length > 0 && !selectedZoomId) {
      setSelectedZoomId(project.zoomSegments[0].id);
    }
    if (project.zoomSegments.length === 0) {
      setSelectedZoomId(null);
    }
  }, [project.zoomSegments, selectedZoomId]);

  useEffect(() => {
    if (recorderState === "recording" || !previewSourceUrl) {
      return;
    }
    const video = videoRef.current;
    if (!video || !Number.isFinite(video.duration) || video.duration <= 0) {
      return;
    }

    const desiredTime = clamp(playheadMs, 0, Math.round(video.duration * 1000)) / 1000;
    if (Math.abs(video.currentTime - desiredTime) <= 0.12) {
      return;
    }

    try {
      video.currentTime = desiredTime;
    } catch {
      // Ignore sync attempts before the browser allows seeking.
    }
  }, [playheadMs, previewSourceUrl, recorderState]);

  useEffect(() => {
    setProject((current) => ({
      ...current,
      captureSetup: {
        ...current.captureSetup,
        sourceId: selectedSource?.id ?? current.captureSetup?.sourceId,
        sourceType: selectedSource?.sourceType ?? current.captureSetup?.sourceType,
        sourceName: selectedSource?.name ?? current.captureSetup?.sourceName,
        frameAspectRatio,
        cropRegion: cropRegion ?? undefined,
        autoZoomOnClickWhileRecording
      }
    }));
  }, [autoZoomOnClickWhileRecording, cropRegion, frameAspectRatio, selectedSource]);

  useEffect(() => {
    return () => {
      if (cursorTimerRef.current) {
        window.clearInterval(cursorTimerRef.current);
        cursorTimerRef.current = null;
      }
    };
  }, []);

  async function refreshSources() {
    setSourceState("loading");
    setSourceError(null);
    try {
      const nextSources = await window.desktopApi.capture.listSources();
      setSources(nextSources);
      setSelectedSourceId((current) => {
        const stillAvailable = nextSources.some((source) => source.id === current);
        return stillAvailable ? current : nextSources[0]?.id || "";
      });
      setSourceState("ready");
    } catch (error) {
      setSources([]);
      setSelectedSourceId("");
      setSourceState("error");
      setSourceError(formatError(error));
    }
  }

  async function loadSystemInfo() {
    const info = await window.desktopApi.app.getSystemInfo();
    setSystemSummary(
      `${info.platform} ${info.arch} | Electron ${info.electronVersion} | signing ${
        info.signingConfigured ? "configured" : "unsigned"
      }`
    );
  }

  function resetPlaybackState(): void {
    setPlayheadMs(0);
    setRecordingDurationMs(0);
    setElapsedMs(0);
    setPlaybackState("idle");
    setRecorderState("idle");
  }

  function clearRecordedPreviewUrl(): void {
    setRecordedPreviewUrl((current) => {
      if (current) {
        URL.revokeObjectURL(current);
      }
      return null;
    });
  }

  function detachLiveStream(): void {
    const video = videoRef.current;
    if (!video) {
      return;
    }
    video.pause();
    if (video.srcObject) {
      video.srcObject = null;
    }
  }

  function stopCursorSampling(): void {
    if (cursorTimerRef.current) {
      window.clearInterval(cursorTimerRef.current);
      cursorTimerRef.current = null;
    }
    cursorSampleInFlightRef.current = false;
  }

  async function sampleCursor(): Promise<void> {
    if (cursorSampleInFlightRef.current) {
      return;
    }
    const captureSource = recordingSourceRef.current;
    if (!captureSource) {
      return;
    }

    cursorSampleInFlightRef.current = true;
    try {
      const cursorState = await window.desktopApi.capture.getCursorState();
      if (!cursorState) {
        if (!cursorFallbackWarningRef.current) {
          cursorFallbackWarningRef.current = true;
          setCaptureError("Cursor tracking is unavailable. Follow-cursor zooms will fall back to the clicked target.");
        }
        return;
      }

      const normalizedPosition = normalizeCursorPosition(cursorState, captureSource);
      if (!normalizedPosition) {
        return;
      }

      const t = Math.max(0, Math.round(performance.now() - startedAtRef.current));
      const previousSample = recordedCursorPathRef.current[recordedCursorPathRef.current.length - 1];
      if (previousSample && previousSample.t === t) {
        recordedCursorPathRef.current[recordedCursorPathRef.current.length - 1] = { t, ...normalizedPosition };
        setCursorPathVersion((current) => current + 1);
        return;
      }

      recordedCursorPathRef.current = [...recordedCursorPathRef.current, { t, ...normalizedPosition }];
      setCursorPathVersion((current) => current + 1);
    } catch {
      if (!cursorFallbackWarningRef.current) {
        cursorFallbackWarningRef.current = true;
        setCaptureError("Cursor tracking is unavailable. Follow-cursor zooms will fall back to the clicked target.");
      }
    } finally {
      cursorSampleInFlightRef.current = false;
    }
  }

  function startCursorSampling(): void {
    stopCursorSampling();
    void sampleCursor();
    cursorTimerRef.current = window.setInterval(() => {
      void sampleCursor();
    }, CURSOR_SAMPLE_INTERVAL_MS);
  }

  function markProjectDirty(): void {
    setSaveState("idle");
    setSaveError(null);
  }

  function focusZoom(segmentId: string): void {
    setSelectedZoomId(segmentId);
    const segment = project.zoomSegments.find((item) => item.id === segmentId);
    if (segment) {
      seekPlayhead(getZoomPreviewTime(segment));
    }
  }

  async function createNewProject() {
    stopCursorSampling();
    detachLiveStream();
    clearRecordedPreviewUrl();
    setProject(createProject("Shareme Capture"));
    resetPlaybackState();
    setExportJob(null);
    setExportError(null);
    markProjectDirty();
    setCaptureError(null);
    setSourceError(null);
    setSelectedZoomId(null);
    setSelectedSourceId("");
    setCaptureFrameMode("fit");
    setFrameAspectRatio("16:9");
    setCropRegion(null);
    setCropDraftRegion(null);
    setAutoZoomOnClickWhileRecording(false);
    setSourcePickerOpen(false);
    setPendingTrayAction(null);
  }

  async function openProject() {
    try {
      stopCursorSampling();
      detachLiveStream();
      const next = await window.desktopApi.project.open();
      if (next) {
        clearRecordedPreviewUrl();
        setProject(next);
        setSelectedZoomId(next.zoomSegments[0]?.id ?? null);
        setPlayheadMs(createProjectFocus(next));
        setRecordingDurationMs(next.recording?.durationMs ?? 0);
        setPlaybackState(next.recording ? "paused" : "idle");
        const savedFrameAspectRatio = next.captureSetup?.frameAspectRatio ?? next.recording?.captureSetup?.frameAspectRatio ?? "16:9";
        const savedCropRegion = next.captureSetup?.cropRegion ?? next.recording?.captureSetup?.cropRegion ?? null;
        setFrameAspectRatio(savedFrameAspectRatio);
        setCropRegion(savedCropRegion);
        setCaptureFrameMode(savedCropRegion ? "crop" : "fit");
        setAutoZoomOnClickWhileRecording(next.captureSetup?.autoZoomOnClickWhileRecording ?? false);
        setSelectedSourceId(next.captureSetup?.sourceId ?? next.recording?.sourceId ?? "");
        setSaveState("saved");
        setSaveError(null);
      }
    } catch (error) {
      setSaveState("error");
      setSaveError(formatError(error));
    }
  }

  async function importVideoFile() {
    try {
      stopCursorSampling();
      const videoPath = await window.desktopApi.app.pickFile(["mp4", "mov"]);
      if (!videoPath) {
        return;
      }

      detachLiveStream();
      clearRecordedPreviewUrl();
      setCaptureError(null);
      setExportError(null);
      setSaveError(null);

      const { durationMs, width, height } = await loadVideoMetadata(videoPath);
      const sourceName = getFileName(videoPath);
      const now = new Date().toISOString();
      const nextFrameAspectRatio = frameAspectRatio ?? "16:9";
      const importedRecording: RecordingSession = {
        id: crypto.randomUUID(),
        sourceId: `imported:${crypto.randomUUID()}`,
        sourceType: "window",
        sourceName,
        startedAt: now,
        endedAt: now,
        durationMs,
        fps: 30,
        width,
        height,
        audioEnabled: true,
        captureSetup: {
          sourceId: `imported:${sourceName}`,
          sourceType: "window",
          sourceName,
          frameAspectRatio: nextFrameAspectRatio,
          cropRegion: cropRegion ?? undefined,
          autoZoomOnClickWhileRecording
        },
        sourceBounds: { width, height },
        frameBounds: getFrameBounds(nextFrameAspectRatio, width, height),
        permissionStatus: "unknown",
        sourceStatus: "available",
        videoPath
      };

      setProject((current) => ({
        ...current,
        name: current.recording ? current.name : sourceName.replace(/\.[^.]+$/, ""),
        captureSetup: {
          sourceId: importedRecording.sourceId,
          sourceType: importedRecording.sourceType,
          sourceName: importedRecording.sourceName,
          frameAspectRatio: nextFrameAspectRatio,
          cropRegion: cropRegion ?? undefined,
          autoZoomOnClickWhileRecording
        },
        recording: importedRecording,
        zoomSegments: [],
        cursorPath: [],
        updatedAt: new Date().toISOString()
      }));
      setSelectedSourceId("");
      setSelectedZoomId(null);
      setPlayheadMs(0);
      setRecordingDurationMs(durationMs);
      setElapsedMs(durationMs);
      setPlaybackState("paused");
      setRecorderState("idle");
      markProjectDirty();
    } catch (error) {
      setCaptureError(formatError(error));
    }
  }

  async function saveProject() {
    setSaveState("saving");
    setSaveError(null);
    try {
      const saved = await window.desktopApi.project.save(project);
      setProject(saved);
      setSaveState("saved");
    } catch (error) {
      setSaveState("error");
      setSaveError(formatError(error));
    }
  }

  async function startRecording(sourceOverride?: CaptureSource | null) {
    const captureSource = sourceOverride ?? selectedSource;
    if (!captureSource) {
      setCaptureError("Select a capture source before recording.");
      return;
    }
    if (captureFrameMode === "crop" && !cropRegion) {
      setCaptureError("Select a crop region before recording.");
      return;
    }

    setCaptureError(null);
    setExportError(null);
    setExportJob(null);
    clearRecordedPreviewUrl();
    recordingSourceRef.current = captureSource;
    recordedCursorPathRef.current = [];
    setCursorPathVersion(0);
    cursorFallbackWarningRef.current = false;
    setPlaybackState("live");
    setPlayheadMs(0);
    setRecordingDurationMs(0);
    setElapsedMs(0);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          mandatory: {
            chromeMediaSource: "desktop",
            chromeMediaSourceId: captureSource.id,
            minWidth: 1280,
            minHeight: 720,
            maxWidth: 2560,
            maxHeight: 1440
          }
        } as MediaTrackConstraints
      });

      streamRef.current = stream;
      chunksRef.current = [];
      startedAtRef.current = performance.now();

      const recorder = new MediaRecorder(stream, { mimeType: "video/webm; codecs=vp9" });
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };
      recorder.onstop = () => {
        void finalizeRecording();
      };
      mediaRecorderRef.current = recorder;

      if (videoRef.current) {
        videoRef.current.pause();
        videoRef.current.srcObject = stream;
        videoRef.current.src = "";
        await videoRef.current.play();
      }

      recorder.start(300);
      timerRef.current = window.setInterval(() => {
        const nextElapsed = performance.now() - startedAtRef.current;
        setElapsedMs(nextElapsed);
        setPlayheadMs(nextElapsed);
        setRecordingDurationMs(nextElapsed);
      }, 100);
      startCursorSampling();
      setRecorderState("recording");
    } catch (error) {
      stopCursorSampling();
      setPlaybackState("idle");
      setCaptureError(formatError(error));
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      setRecorderState("idle");
    }
  }

  function stopRecording() {
    stopCursorSampling();
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
    }
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    detachLiveStream();
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setRecorderState("stopped");
  }

  async function finalizeRecording() {
    const captureSource = recordingSourceRef.current;
    const blob = new Blob(chunksRef.current, { type: "video/webm" });
    if (blob.size === 0) {
      setCaptureError("Recording finished with no data.");
      recordingSourceRef.current = null;
      return;
    }

    if (!captureSource) {
      setCaptureError("Recording source context was lost before saving.");
      recordingSourceRef.current = null;
      return;
    }

    const buffer = await blob.arrayBuffer();
    const width = videoRef.current?.videoWidth ?? 1920;
    const height = videoRef.current?.videoHeight ?? 1080;
    const durationMs = Math.max(Math.round(elapsedMs), Math.round(playheadMs));

    const nextUrl = URL.createObjectURL(blob);
    setRecordedPreviewUrl((current) => {
      if (current) {
        URL.revokeObjectURL(current);
      }
      return nextUrl;
    });
    setPlaybackState("paused");
    setPlayheadMs(durationMs);
    setRecordingDurationMs(durationMs);

      const session: RecordingSession = {
        id: crypto.randomUUID(),
        sourceId: captureSource.id,
        sourceType: captureSource.sourceType,
        sourceName: captureSource.name,
        startedAt: new Date(Date.now() - durationMs).toISOString(),
        endedAt: new Date().toISOString(),
        durationMs,
        fps: 30,
        width,
        height,
        audioEnabled: false,
        captureSetup: {
          sourceId: captureSource.id,
          sourceType: captureSource.sourceType,
          sourceName: captureSource.name,
          frameAspectRatio,
          cropRegion: cropRegion ?? undefined
        },
        sourceBounds: { width, height },
        frameBounds: getFrameBounds(frameAspectRatio, width, height)
      };

    try {
      const savedRecording = await window.desktopApi.recording.save({ data: buffer, session });
      setProject((current) => ({
        ...current,
        captureSetup: {
          sourceId: captureSource.id,
          sourceType: captureSource.sourceType,
          sourceName: captureSource.name,
          frameAspectRatio,
          cropRegion: cropRegion ?? undefined,
          autoZoomOnClickWhileRecording
        },
        recording: savedRecording,
        cursorPath: recordedCursorPathRef.current,
        updatedAt: new Date().toISOString()
      }));
      markProjectDirty();
    } catch (error) {
      setSaveState("error");
      setSaveError(formatError(error));
    } finally {
      recordingSourceRef.current = null;
    }
  }

  function addZoomFromPreview(event: MouseEvent<HTMLDivElement>) {
    if (captureFrameMode === "crop") {
      return;
    }
    if (recorderState === "recording" && !autoZoomOnClickWhileRecording) {
      return;
    }
    if (recorderState !== "recording" && recorderState !== "stopped" && playbackState !== "paused" && playbackState !== "playing") {
      return;
    }
    const rect = event.currentTarget.getBoundingClientRect();
    const targetX = clamp((event.clientX - rect.left) / rect.width, 0, 1);
    const targetY = clamp((event.clientY - rect.top) / rect.height, 0, 1);
    const nextSegment = createZoomSegment(playheadMs, targetX, targetY);
    if (recorderState === "recording") {
      nextSegment.followCursor = true;
    }
    setProject((current) => ({
      ...current,
      zoomSegments: [...current.zoomSegments, nextSegment],
      updatedAt: new Date().toISOString()
    }));
    markProjectDirty();
    focusZoom(nextSegment.id);
  }

  function updateSelectedZoom(patch: Partial<ZoomSegment>) {
    if (!selectedZoomId) {
      return;
    }
    setProject((current) => ({
      ...current,
      zoomSegments: current.zoomSegments.map((segment) =>
        segment.id === selectedZoomId ? normalizeSegment({ ...segment, ...patch }) : segment
      ),
      updatedAt: new Date().toISOString()
    }));
    markProjectDirty();
  }

  function removeSelectedZoom() {
    if (!selectedZoomId) {
      return;
    }
    setProject((current) => ({
      ...current,
      zoomSegments: current.zoomSegments.filter((segment) => segment.id !== selectedZoomId),
      updatedAt: new Date().toISOString()
    }));
    markProjectDirty();
    setSelectedZoomId(null);
  }

  function beginCropSelection(event: PointerEvent<HTMLDivElement>) {
    if (captureFrameMode !== "crop") {
      return;
    }
    const rect = event.currentTarget.getBoundingClientRect();
    const x = clamp((event.clientX - rect.left) / rect.width, 0, 1);
    const y = clamp((event.clientY - rect.top) / rect.height, 0, 1);
    cropStartRef.current = { x, y };
    setCropDraftRegion({ x, y, width: 0, height: 0 });
    event.currentTarget.setPointerCapture(event.pointerId);
    event.preventDefault();
  }

  function updateCropSelection(event: PointerEvent<HTMLDivElement>) {
    if (captureFrameMode !== "crop" || !cropStartRef.current) {
      return;
    }
    const rect = event.currentTarget.getBoundingClientRect();
    const x = clamp((event.clientX - rect.left) / rect.width, 0, 1);
    const y = clamp((event.clientY - rect.top) / rect.height, 0, 1);
    setCropDraftRegion(normalizeCropRegion(cropStartRef.current, { x, y }));
    event.preventDefault();
  }

  function endCropSelection(event: PointerEvent<HTMLDivElement>) {
    if (captureFrameMode !== "crop" || !cropStartRef.current) {
      return;
    }
    const rect = event.currentTarget.getBoundingClientRect();
    const x = clamp((event.clientX - rect.left) / rect.width, 0, 1);
    const y = clamp((event.clientY - rect.top) / rect.height, 0, 1);
    const nextCrop = normalizeCropRegion(cropStartRef.current, { x, y });
    cropStartRef.current = null;
    setCropRegion(nextCrop.width < 0.03 || nextCrop.height < 0.03 ? null : nextCrop);
    setCropDraftRegion(null);
    try {
      event.currentTarget.releasePointerCapture(event.pointerId);
    } catch {
      // Ignore release failures when pointer capture is unavailable.
    }
    event.preventDefault();
    markProjectDirty();
  }

  function clearCropSelection() {
    cropStartRef.current = null;
    setCropRegion(null);
    setCropDraftRegion(null);
    markProjectDirty();
  }

  function setProjectName(name: string) {
    setProject((current) => ({ ...current, name, updatedAt: new Date().toISOString() }));
    markProjectDirty();
  }

  function setBackgroundPreset(preset: ProjectFileV1["background"]["preset"]) {
    setProject((current) => ({
      ...current,
      background: { mode: "preset", preset },
      updatedAt: new Date().toISOString()
    }));
    markProjectDirty();
  }

  async function pickBackgroundImage() {
    const path = await window.desktopApi.app.pickFile(["png", "jpg", "jpeg"]);
    if (!path) {
      return;
    }
    setProject((current) => ({
      ...current,
      background: {
        mode: "custom",
        preset: current.background.preset,
        customImagePath: path
      },
      updatedAt: new Date().toISOString()
    }));
    markProjectDirty();
  }

  function setBrowserFrameVisible(visible: boolean) {
    setProject((current) => ({ ...current, includeBrowserFrame: visible, updatedAt: new Date().toISOString() }));
    markProjectDirty();
  }

  function setFrameAspect(next: FrameAspectRatio) {
    setFrameAspectRatio(next);
    markProjectDirty();
  }

  function setCaptureFrameSelection(next: CaptureFrameMode) {
    setCaptureFrameMode(next);
    if (next === "fit") {
      setCropRegion(null);
      setCropDraftRegion(null);
    }
  }

  function setLiveAutoZoom(enabled: boolean) {
    setAutoZoomOnClickWhileRecording(enabled);
    markProjectDirty();
  }

  function setSelectedSource(nextSourceId: string) {
    setSelectedSourceId(nextSourceId);
    markProjectDirty();
  }

  function openSourcePicker(nextPendingAction: PendingTrayAction = null) {
    setPendingTrayAction(nextPendingAction);
    setSourcePickerOpen(true);
  }

  function closeSourcePicker() {
    setPendingTrayAction(null);
    setSourcePickerOpen(false);
  }

  async function chooseSourceFromPicker(sourceId: string) {
    const nextSource = sources.find((source) => source.id === sourceId) ?? null;
    setSelectedSourceId(sourceId);
    setSourcePickerOpen(false);
    const nextPending = pendingTrayAction;
    setPendingTrayAction(null);
    markProjectDirty();
    if (nextPending === "record" && nextSource) {
      await startRecording(nextSource);
    }
  }

  function updateZoomBoundary(segmentId: string, edge: "start" | "end", nextMs: number) {
    const snappedNextMs = Math.max(0, Math.round(nextMs));
    setProject((current) => ({
      ...current,
      zoomSegments: current.zoomSegments.map((segment) => {
        if (segment.id !== segmentId) {
          return segment;
        }

        const nextStartMs = edge === "start" ? Math.min(snappedNextMs, segment.endMs - MIN_ZOOM_DURATION_MS) : segment.startMs;
        const nextEndMs = edge === "end" ? Math.max(snappedNextMs, segment.startMs + MIN_ZOOM_DURATION_MS) : segment.endMs;

        return normalizeSegment({
          ...segment,
          startMs: nextStartMs,
          endMs: nextEndMs
        });
      }),
      updatedAt: new Date().toISOString()
    }));
    markProjectDirty();
  }

  function seekPlayhead(nextMs: number) {
    const next = clamp(Math.round(nextMs), 0, Math.max(playheadDurationMs, 0));
    lastPreviewPlayheadRef.current = next;
    setPlayheadMs(next);
    const video = videoRef.current;
    if (video && Number.isFinite(video.duration) && video.duration > 0) {
      try {
        video.currentTime = next / 1000;
      } catch {
        // Ignore seeks before metadata is ready.
      }
    }
  }

  function jumpToStart() {
    seekPlayhead(0);
  }

  function jumpToEnd() {
    seekPlayhead(playheadDurationMs);
  }

  async function togglePlayback() {
    const video = videoRef.current;
    if (!video || !previewSourceUrl || recorderState === "recording") {
      return;
    }
    try {
      if (video.paused) {
        const requestId = ++playRequestIdRef.current;
        await video.play();
        if (playRequestIdRef.current !== requestId) {
          return;
        }
        setPlaybackState("playing");
      } else {
        playRequestIdRef.current += 1;
        video.pause();
        setPlaybackState("paused");
      }
    } catch (error) {
      if (isPlaybackInterruptionError(error)) {
        return;
      }
      setPlaybackState("paused");
      setCaptureError(formatError(error));
    }
  }

  function handlePreviewLoadedMetadata() {
    const video = videoRef.current;
    if (!video || !Number.isFinite(video.duration) || video.duration <= 0) {
      return;
    }
    const nextDuration = Math.round(video.duration * 1000);
    setRecordingDurationMs((current) => Math.max(current, nextDuration));
    setPlayheadMs((current) => {
      const nextPlayhead = clamp(current, 0, nextDuration);
      lastPreviewPlayheadRef.current = nextPlayhead;
      try {
        video.currentTime = nextPlayhead / 1000;
      } catch {
        // Ignore early seeks before the media element is seekable.
      }
      return nextPlayhead;
    });
  }

  function handlePreviewTimeUpdate() {
    const video = videoRef.current;
    if (!video) {
      return;
    }
    const nextPlayhead = Math.round(video.currentTime * 1000);
    if (nextPlayhead === lastPreviewPlayheadRef.current) {
      return;
    }
    lastPreviewPlayheadRef.current = nextPlayhead;
    setPlayheadMs(nextPlayhead);
  }

  function handlePreviewPlay() {
    if (recorderState !== "recording") {
      setPlaybackState("playing");
    }
  }

  function handlePreviewPause() {
    if (recorderState !== "recording") {
      setPlaybackState("paused");
    }
  }

  function handlePreviewEnded() {
    if (recorderState !== "recording") {
      setPlaybackState("paused");
    }
    setPlayheadMs(playheadDurationMs);
  }

  async function startExport() {
    setExportError(null);
    try {
      const job = await window.desktopApi.exportVideo.start({
        project,
        preset: createProjectExportPreset(project, frameAspectRatio)
      });
      setExportJob(job);
      if (job.status === "cancelled") {
        setExportError(null);
      }
    } catch (error) {
      setExportError(formatError(error));
    }
  }

  async function cancelExport() {
    if (!exportJob || exportJob.status !== "running") {
      return;
    }
    const cancelled = await window.desktopApi.exportVideo.cancel(exportJob.id);
    if (!cancelled) {
      setExportError("The export job was no longer running.");
    }
  }

  return {
    state: {
      project,
      sources,
      selectedSourceId,
      selectedZoomId,
      recorderState,
      sourceState,
      sourceError,
      captureError,
      saveState,
      saveError,
      playbackState,
      playheadMs,
      playheadDurationMs,
      exportJob,
      exportError,
      systemSummary,
      elapsedMs,
      frameAspectRatio,
      captureFrameMode,
      cropRegion,
      cropDraftRegion,
      autoZoomOnClickWhileRecording,
      sourcePickerOpen,
      pendingTrayAction,
      editorFocusSignal
    },
    derived: {
      selectedSource,
      selectedZoom,
      activeZoom,
      previewZoom,
      previewSourceUrl,
      canPreviewPlay,
      hasCropRegion,
      exportPreset
    },
    refs: {
      videoRef
    },
    actions: {
      refreshSources,
      createNewProject,
      openProject,
      importVideoFile,
      saveProject,
      startRecording,
      stopRecording,
      addZoomFromPreview,
      updateSelectedZoom,
      removeSelectedZoom,
      setProjectName,
      setBackgroundPreset,
      pickBackgroundImage,
      setBrowserFrameVisible,
      setFrameAspect,
      setCaptureFrameSelection,
      setLiveAutoZoom,
      openSourcePicker,
      closeSourcePicker,
      chooseSourceFromPicker,
      clearCropSelection,
      beginCropSelection,
      updateCropSelection,
      endCropSelection,
      setSelectedSourceId: setSelectedSource,
      updateZoomBoundary,
      setSelectedZoomId: focusZoom,
      seekPlayhead,
      jumpToStart,
      jumpToEnd,
      togglePlayback,
      handlePreviewLoadedMetadata,
      handlePreviewTimeUpdate,
      handlePreviewPlay,
      handlePreviewPause,
      handlePreviewEnded,
      startExport,
      cancelExport
    }
  };
}

function getFrameBounds(frameAspectRatio: FrameAspectRatio, sourceWidth: number, sourceHeight: number) {
  if (frameAspectRatio === "native") {
    return { width: sourceWidth, height: sourceHeight };
  }
  if (frameAspectRatio === "9:16") {
    return { width: 1080, height: 1920 };
  }
  if (frameAspectRatio === "1:1") {
    return { width: 1080, height: 1080 };
  }
  return { width: 1920, height: 1080 };
}
