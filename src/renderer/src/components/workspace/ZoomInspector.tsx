import type { ZoomSegment } from "../../../../shared/types";
import { StatusBadge } from "../ui/StatusBadge";
import { Button } from "../ui/Button";
import { FieldShell, SelectField, TextField } from "../ui/Field";
import { Panel } from "../ui/Panel";
import { EmptyState } from "../ui/EmptyState";

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
    <Panel eyebrow="State" title="Selected zoom" actions={segment ? <StatusBadge tone="accent">active</StatusBadge> : undefined}>
      {!segment ? (
        <EmptyState title="Nothing selected" description="Select a timeline item to edit timing, scale, and focus point." />
      ) : (
        <div className="inspector-grid">
          <FieldShell label="Start (ms)">
            <TextField type="number" value={segment.startMs} onChange={(e) => onChange({ startMs: Number(e.target.value) })} />
          </FieldShell>
          <FieldShell label="End (ms)">
            <TextField type="number" value={segment.endMs} onChange={(e) => onChange({ endMs: Number(e.target.value) })} />
          </FieldShell>
          <FieldShell label="Scale">
            <TextField
              type="number"
              min={1}
              max={3}
              step={0.1}
              value={segment.scale}
              onChange={(e) => onChange({ scale: Number(e.target.value) })}
            />
          </FieldShell>
          <FieldShell label="Target X">
            <TextField
              type="number"
              min={0}
              max={1}
              step={0.01}
              value={segment.targetX}
              onChange={(e) => onChange({ targetX: Number(e.target.value) })}
            />
          </FieldShell>
          <FieldShell label="Target Y">
            <TextField
              type="number"
              min={0}
              max={1}
              step={0.01}
              value={segment.targetY}
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
          <label className="checkbox-field">
            <input
              type="checkbox"
              checked={segment.followCursor}
              onChange={(e) => onChange({ followCursor: e.target.checked })}
            />
            <span>Follow cursor</span>
          </label>
          <Button type="button" variant="danger" onClick={onRemove}>
            Remove zoom
          </Button>
        </div>
      )}
    </Panel>
  );
}
