import { useEffect, useMemo, useState } from "react";
import type { FrameAspectRatio, ProjectFileV1 } from "@shared/types";
import { useDesktopStudioController } from "./components/hooks/useDesktopStudioController";
import { Button } from "./components/ui/Button";
import { EmptyState } from "./components/ui/EmptyState";
import { FieldShell, SelectField, TextField } from "./components/ui/Field";
import { Icon, IconButton } from "./components/ui/Icon";
import { Modal } from "./components/ui/Modal";
import { StatusBadge } from "./components/ui/StatusBadge";
import { Tooltip } from "./components/ui/Tooltip";
import { PlaybackBar } from "./components/workspace/PlaybackBar";
import { PreviewViewport } from "./components/workspace/PreviewViewport";
import { TimelineRail } from "./components/workspace/TimelineRail";
import { ZoomInspector } from "./components/workspace/ZoomInspector";

const FRAME_RATIO_LABELS: Record<FrameAspectRatio, string> = {
  native: "Native",
  "16:9": "16:9",
  "9:16": "9:16",
  "1:1": "1:1"
};

function filePathToUrl(filePath: string): string {
  return `shareme-file://local${encodeURI(filePath)}`;
}

function formatMs(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, "0");
  const seconds = (totalSeconds % 60).toString().padStart(2, "0");
  return `${minutes}:${seconds}`;
}

function formatSourceLabel(label: string): string {
  return label.length > 28 ? `${label.slice(0, 28)}...` : label;
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  const tagName = target.tagName;
  return (
    tagName === "INPUT" ||
    tagName === "TEXTAREA" ||
    tagName === "SELECT" ||
    target.isContentEditable ||
    Boolean(target.closest("[contenteditable='true']"))
  );
}

function getPreviewAspect(frameAspectRatio: FrameAspectRatio, width?: number, height?: number) {
  if (frameAspectRatio === "native" && width && height) {
    return `${width} / ${height}`;
  }
  if (frameAspectRatio === "9:16") {
    return "9 / 16";
  }
  if (frameAspectRatio === "1:1") {
    return "1 / 1";
  }
  return "16 / 9";
}

function getRatioLabel(frameAspectRatio: FrameAspectRatio): string {
  return frameAspectRatio === "native" ? "Native" : frameAspectRatio;
}

