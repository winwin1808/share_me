import { Badge } from "../ui/Badge";
import { EmptyState } from "../ui/EmptyState";
import { Panel } from "../ui/Panel";
import { TimelineItem } from "./TimelineItem";

export interface TimelineItem {
  id: string;
  startMs: number;
  scale: number;
  targetX: number;
  targetY: number;
}

export function TimelineRail({
  items,
  activeId,
  onSelect
}: {
  items: TimelineItem[];
  activeId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <Panel eyebrow="Editing" title="Zoom timeline" actions={<Badge tone="neutral">{items.length} items</Badge>}>
      <div className="timeline-rail-list">
        {items.length === 0 && <EmptyState title="No zooms yet." description="Click the preview to create your first focus change." />}
        {items.map((item) => (
          <TimelineItem key={item.id} {...item} active={item.id === activeId} onSelect={onSelect} />
        ))}
      </div>
    </Panel>
  );
}
