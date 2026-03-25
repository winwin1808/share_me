import type { CaptureSource } from "@shared/types";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { EmptyState } from "../ui/EmptyState";
import { FieldShell, SelectField } from "../ui/Field";
import { Icon, IconButton } from "../ui/Icon";
import { Panel } from "../ui/Panel";
import { SegmentedControl } from "../ui/SegmentedControl";
import { StatusBadge } from "../ui/StatusBadge";

export function CapturePanel({
  sources,
  selectedSourceId,
  sourceState,
  sourceError,
  captureError,
  recorderState,
  frameAspectRatio,
  captureFrameMode,
  cropRegion,
  cropDraftRegion,
  onRefresh,
  onSourceChange,
  onFrameAspectChange,
  onCaptureFrameModeChange,
  onClearCropRegion,
  onStart,
  onStop
}: {
  sources: CaptureSource[];
  selectedSourceId: string;
  sourceState: "loading" | "ready" | "error";
  sourceError: string | null;
  captureError: string | null;
  recorderState: "idle" | "recording" | "stopped";
  frameAspectRatio: "native" | "16:9" | "9:16" | "1:1";
  captureFrameMode: "fit" | "crop";
  cropRegion: { x: number; y: number; width: number; height: number } | null;
  cropDraftRegion: { x: number; y: number; width: number; height: number } | null;
  onRefresh: () => void;
  onSourceChange: (value: string) => void;
  onFrameAspectChange: (value: "native" | "16:9" | "9:16" | "1:1") => void;
  onCaptureFrameModeChange: (value: "fit" | "crop") => void;
  onClearCropRegion: () => void;
  onStart: () => void;
  onStop: () => void;
}) {
  const selectedCrop = cropDraftRegion ?? cropRegion;

  return (
    <Panel
      eyebrow="Input"
      title="Capture"
      actions={
        <>
          <StatusBadge tone={sourceState === "error" ? "danger" : sourceState === "loading" ? "warning" : "neutral"}>
            {sourceState}
          </StatusBadge>
          <IconButton label="Refresh sources" icon="refresh" onClick={onRefresh} />
        </>
      }
    >
      {sourceState === "loading" ? (
        <EmptyState title="Loading sources" description="Scanning available window and screen inputs on this machine." />
      ) : sourceState === "error" ? (
        <EmptyState
          title="Source lookup failed"
          description={
            sourceError ??
            "Capture source lookup failed. On macOS, grant Screen Recording to the app or the process launching it."
          }
        />
      ) : sources.length === 0 ? (
        <EmptyState title="No capture sources" description="Open a browser tab, app window, or screen source, then refresh the list." />
      ) : (
        <FieldShell label="Window or screen input">
          <SelectField value={selectedSourceId} onChange={(event) => onSourceChange(event.target.value)}>
            {sources.map((source) => (
              <option key={source.id} value={source.id}>
                {source.name} ({source.sourceType})
              </option>
            ))}
          </SelectField>
        </FieldShell>
      )}

      <FieldShell label="Frame ratio">
        <SegmentedControl
          value={frameAspectRatio}
          onChange={onFrameAspectChange}
          options={[
            { value: "native", label: "Native" },
            { value: "16:9", label: "16:9" },
            { value: "9:16", label: "9:16" },
            { value: "1:1", label: "1:1" }
          ]}
        />
      </FieldShell>

      <FieldShell label="Record region" hint="Use crop mode to define the active frame before recording.">
        <div className="button-cluster">
          <Button
            type="button"
            variant={captureFrameMode === "fit" ? "accent" : "soft"}
            leading={<Icon name="frame" />}
            onClick={() => onCaptureFrameModeChange("fit")}
          >
            Fit source
          </Button>
          <Button
            type="button"
            variant={captureFrameMode === "crop" ? "accent" : "soft"}
            leading={<Icon name="crop" />}
            onClick={() => onCaptureFrameModeChange("crop")}
          >
            Crop region
          </Button>
        </div>
        <div className="panel-footer">
          <Badge tone={selectedCrop ? "accent" : "neutral"}>{selectedCrop ? "custom region" : "auto fit"}</Badge>
          {selectedCrop ? (
            <Button type="button" variant="ghost" leading={<Icon name="cancel" />} onClick={onClearCropRegion}>
              Clear
            </Button>
          ) : null}
        </div>
      </FieldShell>

      <div className="button-cluster">
        <Button
          type="button"
          variant="accent"
          leading={<Icon name="record" />}
          disabled={!selectedSourceId || recorderState === "recording"}
          onClick={onStart}
        >
          Start
        </Button>
        <Button
          type="button"
          variant="danger"
          leading={<Icon name="stop" />}
          disabled={recorderState !== "recording"}
          onClick={onStop}
        >
          Stop
        </Button>
      </div>

      <div className="panel-footer">
        <Badge tone={recorderState === "recording" ? "success" : "neutral"}>{recorderState}</Badge>
        <p className="helper-text">
          Click the preview to add zooms. In crop mode, drag a frame before recording to define the active region.
        </p>
      </div>
      {captureError && <p className="panel-error">{captureError}</p>}
    </Panel>
  );
}
