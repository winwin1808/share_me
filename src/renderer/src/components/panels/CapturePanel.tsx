import type { CaptureSource } from "@shared/types";
import { EmptyState } from "../ui/EmptyState";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { FieldShell, SelectField } from "../ui/Field";
import { Panel } from "../ui/Panel";
import { StatusBadge } from "../ui/StatusBadge";

export function CapturePanel({
  sources,
  selectedSourceId,
  sourceState,
  sourceError,
  captureError,
  recorderState,
  onRefresh,
  onSourceChange,
  onStart,
  onStop
}: {
  sources: CaptureSource[];
  selectedSourceId: string;
  sourceState: "loading" | "ready" | "error";
  sourceError: string | null;
  captureError: string | null;
  recorderState: "idle" | "recording" | "stopped";
  onRefresh: () => void;
  onSourceChange: (value: string) => void;
  onStart: () => void;
  onStop: () => void;
}) {
  return (
    <Panel
      eyebrow="Input"
      title="Capture"
      actions={
        <>
          <StatusBadge tone={sourceState === "error" ? "danger" : sourceState === "loading" ? "warning" : "neutral"}>
            {sourceState}
          </StatusBadge>
          <Button type="button" variant="ghost" onClick={onRefresh}>
            Refresh
          </Button>
        </>
      }
    >
      {sourceState === "loading" ? (
        <EmptyState title="Loading sources" description="Scanning browser windows and tabs on this machine." />
      ) : sourceState === "error" ? (
        <EmptyState title="Source lookup failed" description={sourceError ?? "Capture source lookup failed."} />
      ) : sources.length === 0 ? (
        <EmptyState title="No capture sources" description="Open a browser window or tab, then refresh the source list." />
      ) : (
        <FieldShell label="Browser window or tab">
          <SelectField value={selectedSourceId} onChange={(event) => onSourceChange(event.target.value)}>
            {sources.map((source) => (
              <option key={source.id} value={source.id}>
                {source.name} ({source.sourceType})
              </option>
            ))}
          </SelectField>
        </FieldShell>
      )}
      <div className="button-cluster">
        <Button type="button" variant="accent" disabled={!selectedSourceId || recorderState === "recording"} onClick={onStart}>
          Start
        </Button>
        <Button type="button" variant="danger" disabled={recorderState !== "recording"} onClick={onStop}>
          Stop
        </Button>
      </div>
      <div className="panel-footer">
        <Badge tone={recorderState === "recording" ? "success" : "neutral"}>{recorderState}</Badge>
        <p className="helper-text">Click the preview while recording or reviewing to mark a zoom point.</p>
      </div>
      {captureError && <p className="panel-error">{captureError}</p>}
    </Panel>
  );
}
