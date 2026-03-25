import { useMemo } from "react";
import { SplitLayout } from "./components/layout/SplitLayout";
import { SidebarSection } from "./components/layout/SidebarSection";
import { CapturePanel } from "./components/panels/CapturePanel";
import { LookPanel } from "./components/panels/LookPanel";
import { ProjectPanel } from "./components/panels/ProjectPanel";
import { SystemPanel } from "./components/panels/SystemPanel";
import { EmptyState } from "./components/ui/EmptyState";
import { StatusBadge } from "./components/ui/StatusBadge";
import { Stat } from "./components/ui/Stat";
import { PlaybackBar } from "./components/workspace/PlaybackBar";
import { PreviewViewport } from "./components/workspace/PreviewViewport";
import { TimelineRail } from "./components/workspace/TimelineRail";
import { ZoomInspector } from "./components/workspace/ZoomInspector";
import { ExportMatrix } from "./components/workspace/ExportMatrix";
import { useDesktopStudioController } from "./components/hooks/useDesktopStudioController";

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
    elapsedMs
  } = state;
  const { selectedSource, selectedZoom, activeZoom, previewSourceUrl, canPreviewPlay } = derived;
  const { videoRef } = refs;
  const { background } = project;
  const showLivePreview = recorderState === "recording";
  const renderedPreviewSourceUrl = showLivePreview ? undefined : previewSourceUrl;
  const exportReady = Boolean(project.recording) && recorderState !== "recording";
  const backgroundImageUrl =
    background.mode === "custom" && background.customImagePath ? filePathToUrl(background.customImagePath) : null;

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

  const previewBadgeTone = recorderState === "recording" ? "success" : previewSourceUrl ? "accent" : "neutral";
  const playheadTone = playbackState === "playing" ? "success" : previewSourceUrl ? "accent" : "neutral";
  const previewBadgeLabel =
    recorderState === "recording"
      ? "live"
      : playbackState === "playing"
        ? "playing"
        : playbackState === "paused"
          ? "paused"
          : previewSourceUrl
            ? "ready"
            : "empty";

  return (
    <SplitLayout
      sidebar={
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
            onRefresh={actions.refreshSources}
            onSourceChange={actions.setSelectedSourceId}
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
      }
    >
      <div className="workspace-stack">
        <section className="workspace-banner">
          <div>
            <p className="section-eyebrow">Cursorful-inspired</p>
            <h1 className="workspace-title">Browser capture editor</h1>
            <p className="workspace-copy">
              Monochrome surfaces, controlled accent colors, and a reusable component system for recording,
              zoom editing, and offline export.
            </p>
          </div>
          <div className="workspace-stats">
            <Stat label="Zooms" value={String(project.zoomSegments.length)} tone="accent" />
            <Stat label="Playhead" value={formatMs(playheadMs)} tone={playheadTone} />
            <Stat label="Preview" value={previewBadgeLabel} tone={previewSourceUrl ? "accent" : "neutral"} />
          </div>
        </section>

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

        <div className="workspace-grid">
          <PreviewViewport
            backgroundPreset={background.preset}
            backgroundImageUrl={backgroundImageUrl}
            showFrame={project.includeBrowserFrame}
            previewStyle={previewStyle}
            onClick={actions.addZoomFromPreview}
            overlay={
              <div className="preview-overlay-stack">
                <StatusBadge tone={previewBadgeTone}>{previewBadgeLabel}</StatusBadge>
                <StatusBadge tone="neutral">
                  {formatMs(playheadMs)} / {formatMs(playheadDurationMs)}
                </StatusBadge>
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
            ) : (
              <div className="preview-empty">
                <EmptyState
                  title={sourceState === "loading" ? "Loading capture sources" : "No recording yet"}
                  description={
                    sourceState === "loading"
                      ? "Scanning available browser windows and tabs."
                      : sourceState === "error"
                        ? sourceError ?? "Capture source lookup failed."
                        : "Record a browser source to unlock preview, playhead, and export."
                  }
                />
              </div>
            )}
          </PreviewViewport>

          <div className="workspace-side">
            <TimelineRail
              items={project.zoomSegments.map((segment) => ({
                id: segment.id,
                startMs: segment.startMs,
                scale: segment.scale,
                targetX: segment.targetX,
                targetY: segment.targetY
              }))}
              activeId={selectedZoomId}
              playheadMs={playheadMs}
              durationMs={playheadDurationMs}
              onSelect={actions.setSelectedZoomId}
            />

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
        </div>

        <SidebarSection eyebrow="State" title="Capture snapshot">
          <div className="snapshot-grid">
            <Stat label="Source" value={selectedSource?.name ?? sourceState} tone={selectedSource ? "accent" : "neutral"} />
            <Stat label="Frame" value={project.includeBrowserFrame ? "Visible" : "Hidden"} tone="accent" />
            <Stat label="Export" value={exportJob?.status ?? "idle"} tone="warning" />
          </div>
        </SidebarSection>
      </div>
    </SplitLayout>
  );
}
