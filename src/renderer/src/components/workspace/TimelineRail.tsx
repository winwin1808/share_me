import { Badge } from "../ui/Badge";
import { EmptyState } from "../ui/EmptyState";
import { Panel } from "../ui/Panel";
import { TimelineItem } from "./TimelineItem";

export interface TimelineItem {
  id: string;
  startMs: number;
  endMs?: number;
  scale: number;
  targetX: number;
  targetY: number;
}

function formatMs(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, "0");
  const seconds = (totalSeconds % 60).toString().padStart(2, "0");
  return `${minutes}:${seconds}`;
}

export function TimelineRail({
  items,
  activeId,
  playheadMs,
  durationMs,
  onSelect,
  onResize
}: {
  items: TimelineItem[];
  activeId: string | null;
  playheadMs: number;
  durationMs: number;
  onSelect: (id: string) => void;
  onResize: (id: string, edge: "start" | "end", nextMs: number) => void;
}) {
  const max = Math.max(1, durationMs);
  const playheadPosition = Math.min(playheadMs / max, 1);

  return (
    <Panel
      eyebrow="Editing"
      title="Timeline"
      actions={
        <div className="timeline-rail-actions">
          <Badge tone="neutral">{items.length} events</Badge>
          <Badge tone="accent">
            {formatMs(playheadMs)} / {formatMs(durationMs)}
          </Badge>
        </div>
      }
    >
      <div className="timeline-bar">
        <div className="timeline-ruler">
          <span>00:00</span>
          <span>{formatMs(durationMs)}</span>
        </div>
        <div className="timeline-track">
          <div className="timeline-playhead" style={{ left: `${playheadPosition * 100}%` }} />
          {items.length === 0 ? (
            <EmptyState title="No zoom events yet." description="Click the preview to create your first focus change." />
          ) : (
            items.map((item) => (
              <div
                key={item.id}
                className="timeline-event-shell"
                style={{
                  left: `${(item.startMs / max) * 100}%`,
                  width: `${Math.max((((item.endMs ?? item.startMs + 1400) - item.startMs) / max) * 100, 12)}%`
                }}
              >
                <TimelineItem {...item} active={item.id === activeId} durationMs={max} onSelect={onSelect} onResize={onResize} />
              </div>
            ))
          )}
        </div>
      </div>
    </Panel>
  );
}
