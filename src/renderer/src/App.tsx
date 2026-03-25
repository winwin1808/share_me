import { useMemo } from "react";
import { CapturePanel } from "./components/panels/CapturePanel";
import { LookPanel } from "./components/panels/LookPanel";
import { ProjectPanel } from "./components/panels/ProjectPanel";
import { SystemPanel } from "./components/panels/SystemPanel";
import { EmptyState } from "./components/ui/EmptyState";
import { StatusBadge } from "./components/ui/StatusBadge";
import { Stat } from "./components/ui/Stat";
import { Button } from "./components/ui/Button";
import { Icon, IconButton } from "./components/ui/Icon";
import { PlaybackBar } from "./components/workspace/PlaybackBar";
import { PreviewViewport } from "./components/workspace/PreviewViewport";
import { TimelineRail } from "./components/workspace/TimelineRail";
import { ZoomInspector } from "./components/workspace/ZoomInspector";
import { ExportMatrix } from "./components/workspace/ExportMatrix";
import { useDesktopStudioController } from "./components/hooks/useDesktopStudioController";

const FRAME_RATIO_LABELS: Record<"native" | "16:9" | "9:16" | "1:1", string> = {
  native: "native",
  "16:9": "16:9",
  "9:16": "9:16",
  "1:1": "1:1"
};

const FRAME_RATIO_CSS: Record<"native" | "16:9" | "9:16" | "1:1", string | undefined> = {
  native: undefined,
  "16:9": "16 / 9",
  "9:16": "9 / 16",
  "1:1": "1 / 1"
};

function formatMs(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, "0");
  const seconds = (totalSeconds % 60).toString().padStart(2, "0");
  return `${minutes}:${seconds}`;
}

