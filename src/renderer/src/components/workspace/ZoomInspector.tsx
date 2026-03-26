import type { ZoomSegment } from "@shared/types";
import { StatusBadge } from "../ui/StatusBadge";
import { Button } from "../ui/Button";
import { Icon } from "../ui/Icon";
import { FieldShell, SelectField, TextField } from "../ui/Field";
import { Panel } from "../ui/Panel";
import { EmptyState } from "../ui/EmptyState";

function roundValue(value: number, digits = 2) {
  return Number(value.toFixed(digits));
}

function formatMs(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, "0");
  const seconds = (totalSeconds % 60).toString().padStart(2, "0");
  return `${minutes}:${seconds}`;
}

export function ZoomInspector({
  segment,
  onChange,
  onRemove
}: {
  segment: ZoomSegment | null;
  onChange: (patch: Partial<ZoomSegment>) => void;
  onRemove: () => void;
}) {
  return (
    <Panel
      title="Zoom"
      actions={segment ? <StatusBadge tone="accent">active</StatusBadge> : undefined}
    >
      {!segment ? (
        <EmptyState title="Nothing selected" description="Select a timeline item to edit timing, scale, and focus point." />
      ) : (
        <div className="inspector-stack">
          <div className="inspector-summary">
            <div className="inspector-summary-item">
              <span>Start</span>
              <strong>{formatMs(segment.startMs)}</strong>
            </div>
            <div className="inspector-summary-item">
              <span>End</span>
              <strong>{formatMs(segment.endMs)}</strong>
            </div>
            <div className="inspector-summary-item">
              <span>Scale</span>
              <strong>x{roundValue(segment.scale, 2)}</strong>
            </div>
          </div>

          <div className="inspector-grid inspector-grid-compact">
            <FieldShell label="Start">
              <TextField type="number" step={50} value={Math.round(segment.startMs)} onChange={(e) => onChange({ startMs: Number(e.target.value) })} />
            </FieldShell>
            <FieldShell label="End">
              <TextField type="number" step={50} value={Math.round(segment.endMs)} onChange={(e) => onChange({ endMs: Number(e.target.value) })} />
            </FieldShell>
            <FieldShell label="Scale">
              <TextField
                type="number"
                min={1}
                max={3}
                step={0.1}
                value={roundValue(segment.scale, 2)}
                onChange={(e) => onChange({ scale: Number(e.target.value) })}
              />
            </FieldShell>
            <FieldShell label="Target X">
              <TextField
                type="number"
                min={0}
                max={1}
                step={0.05}
                value={roundValue(segment.targetX, 2)}
                onChange={(e) => onChange({ targetX: Number(e.target.value) })}
              />
            </FieldShell>
            <FieldShell label="Target Y">
              <TextField
                type="number"
                min={0}
                max={1}
                step={0.05}
                value={roundValue(segment.targetY, 2)}
                onChange={(e) => onChange({ targetY: Number(e.target.value) })}
              />
            </FieldShell>
            <FieldShell label="Easing">
              <SelectField value={segment.easing} onChange={(e) => onChange({ easing: e.target.value as ZoomSegment["easing"] })}>
                <option value="easeInOut">easeInOut</option>
                <option value="easeOut">easeOut</option>
                <option value="linear">linear</option>
              </SelectField>
            </FieldShell>
          </div>

          <div className="inspector-actions">
            <label className="checkbox-field checkbox-field-compact">
              <input
                type="checkbox"
                checked={segment.followCursor}
                onChange={(e) => onChange({ followCursor: e.target.checked })}
              />
              <span>Follow cursor</span>
            </label>
            <Button type="button" variant="danger" leading={<Icon name="trash" />} onClick={onRemove}>
              Remove
            </Button>
          </div>
        </div>
      )}
    </Panel>
  );
}
