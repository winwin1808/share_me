import { useEffect, useMemo, useRef, useState } from "react";
import type { MouseEvent } from "react";
import type { CaptureSource, ExportJob, ExportPreset, ProjectFileV1, RecordingSession, ZoomSegment } from "@shared/types";
import { createProject } from "@shared/utils/project";
import { createZoomSegment, getActiveZoom, updateSegment } from "@shared/utils/zoom";

type RecorderState = "idle" | "recording" | "stopped";
type SourceState = "loading" | "ready" | "error";
type PreviewState = "idle" | "live" | "playing" | "paused";
type SaveState = "idle" | "saving" | "saved" | "error";

const MIN_ZOOM_SCALE = 1;
const MAX_ZOOM_SCALE = 3;
const MIN_ZOOM_DURATION_MS = 120;

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function formatError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
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
  const normalized = filePath.startsWith("/") ? filePath : `/${filePath}`;
  return `file://${encodeURI(normalized)}`;
}

function createProjectFocus(project: ProjectFileV1): number {
  return project.zoomSegments[0]?.startMs ?? 0;
}

export function useDesktopStudioController() {
  const [project, setProject] = useState<ProjectFileV1>(() => createProject("Browser Capture MVP"));
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
  const [exportJob, setExportJob] = useState<ExportJob | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const [systemSummary, setSystemSummary] = useState("Loading system info...");
  const [selectedZoomId, setSelectedZoomId] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startedAtRef = useRef(0);
  const timerRef = useRef<number | null>(null);

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
  const activeZoom = useMemo(() => getActiveZoom(project.zoomSegments, playheadMs), [playheadMs, project.zoomSegments]);
  const selectedZoom = useMemo(
    () => project.zoomSegments.find((segment) => segment.id === selectedZoomId) ?? null,
    [project.zoomSegments, selectedZoomId]
  );
  const canPreviewPlay = Boolean(previewSourceUrl);

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

  function markProjectDirty(): void {
    setSaveState("idle");
    setSaveError(null);
  }

  function focusZoom(segmentId: string): void {
    setSelectedZoomId(segmentId);
    const segment = project.zoomSegments.find((item) => item.id === segmentId);
    if (segment) {
      seekPlayhead(segment.startMs);
    }
  }

  async function createNewProject() {
    detachLiveStream();
    clearRecordedPreviewUrl();
    setProject(createProject("Browser Capture MVP"));
    resetPlaybackState();
    setExportJob(null);
    setExportError(null);
    markProjectDirty();
    setCaptureError(null);
    setSourceError(null);
    setSelectedZoomId(null);
  }

  async function openProject() {
    try {
      detachLiveStream();
      const next = await window.desktopApi.project.open();
      if (next) {
        clearRecordedPreviewUrl();
        setProject(next);
        setSelectedZoomId(next.zoomSegments[0]?.id ?? null);
        setPlayheadMs(createProjectFocus(next));
        setRecordingDurationMs(next.recording?.durationMs ?? 0);
        setPlaybackState(next.recording ? "paused" : "idle");
        setSaveState("saved");
        setSaveError(null);
      }
    } catch (error) {
      setSaveState("error");
      setSaveError(formatError(error));
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

  async function startRecording() {
    if (!selectedSource) {
      setCaptureError("Select a browser source before recording.");
      return;
    }

    setCaptureError(null);
    setExportError(null);
    setExportJob(null);
    clearRecordedPreviewUrl();
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
            chromeMediaSourceId: selectedSource.id,
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
      setRecorderState("recording");
    } catch (error) {
      setPlaybackState("idle");
      setCaptureError(formatError(error));
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      setRecorderState("idle");
    }
  }

  function stopRecording() {
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
    const blob = new Blob(chunksRef.current, { type: "video/webm" });
    if (blob.size === 0) {
      setCaptureError("Recording finished with no data.");
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
      sourceId: selectedSource?.id ?? "",
      sourceType: selectedSource?.sourceType ?? "browser-window",
      sourceName: selectedSource?.name ?? "Unknown source",
      startedAt: new Date(Date.now() - durationMs).toISOString(),
      endedAt: new Date().toISOString(),
      durationMs,
      fps: 30,
      width,
      height,
      audioEnabled: false
    };

    try {
      const savedRecording = await window.desktopApi.recording.save({ data: buffer, session });
      setProject((current) => ({ ...current, recording: savedRecording, updatedAt: new Date().toISOString() }));
      markProjectDirty();
    } catch (error) {
      setSaveState("error");
      setSaveError(formatError(error));
    }
  }

  function addZoomFromPreview(event: MouseEvent<HTMLDivElement>) {
    if (recorderState !== "recording" && recorderState !== "stopped" && playbackState !== "paused" && playbackState !== "playing") {
      return;
    }
    const rect = event.currentTarget.getBoundingClientRect();
    const targetX = clamp((event.clientX - rect.left) / rect.width, 0, 1);
    const targetY = clamp((event.clientY - rect.top) / rect.height, 0, 1);
    const nextSegment = createZoomSegment(playheadMs, targetX, targetY);
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

  function seekPlayhead(nextMs: number) {
    const next = clamp(Math.round(nextMs), 0, Math.max(playheadDurationMs, 0));
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
        await video.play();
        setPlaybackState("playing");
      } else {
        video.pause();
        setPlaybackState("paused");
      }
    } catch (error) {
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
    setPlayheadMs((current) => clamp(current, 0, nextDuration));
  }

  function handlePreviewTimeUpdate() {
    const video = videoRef.current;
    if (!video) {
      return;
    }
    const nextPlayhead = Math.round(video.currentTime * 1000);
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

  async function startExport(preset: ExportPreset) {
    setExportError(null);
    try {
      const job = await window.desktopApi.exportVideo.start({ project, preset });
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
      elapsedMs
    },
    derived: {
      selectedSource,
      selectedZoom,
      activeZoom,
      previewSourceUrl,
      canPreviewPlay
    },
    refs: {
      videoRef
    },
    actions: {
      refreshSources,
      createNewProject,
      openProject,
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
      setSelectedSourceId,
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
