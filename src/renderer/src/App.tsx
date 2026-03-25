import { useMemo } from "react";
import { SplitLayout } from "./components/layout/SplitLayout";
import { SidebarSection } from "./components/layout/SidebarSection";
import { CapturePanel } from "./components/panels/CapturePanel";
import { LookPanel } from "./components/panels/LookPanel";
import { ProjectPanel } from "./components/panels/ProjectPanel";
import { SystemPanel } from "./components/panels/SystemPanel";
import { StatusBadge } from "./components/ui/StatusBadge";
import { Stat } from "./components/ui/Stat";
import { PreviewViewport } from "./components/workspace/PreviewViewport";
import { TimelineRail } from "./components/workspace/TimelineRail";
import { ZoomInspector } from "./components/workspace/ZoomInspector";
import { ExportMatrix } from "./components/workspace/ExportMatrix";
import { useDesktopStudioController } from "./components/hooks/useDesktopStudioController";

export function App() {
  const { state, derived, refs, actions } = useDesktopStudioController();
  const { project, sources, selectedSourceId, recorderState, elapsedMs, exportJob, systemSummary } = state;
  const { selectedSource, selectedZoom, activeZoom } = derived;
  const { videoRef } = refs;
  const { background } = project;

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

  return (
    <SplitLayout
      sidebar={
        <div className="sidebar-stack">
          <SystemPanel summary={systemSummary} />
          <ProjectPanel
            projectName={project.name}
            onProjectNameChange={actions.setProjectName}
            onSave={actions.saveProject}
            onNew={actions.createNewProject}
            onOpen={actions.openProject}
          />
          <CapturePanel
            sources={sources}
            selectedSourceId={selectedSourceId}
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
            <Stat label="Recording" value={recorderState} tone={recorderState === "recording" ? "success" : "neutral"} />
            <Stat label="Elapsed" value={`${Math.round(elapsedMs)} ms`} tone="warning" />
          </div>
        </section>

        <div className="workspace-grid">
          <PreviewViewport
            backgroundPreset={background.preset}
            showFrame={project.includeBrowserFrame}
            previewStyle={previewStyle}
            onClick={actions.addZoomFromPreview}
              overlay={
              activeZoom && (
                <div className="preview-overlay">
                  <StatusBadge tone="accent">x{activeZoom.scale.toFixed(1)}</StatusBadge>
                  <span>
                    {Math.round(activeZoom.targetX * 100)} / {Math.round(activeZoom.targetY * 100)}
                  </span>
                </div>
              )
            }
          >
            <video ref={videoRef} playsInline muted controls={recorderState !== "recording"} />
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
              activeId={state.selectedZoomId}
              onSelect={actions.setSelectedZoomId}
            />

            <ZoomInspector segment={selectedZoom} onChange={actions.updateSelectedZoom} onRemove={actions.removeSelectedZoom} />

            <ExportMatrix
              presets={project.exportPresets}
              recordingReady={Boolean(project.recording)}
              status={exportJob?.status ?? null}
              progress={exportJob?.progress ?? 0}
              outputPath={exportJob?.outputPath}
              error={exportJob?.error}
              onExport={actions.startExport}
            />
          </div>
        </div>

        <SidebarSection eyebrow="State" title="Capture snapshot">
          <div className="snapshot-grid">
            <Stat label="Source" value={selectedSource?.name ?? "None"} tone="neutral" />
            <Stat label="Frame" value={project.includeBrowserFrame ? "Visible" : "Hidden"} tone="accent" />
            <Stat label="Export" value={exportJob?.status ?? "idle"} tone="warning" />
          </div>
        </SidebarSection>
      </div>
    </SplitLayout>
  );
}
