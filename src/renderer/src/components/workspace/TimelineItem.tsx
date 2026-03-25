import type { PointerEvent } from "react";

export interface TimelineItemData {
  id: string;
  startMs: number;
  endMs?: number;
  scale: number;
  targetX: number;
  targetY: number;
  durationMs: number;
  active?: boolean;
  onSelect: (id: string) => void;
  onResize: (id: string, edge: "start" | "end", nextMs: number) => void;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function TimelineItem({
  id,
  startMs,
  endMs,
  scale,
  targetX,
  targetY,
  durationMs,
  active,
  onSelect,
  onResize
}: TimelineItemData) {
  function handleResize(event: PointerEvent<HTMLButtonElement>, edge: "start" | "end") {
    event.stopPropagation();
    const track = event.currentTarget.closest(".timeline-track") as HTMLDivElement | null;
    if (!track) {
      return;
    }
    const rect = track.getBoundingClientRect();
    const ratio = clamp((event.clientX - rect.left) / rect.width, 0, 1);
    onResize(id, edge, Math.round(ratio * durationMs));
  }

  return (
    <div
      className={`timeline-item ${active ? "is-active" : ""}`.trim()}
      aria-current={active ? "true" : undefined}
      role="button"
      tabIndex={0}
      onClick={() => onSelect(id)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect(id);
        }
      }}
    >
      <span className="timeline-item-time">
        {Math.round(startMs)}ms{typeof endMs === "number" ? ` - ${Math.round(endMs)}ms` : ""}
      </span>
      <span className="timeline-item-scale">x{scale.toFixed(1)}</span>
      <span className="timeline-item-target">
        {Math.round(targetX * 100)} / {Math.round(targetY * 100)}
      </span>
      <button type="button" className="timeline-item-handle start" aria-label="Resize event start" onPointerDown={(event) => handleResize(event, "start")} />
      <button type="button" className="timeline-item-handle end" aria-label="Resize event end" onPointerDown={(event) => handleResize(event, "end")} />
    </div>
  );
}
