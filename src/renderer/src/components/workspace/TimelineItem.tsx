import { Button } from "../ui/Button";

export interface TimelineItemData {
  id: string;
  startMs: number;
  scale: number;
  targetX: number;
  targetY: number;
  active?: boolean;
  onSelect: (id: string) => void;
}

export function TimelineItem({
  id,
  startMs,
  scale,
  targetX,
  targetY,
  active,
  onSelect
}: TimelineItemData) {
  return (
    <Button
      type="button"
      variant={active ? "solid" : "ghost"}
      className="timeline-item"
      aria-current={active ? "true" : undefined}
      onClick={() => onSelect(id)}
    >
      <span>{Math.round(startMs)}ms</span>
      <span>x{scale.toFixed(1)}</span>
      <span>
        {Math.round(targetX * 100)} / {Math.round(targetY * 100)}
      </span>
    </Button>
  );
}