export function App() {
  const { state, derived, refs, actions } = useDesktopStudioController();
  const {
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
    frameAspectRatio,
    captureFrameMode,
    cropRegion,
    cropDraftRegion,
    autoZoomOnClickWhileRecording,
    sourcePickerOpen,
    pendingTrayAction,
    editorFocusSignal
  } = state;
  const { selectedSource, selectedZoom, activeZoom, previewZoom, previewSourceUrl, canPreviewPlay, exportPreset } = derived;
  const { videoRef } = refs;

  const [projectModalOpen, setProjectModalOpen] = useState(false);
  const [lookModalOpen, setLookModalOpen] = useState(false);
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [zoomDrawerOpen, setZoomDrawerOpen] = useState(false);
  const [editorFocusedFromTray, setEditorFocusedFromTray] = useState(false);

  const showLivePreview = recorderState === "recording";
  const renderedPreviewSourceUrl = showLivePreview ? undefined : previewSourceUrl;
  const sourceThumbnailUrl = selectedSource?.thumbnailDataUrl;
  const exportReady = Boolean(project.recording) && recorderState !== "recording";
  const backgroundImageUrl =
    project.background.mode === "custom" && project.background.customImagePath ? filePathToUrl(project.background.customImagePath) : null;
  const previewAspect = getPreviewAspect(
    frameAspectRatio,
    project.recording?.frameBounds?.width ?? selectedSource?.width,
    project.recording?.frameBounds?.height ?? selectedSource?.height
  );

  const previewStyle = useMemo(
    () => ({
      transform: `scale(${previewZoom.scale}) translate(${(0.5 - previewZoom.targetX) * 40}%, ${(0.5 - previewZoom.targetY) * 40}%)`,
      transformOrigin: `${previewZoom.targetX * 100}% ${previewZoom.targetY * 100}%`
    }),
    [previewZoom.scale, previewZoom.targetX, previewZoom.targetY]
  );

  const timelineItems = useMemo(
    () =>
      project.zoomSegments.map((segment) => ({
        id: segment.id,
        startMs: segment.startMs,
        endMs: segment.endMs,
        scale: segment.scale,
        targetX: segment.targetX,
        targetY: segment.targetY
      })),
    [project.zoomSegments]
  );

  const sourceStatusTone =
    sourceState === "error" ? "danger" : sourceState === "loading" ? "warning" : selectedSource ? "success" : "neutral";
  const saveStateLabel = saveState === "saving" ? "Saving..." : saveState === "saved" ? "Saved" : saveState === "error" ? "Save failed" : null;

  async function handleImportVideo(): Promise<void> {
    await actions.importVideoFile();
    setProjectModalOpen(false);
  }

  useEffect(() => {
    if (editorFocusSignal === 0) {
      return;
    }
    setEditorFocusedFromTray(true);
    const timeout = window.setTimeout(() => setEditorFocusedFromTray(false), 1600);
    return () => window.clearTimeout(timeout);
  }, [editorFocusSignal]);

  useEffect(() => {
    if (exportJob?.status === "completed") {
      setExportModalOpen(false);
    }
  }, [exportJob?.status]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.defaultPrevented || isEditableTarget(event.target)) {
        return;
      }

      const hasModalOpen = projectModalOpen || lookModalOpen || exportModalOpen || sourcePickerOpen;
      const key = event.key;
      const lowerKey = key.toLowerCase();

      if ((event.metaKey || event.ctrlKey) && lowerKey === "s") {
        event.preventDefault();
        void actions.saveProject();
        return;
      }

      if (hasModalOpen) {
        if (key === "Escape") {
          event.preventDefault();
          if (sourcePickerOpen) {
            actions.closeSourcePicker();
          } else if (exportModalOpen) {
            setExportModalOpen(false);
          } else if (lookModalOpen) {
            setLookModalOpen(false);
          } else if (projectModalOpen) {
            setProjectModalOpen(false);
          }
        }
        return;
      }

      if (key === " ") {
        event.preventDefault();
        if (recorderState === "recording") {
          actions.stopRecording();
        } else if (canPreviewPlay) {
          void actions.togglePlayback();
        } else if (selectedSourceId) {
          void actions.startRecording();
        }
        return;
      }

      if (key === "ArrowLeft") {
        event.preventDefault();
        actions.jumpToStart();
        return;
      }

      if (key === "ArrowRight") {
        event.preventDefault();
        actions.jumpToEnd();
        return;
      }

      if (lowerKey === "r" && !event.metaKey && !event.ctrlKey) {
        event.preventDefault();
        if (recorderState === "recording") {
          actions.stopRecording();
        } else if (selectedSourceId) {
          void actions.startRecording();
        }
        return;
      }

      if (lowerKey === "e" && !event.metaKey && !event.ctrlKey) {
        if (!exportReady) {
          return;
        }
        event.preventDefault();
        setExportModalOpen(true);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    actions,
    canPreviewPlay,
    exportModalOpen,
    exportReady,
    lookModalOpen,
    projectModalOpen,
    recorderState,
    selectedSourceId,
    sourcePickerOpen
  ]);

  return (
    <>
      <div className="app-shell app-shell-compact app-shell-ratio-locked" data-layout="ratio-locked">
        <header className="app-topbar ui-surface ui-surface-raised">
          <div className="topbar-controls">
            <div className="topbar-control-strip">
              <label className="topbar-control topbar-control-source" aria-label="Capture source">
                <select
                  className="topbar-select"
                  aria-label="Capture source"
                  value={selectedSourceId}
                  onChange={(event) => actions.setSelectedSourceId(event.target.value)}
                >
                  {sources.length === 0 ? <option value="">No source</option> : null}
                  {sources.map((source) => (
                    <option key={source.id} value={source.id}>
                      {formatSourceLabel(source.name)}
                    </option>
                  ))}
                </select>
              </label>

              <label className="topbar-control" aria-label="Frame aspect ratio">
                <select
                  className="topbar-select"
                  aria-label="Frame aspect ratio"
                  value={frameAspectRatio}
                  onChange={(event) => actions.setFrameAspect(event.target.value as FrameAspectRatio)}
                >
                  {Object.entries(FRAME_RATIO_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="topbar-control" aria-label="Capture region mode">
                <select
                  className="topbar-select"
                  aria-label="Capture region mode"
                  value={captureFrameMode}
                  onChange={(event) => actions.setCaptureFrameSelection(event.target.value as "fit" | "crop")}
                >
                  <option value="fit">Fit source</option>
                  <option value="crop">Select region</option>
                </select>
              </label>

            </div>

            <Tooltip content={sourceError ?? (selectedSource ? "Source ready" : "No source")}>
              <span className="topbar-status-chip">
                <span className={`topbar-status-dot is-${sourceStatusTone}`} />
              </span>
            </Tooltip>
          </div>

          <div className="topbar-actions">
            <Tooltip
              content={
                autoZoomOnClickWhileRecording ? "Disable live click zoom follow cursor" : "Enable live click zoom follow cursor"
              }
            >
              <IconButton
                className="topbar-action-button"
                label={autoZoomOnClickWhileRecording ? "Disable live click zoom follow cursor" : "Enable live click zoom follow cursor"}
                icon="focus"
                tone={autoZoomOnClickWhileRecording ? "accent" : "soft"}
                aria-pressed={autoZoomOnClickWhileRecording}
                onClick={() => actions.setLiveAutoZoom(!autoZoomOnClickWhileRecording)}
              />
            </Tooltip>
            <Tooltip content="Refresh sources">
              <IconButton className="topbar-action-button" label="Refresh sources" icon="refresh" onClick={actions.refreshSources} />
            </Tooltip>
            <Tooltip content={recorderState === "recording" ? "Recording in progress" : "Start recording (R or Space)"}>
              <Button
                type="button"
                variant="accent"
                className="topbar-action-button topbar-priority-button"
                leading={<Icon name="record" />}
                disabled={!selectedSourceId || recorderState === "recording"}
                onClick={() => void actions.startRecording()}
              >
                Record
              </Button>
            </Tooltip>
            <Tooltip content="Stop recording (R or Space)">
              <Button
                type="button"
                variant="danger"
                className="topbar-action-button topbar-priority-button"
                leading={<Icon name="stop" />}
                disabled={recorderState !== "recording"}
                onClick={actions.stopRecording}
              >
                Stop
              </Button>
            </Tooltip>
          </div>
        </header>

        <main className="app-workspace app-workspace-compact app-workspace-ratio-locked">
          <div
            className={`editor-canvas-shell ${editorFocusedFromTray ? "is-tray-focused" : ""}`.trim()}
            data-editor-aspect={previewAspect}
          >
            <PreviewViewport
              backgroundPreset={project.background.preset}
              backgroundImageUrl={backgroundImageUrl}
              showFrame={project.includeBrowserFrame}
              frameAspectRatio={previewAspect}
              cropRegion={cropRegion}
              cropDraftRegion={cropDraftRegion}
              captureFrameMode={captureFrameMode}
              previewStyle={previewStyle}
              onClick={captureFrameMode === "crop" ? undefined : actions.addZoomFromPreview}
              onPointerDown={captureFrameMode === "crop" ? actions.beginCropSelection : undefined}
              onPointerMove={captureFrameMode === "crop" ? actions.updateCropSelection : undefined}
              onPointerUp={captureFrameMode === "crop" ? actions.endCropSelection : undefined}
              overlay={
                <div className="preview-overlay-stack">
                  <div className="preview-overlay">
                    <StatusBadge tone={recorderState === "recording" ? "success" : "accent"}>
                      {recorderState === "recording" ? "Live" : renderedPreviewSourceUrl ? "Playback" : "Preview"}
                    </StatusBadge>
                    <span>{formatMs(playheadMs)}</span>
                    {activeZoom ? <span>x{previewZoom.scale.toFixed(2)}</span> : null}
                    {showLivePreview && autoZoomOnClickWhileRecording ? <span>Click to zoom + follow</span> : null}
                  </div>
                </div>
              }
            >
              {showLivePreview ? (
                <video
                  ref={videoRef}
                  playsInline
                  muted
                  controls={false}
                  onLoadedMetadata={actions.handlePreviewLoadedMetadata}
                  onTimeUpdate={actions.handlePreviewTimeUpdate}
                  onPlay={actions.handlePreviewPlay}
                  onPause={actions.handlePreviewPause}
                  onEnded={actions.handlePreviewEnded}
                />
              ) : renderedPreviewSourceUrl ? (
                <video
                  ref={videoRef}
                  src={renderedPreviewSourceUrl}
                  playsInline
                  muted
                  controls={false}
                  onLoadedMetadata={actions.handlePreviewLoadedMetadata}
                  onTimeUpdate={actions.handlePreviewTimeUpdate}
                  onPlay={actions.handlePreviewPlay}
                  onPause={actions.handlePreviewPause}
                  onEnded={actions.handlePreviewEnded}
                />
              ) : sourceThumbnailUrl ? (
                <img src={sourceThumbnailUrl} alt={selectedSource?.name ?? "Selected capture source"} />
              ) : (
                <div className="preview-empty">
                  <EmptyState
                    title={sourceState === "loading" ? "Loading capture sources" : "No recording yet"}
                    description={
                      sourceState === "loading"
                        ? "Scanning available window and screen inputs."
                        : sourceState === "error"
                          ? sourceError ?? "Capture source lookup failed."
                          : "Select a source, choose frame + region, then record."
                    }
                  />
                </div>
              )}
            </PreviewViewport>

            <div className="editor-timeline-frame" data-editor-timeline="unified">
              <PlaybackBar
                previewState={recorderState === "recording" ? "live" : playbackState}
                playheadMs={playheadMs}
                durationMs={playheadDurationMs}
                canPlay={canPreviewPlay && recorderState !== "recording"}
                onTogglePlayback={actions.togglePlayback}
                onJumpToStart={actions.jumpToStart}
                onJumpToEnd={actions.jumpToEnd}
                actions={
                  <>
                    <Tooltip content="Project">
                      <IconButton label="Edit project" icon="edit" onClick={() => setProjectModalOpen(true)} />
                    </Tooltip>
                    <Tooltip content="Look">
                      <IconButton label="Open look settings" icon="background" onClick={() => setLookModalOpen(true)} />
                    </Tooltip>
                    <Tooltip content="Timeline & zoom">
                      <IconButton
                        className="inspector-toggle-button"
                        label="Open zoom panel"
                        icon="timeline"
                        onClick={() => setZoomDrawerOpen(true)}
                      />
                    </Tooltip>
                    <Tooltip content="Export">
                      <Button
                        type="button"
                        variant="accent"
                        iconOnly
                        className="timeline-export-button"
                        aria-label="Export"
                        leading={<Icon name="export" />}
                        onClick={() => setExportModalOpen(true)}
                      />
                    </Tooltip>
                  </>
                }
              />
              <TimelineRail
                items={timelineItems}
                activeId={selectedZoomId}
                playheadMs={playheadMs}
                durationMs={playheadDurationMs}
                onSelect={actions.setSelectedZoomId}
                onSeek={actions.seekPlayhead}
                onResize={actions.updateZoomBoundary}
              />
            </div>
          </div>
        </main>

        <aside className="app-inspector app-inspector-compact">
          <ZoomInspector segment={selectedZoom} onChange={actions.updateSelectedZoom} onRemove={actions.removeSelectedZoom} />
          {captureError || exportError || saveError ? (
            <div className="inline-alert">
              <Icon name="warning" />
              <span>{captureError ?? exportError ?? saveError}</span>
            </div>
          ) : null}
        </aside>
      </div>

      <Modal
        title="Select input"
        open={sourcePickerOpen}
        onClose={actions.closeSourcePicker}
        actions={
          <StatusBadge tone={pendingTrayAction === "record" ? "accent" : "neutral"}>
            {pendingTrayAction === "record" ? "Choose a source to record" : "Choose a source"}
          </StatusBadge>
        }
      >
        {sources.length === 0 ? (
          <EmptyState
            title="No source available"
            description={sourceError ?? "Refresh sources or grant screen recording permission, then try again."}
          />
        ) : (
          <div className="source-picker-grid">
            {sources.map((source) => {
              const iconName = source.sourceType === "screen" ? "screen" : source.sourceType === "tab" ? "tab" : "window";
              const selected = source.id === selectedSourceId;
              return (
                <button
                  key={source.id}
                  type="button"
                  className={`source-picker-tile ${selected ? "is-active" : ""}`.trim()}
                  onClick={() => void actions.chooseSourceFromPicker(source.id)}
                >
                  <span className="source-picker-icon" aria-hidden="true">
                    <Icon name={iconName} />
                  </span>
                  <span className="source-picker-copy">
                    <strong>{source.name}</strong>
                    <span>{source.sourceType}</span>
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </Modal>

      <Modal
        title="Project"
        open={projectModalOpen}
        onClose={() => setProjectModalOpen(false)}
        actions={
          <>
            <Tooltip content="New project">
              <IconButton label="New project" icon="add" onClick={actions.createNewProject} />
            </Tooltip>
            <Tooltip content="Open project file">
              <IconButton label="Open project" icon="folder-open" onClick={actions.openProject} />
            </Tooltip>
            <Tooltip content="Import video (.mp4, .mov)">
              <IconButton label="Import video" icon="play" onClick={() => void handleImportVideo()} />
            </Tooltip>
          </>
        }
      >
        <div className="modal-grid">
          <FieldShell label="Project name">
            <TextField value={project.name} onChange={(event) => actions.setProjectName(event.target.value)} />
          </FieldShell>
          <div className="modal-button-row">
            <Tooltip content="Save project (Cmd/Ctrl+S)">
              <Button type="button" variant="accent" leading={<Icon name="save" />} onClick={actions.saveProject} disabled={saveState === "saving"}>
                Save
              </Button>
            </Tooltip>
          </div>
          <div className="modal-meta-row">
            {saveStateLabel ? (
              <StatusBadge tone={saveState === "error" ? "danger" : saveState === "saved" ? "success" : "neutral"}>
                {saveStateLabel}
              </StatusBadge>
            ) : (
              <span />
            )}
            {saveError ? <p className="panel-error">{saveError}</p> : null}
          </div>
        </div>
      </Modal>

      <Modal
        title="Look"
        open={lookModalOpen}
        onClose={() => setLookModalOpen(false)}
        actions={<IconButton label="Pick background image" icon="background" onClick={actions.pickBackgroundImage} />}
      >
        <div className="modal-grid">
          <FieldShell label="Background">
            <SelectField
              value={project.background.preset}
              onChange={(event) => actions.setBackgroundPreset(event.target.value as ProjectFileV1["background"]["preset"])}
            >
              <option value="slate">Slate</option>
              <option value="ocean">Ocean</option>
              <option value="sunset">Sunset</option>
            </SelectField>
          </FieldShell>
          <div className="modal-button-row">
            <Button type="button" variant="soft" leading={<Icon name="background" />} onClick={actions.pickBackgroundImage}>
              Custom image
            </Button>
            <Button
              type="button"
              variant={project.includeBrowserFrame ? "accent" : "soft"}
              leading={<Icon name="frame" />}
              onClick={() => actions.setBrowserFrameVisible(!project.includeBrowserFrame)}
            >
              {project.includeBrowserFrame ? "Hide frame" : "Show frame"}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        title="Export"
        open={exportModalOpen}
        onClose={() => setExportModalOpen(false)}
        actions={exportReady ? <StatusBadge tone="neutral">{getRatioLabel(exportPreset.aspectRatio)}</StatusBadge> : undefined}
      >
        {!exportReady ? (
          <EmptyState title="Record first" description="Finish a local recording before exporting." />
        ) : (
          <div className="modal-grid">
            <p className="helper-text">Do you want to export this video now?</p>
            <div className="modal-button-row">
              <Button type="button" variant="ghost" onClick={() => setExportModalOpen(false)} disabled={exportJob?.status === "running"}>
                Cancel
              </Button>
              <Button
                type="button"
                variant="accent"
                leading={<Icon name="export" />}
                disabled={!exportReady || exportJob?.status === "running"}
                onClick={() => void actions.startExport()}
              >
                Export
              </Button>
            </div>
            {exportJob?.status === "running" ? (
              <Button type="button" variant="ghost" leading={<Icon name="cancel" />} onClick={actions.cancelExport}>
                Cancel export
              </Button>
            ) : null}
            {exportJob ? (
              <div className="progress-shell">
                <div className="progress-bar">
                  <span style={{ width: `${Math.round((exportJob.progress ?? 0) * 100)}%` }} />
                </div>
                <p className="helper-text">{exportError ?? exportJob.outputPath ?? "Preparing export..."}</p>
              </div>
            ) : null}
          </div>
        )}
      </Modal>

      <Modal title="Zoom" open={zoomDrawerOpen} variant="drawer" onClose={() => setZoomDrawerOpen(false)}>
        <ZoomInspector segment={selectedZoom} onChange={actions.updateSelectedZoom} onRemove={actions.removeSelectedZoom} />
        {captureError || exportError || saveError ? (
          <div className="inline-alert">
            <Icon name="warning" />
            <span>{captureError ?? exportError ?? saveError}</span>
          </div>
        ) : null}
      </Modal>
    </>
  );
}