function filePathToUrl(filePath: string): string {
  const normalized = filePath.startsWith("/") ? filePath : `/${filePath}`;
  return `file://${encodeURI(normalized)}`;
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
    systemSummary,
    frameAspectRatio,
    captureFrameMode,
    cropRegion,
    cropDraftRegion
  } = state;
  const { selectedSource, selectedZoom, activeZoom, previewSourceUrl, canPreviewPlay, hasCropRegion } = derived;
  const { videoRef } = refs;
  const { background } = project;

  const showLivePreview = recorderState === "recording";
  const renderedPreviewSourceUrl = showLivePreview ? undefined : previewSourceUrl;
  const sourceThumbnailUrl = selectedSource?.thumbnailDataUrl;
  const exportReady = Boolean(project.recording) && recorderState !== "recording";
  const backgroundImageUrl =
    background.mode === "custom" && background.customImagePath ? filePathToUrl(background.customImagePath) : null;
  const previewAspect = FRAME_RATIO_CSS[frameAspectRatio] ?? (selectedSource?.width && selectedSource?.height ? `${selectedSource.width} / ${selectedSource.height}` : "16 / 9");
  const activeCropRegion = cropDraftRegion ?? cropRegion;

  const previewStyle = useMemo(
    () =>
      activeZoom
        ? {
            transform: `scale(${activeZoom.scale}) translate(${(0.5 - activeZoom.targetX) * 40}%, ${(0.5 - activeZoom.targetY) * 40}%)`,
            transformOrigin: `${activeZoom.targetX * 100}% ${activeZoom.targetY * 100}%`
          }
        : undefined,
    [activeZoom]
  );

  const timelineItems = project.zoomSegments.map((segment, index) => ({
    id: segment.id,
    startMs: segment.startMs,
    endMs: segment.endMs,
    scale: segment.scale,
    targetX: segment.targetX,
    targetY: segment.targetY
  }));

  return (
    <div className="app-shell">
      <header className="app-topbar ui-surface ui-surface-raised">
        <div className="topbar-brand">
          <div className="topbar-mark">C</div>
          <div>
            <p className="section-eyebrow">Glass ant desktop</p>
            <h1 className="topbar-title">Cursorful MVP</h1>
          </div>
        </div>
        <div className="topbar-status">
          <StatusBadge tone="accent">{FRAME_RATIO_LABELS[frameAspectRatio]}</StatusBadge>
          <StatusBadge tone={captureFrameMode === "crop" ? "warning" : "neutral"}>
            {captureFrameMode === "crop" ? (hasCropRegion ? "custom region" : "select region") : "fit source"}
          </StatusBadge>
          <StatusBadge tone={recorderState === "recording" ? "success" : sourceState === "error" ? "danger" : "neutral"}>
            {sourceState === "loading" ? "scanning" : sourceState === "error" ? "blocked" : selectedSource ? "source ready" : "idle"}
          </StatusBadge>
        </div>
        <div className="topbar-actions">
          <IconButton label="Refresh sources" icon="refresh" onClick={actions.refreshSources} />
          <IconButton label="New project" icon="add" onClick={actions.createNewProject} />
          <IconButton label="Open project" icon="folder-open" onClick={actions.openProject} />
          <Button type="button" variant="accent" leading={<Icon name="save" />} onClick={actions.saveProject} disabled={saveState === "saving"}>
            Save
          </Button>
        </div>
      </header>

      <aside className="app-sidebar">
        <div className="sidebar-stack">
          <SystemPanel summary={systemSummary} />
          <ProjectPanel
            projectName={project.name}
            saveState={saveState}
            saveError={saveError}
            onProjectNameChange={actions.setProjectName}
            onSave={actions.saveProject}
            onNew={actions.createNewProject}
            onOpen={actions.openProject}
          />
          <CapturePanel
            sources={sources}
            selectedSourceId={selectedSourceId}
            sourceState={sourceState}
            sourceError={sourceError}
            captureError={captureError}
            recorderState={recorderState}
            frameAspectRatio={frameAspectRatio}
            captureFrameMode={captureFrameMode}
            cropRegion={cropRegion}
            cropDraftRegion={cropDraftRegion}
            onRefresh={actions.refreshSources}
            onSourceChange={actions.setSelectedSourceId}
            onFrameAspectChange={actions.setFrameAspect}
            onCaptureFrameModeChange={actions.setCaptureFrameSelection}
            onClearCropRegion={actions.clearCropSelection}
            onStart={actions.startRecording}
            onStop={actions.stopRecording}
          />
          <LookPanel
            background={background.preset}
            browserFrameVisible={project.includeBrowserFrame}
            onBackgroundChange={actions.setBackgroundPreset}
            onPickBackgroundImage={actions.pickBackgroundImage}
            onToggleBrowserFrame={actions.setBrowserFrameVisible}
          />
        </div>
      </aside>

      <main className="app-workspace">
        <div className="workspace-stack">
          <div className="workspace-banner ui-surface ui-surface-raised">
            <div>
              <p className="section-eyebrow">Recording workspace</p>
              <h2 className="workspace-title">Preview, then edit on the same surface</h2>
              <p className="workspace-copy">
                Light glass surfaces, Ant-like hierarchy, and compact controls tuned so the full editor fits on one screen.
              </p>
            </div>
            <div className="workspace-stats">
              <Stat label="Zooms" value={String(project.zoomSegments.length)} tone="accent" />
              <Stat label="Playhead" value={formatMs(playheadMs)} tone={playbackState === "playing" ? "success" : "neutral"} />
              <Stat label="Frame" value={FRAME_RATIO_LABELS[frameAspectRatio]} tone="neutral" />
            </div>
          </div>

          <PlaybackBar
            previewState={recorderState === "recording" ? "live" : playbackState}
            playheadMs={playheadMs}
            durationMs={playheadDurationMs}
            canPlay={canPreviewPlay && recorderState !== "recording"}
            onTogglePlayback={actions.togglePlayback}
            onSeek={actions.seekPlayhead}
            onJumpToStart={actions.jumpToStart}
            onJumpToEnd={actions.jumpToEnd}
          />

          <PreviewViewport
            backgroundPreset={background.preset}
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
                <StatusBadge tone={recorderState === "recording" ? "success" : "accent"}>
                  {recorderState === "recording" ? "live" : previewSourceUrl ? "ready" : "empty"}
                </StatusBadge>
                <StatusBadge tone="neutral">
                  {formatMs(playheadMs)} / {formatMs(playheadDurationMs)}
                </StatusBadge>
                <StatusBadge tone={captureFrameMode === "crop" ? "warning" : "neutral"}>{FRAME_RATIO_LABELS[frameAspectRatio]}</StatusBadge>
                {activeZoom && (
                  <div className="preview-overlay">
                    <StatusBadge tone="accent">x{activeZoom.scale.toFixed(1)}</StatusBadge>
                    <span>
                      {Math.round(activeZoom.targetX * 100)} / {Math.round(activeZoom.targetY * 100)}
                    </span>
                  </div>
                )}
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
                        : "Select a source, lock the frame, optionally crop it, then record to unlock preview, playhead, and export."
                  }
                />
              </div>
            )}
          </PreviewViewport>

          <TimelineRail
            items={timelineItems}
            activeId={selectedZoomId}
            playheadMs={playheadMs}
            durationMs={playheadDurationMs}
            onSelect={actions.setSelectedZoomId}
            onResize={actions.updateZoomBoundary}
          />
        </div>
      </main>

      <aside className="app-inspector">
        <div className="workspace-side">
          <ZoomInspector segment={selectedZoom} onChange={actions.updateSelectedZoom} onRemove={actions.removeSelectedZoom} />

          <ExportMatrix
            presets={project.exportPresets}
            recordingReady={exportReady}
            status={exportJob?.status ?? null}
            progress={exportJob?.progress ?? 0}
            outputPath={exportJob?.outputPath}
            error={exportError ?? exportJob?.error}
            onExport={actions.startExport}
            onCancel={actions.cancelExport}
          />
        </div>
      </aside>
    </div>
  );
}
