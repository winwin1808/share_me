import { useEffect, useMemo, useRef, useState } from "react";
import type { MouseEvent } from "react";
import type { CaptureSource, ExportJob, ExportPreset, ProjectFileV1, RecordingSession, ZoomSegment } from "../../../../shared/types";
import { createProject } from "../../../../shared/utils/project";
import { createZoomSegment, getActiveZoom, updateSegment } from "../../../../shared/utils/zoom";

type RecorderState = "idle" | "recording" | "stopped";

export function useDesktopStudioController() {
  const [project, setProject] = useState<ProjectFileV1>(() => createProject("Browser Capture MVP"));
  const [sources, setSources] = useState<CaptureSource[]>([]);
  const [selectedSourceId, setSelectedSourceId] = useState<string>("");
  const [recorderState, setRecorderState] = useState<RecorderState>("idle");
  const [elapsedMs, setElapsedMs] = useState(0);
  const [exportJob, setExportJob] = useState<ExportJob | null>(null);
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
  const activeZoom = useMemo(() => getActiveZoom(project.zoomSegments, elapsedMs), [project.zoomSegments, elapsedMs]);
  const selectedZoom = useMemo(
    () => project.zoomSegments.find((segment) => segment.id === selectedZoomId) ?? null,
    [project.zoomSegments, selectedZoomId]
  );

  useEffect(() => {
    void refreshSources();
    void loadSystemInfo();
    const unsubscribe = window.desktopApi.exportVideo.onProgress((job) => setExportJob({ ...job }));
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (project.zoomSegments.length > 0 && !selectedZoomId) {
      setSelectedZoomId(project.zoomSegments[0].id);
    }
    if (project.zoomSegments.length === 0) {
      setSelectedZoomId(null);
    }
  }, [project.zoomSegments, selectedZoomId]);

  async function refreshSources() {
    const nextSources = await window.desktopApi.capture.listSources();
    setSources(nextSources);
    setSelectedSourceId((current) => current || nextSources[0]?.id || "");
  }

  async function loadSystemInfo() {
    const info = await window.desktopApi.app.getSystemInfo();
    setSystemSummary(
      `${info.platform} ${info.arch} | Electron ${info.electronVersion} | signing ${
        info.signingConfigured ? "configured" : "unsigned"
      }`
    );
  }

  async function createNewProject() {
    const next = await window.desktopApi.project.create("Browser Capture MVP");
    setProject(next);
    setElapsedMs(0);
    setExportJob(null);
    setSelectedZoomId(null);
  }

  async function openProject() {
    const next = await window.desktopApi.project.open();
    if (next) {
      setProject(next);
      setElapsedMs(0);
      setSelectedZoomId(next.zoomSegments[0]?.id ?? null);
    }
  }

  async function saveProject() {
    const saved = await window.desktopApi.project.save(project);
    setProject(saved);
  }

  async function startRecording() {
    if (!selectedSource) {
      return;
    }

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
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
    }

    recorder.start(300);
    timerRef.current = window.setInterval(() => {
      setElapsedMs(performance.now() - startedAtRef.current);
    }, 100);
    setRecorderState("recording");
  }

  function stopRecording() {
    mediaRecorderRef.current?.stop();
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setRecorderState("stopped");
  }

  async function finalizeRecording() {
    const blob = new Blob(chunksRef.current, { type: "video/webm" });
    const buffer = await blob.arrayBuffer();
    const width = videoRef.current?.videoWidth ?? 1920;
    const height = videoRef.current?.videoHeight ?? 1080;

    const session: RecordingSession = {
      id: crypto.randomUUID(),
      sourceId: selectedSource?.id ?? "",
      sourceType: selectedSource?.sourceType ?? "browser-window",
      sourceName: selectedSource?.name ?? "Unknown source",
      startedAt: new Date(Date.now() - elapsedMs).toISOString(),
      endedAt: new Date().toISOString(),
      durationMs: elapsedMs,
      fps: 30,
      width,
      height,
      audioEnabled: false
    };

    const savedRecording = await window.desktopApi.recording.save({ data: buffer, session });
    setProject((current) => ({ ...current, recording: savedRecording, updatedAt: new Date().toISOString() }));
  }

  function addZoomFromPreview(event: MouseEvent<HTMLDivElement>) {
    if (recorderState !== "recording" && recorderState !== "stopped") {
      return;
    }
    const rect = event.currentTarget.getBoundingClientRect();
    const targetX = (event.clientX - rect.left) / rect.width;
    const targetY = (event.clientY - rect.top) / rect.height;
    const nextSegment = createZoomSegment(elapsedMs, targetX, targetY);
    setProject((current) => ({
      ...current,
      zoomSegments: [...current.zoomSegments, nextSegment],
      updatedAt: new Date().toISOString()
    }));
    setSelectedZoomId(nextSegment.id);
  }

  function updateSelectedZoom(patch: Partial<ZoomSegment>) {
    if (!selectedZoomId) {
      return;
    }
    setProject((current) => ({
      ...current,
      zoomSegments: updateSegment(current.zoomSegments, selectedZoomId, patch),
      updatedAt: new Date().toISOString()
    }));
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
    setSelectedZoomId(null);
  }

  function setProjectName(name: string) {
    setProject((current) => ({ ...current, name, updatedAt: new Date().toISOString() }));
  }

  function setBackgroundPreset(preset: ProjectFileV1["background"]["preset"]) {
    setProject((current) => ({
      ...current,
      background: { mode: "preset", preset },
      updatedAt: new Date().toISOString()
    }));
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
  }

  function setBrowserFrameVisible(visible: boolean) {
    setProject((current) => ({ ...current, includeBrowserFrame: visible, updatedAt: new Date().toISOString() }));
  }

  async function startExport(preset: ExportPreset) {
    const job = await window.desktopApi.exportVideo.start({ project, preset });
    setExportJob(job);
  }

  return {
    state: {
      project,
      sources,
      selectedSourceId,
      recorderState,
      elapsedMs,
      exportJob,
      systemSummary,
      selectedZoomId
    },
    derived: {
      selectedSource,
      selectedZoom,
      activeZoom
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
      setSelectedZoomId,
      startExport
    }
  };
}
