import type { CaptureSource } from "../../../../shared/types";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { FieldShell, SelectField } from "../ui/Field";
import { Panel } from "../ui/Panel";

export function CapturePanel({
  sources,
  selectedSourceId,
  recorderState,
  onRefresh,
  onSourceChange,
  onStart,
  onStop
}: {
  sources: CaptureSource[];
  selectedSourceId: string;
  recorderState: "idle" | "recording" | "stopped";
  onRefresh: () => void;
  onSourceChange: (value: string) => void;
  onStart: () => void;
  onStop: () => void;
}) {
  return (
    <Panel eyebrow="Input" title="Capture" actions={<Button type="button" variant="ghost" onClick={onRefresh}>Refresh</Button>}>
      <FieldShell label="Browser window or tab">
        <SelectField value={selectedSourceId} onChange={(event) => onSourceChange(event.target.value)}>
          {sources.map((source) => (
            <option key={source.id} value={source.id}>
              {source.name} ({source.sourceType})
            </option>
          ))}
        </SelectField>
      </FieldShell>
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
    </Panel>
  );
}
