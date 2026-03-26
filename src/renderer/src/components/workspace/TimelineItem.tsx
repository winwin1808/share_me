import { memo, useRef, useState } from "react";
import type { PointerEvent } from "react";

export interface TimelineItemData {
  id: string;
  startMs: number;
  endMs?: number;
  scale: number;
  targetX: number;
  targetY: number;
  durationMs: number;
  density?: "full" | "compact" | "micro";
  active?: boolean;
  onSelect: (id: string) => void;
  onSeek: (id: string, nextMs: number) => void;
  onResize: (id: string, edge: "start" | "end", nextMs: number) => void;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

type ResizeEdge = "start" | "end";

function formatTimelineTime(ms: number, compact = false) {
  if (compact) {
    return `${(ms / 1000).toFixed(1)}s`;
  }

  return `${Math.round(ms)}ms`;
}

export const TimelineItem = memo(function TimelineItem({
  id,
  startMs,
  endMs,
  scale,
  targetX,
  targetY,
  durationMs,
  density = "full",
  active,
  onSelect,
  onSeek,
  onResize
}: TimelineItemData) {
  const activeResizeEdgeRef = useRef<ResizeEdge | null>(null);
  const activePointerIdRef = useRef<number | null>(null);
  const [isResizing, setIsResizing] = useState(false);

  function getTrackPointMs(event: PointerEvent<HTMLButtonElement>) {
    const track = event.currentTarget.closest(".timeline-track") as HTMLDivElement | null;
    if (!track) {
      return null;
    }
    const rect = track.getBoundingClientRect();
    const ratio = clamp((event.clientX - rect.left) / rect.width, 0, 1);
    return Math.round(ratio * durationMs);
  }

  function commitResize(event: PointerEvent<HTMLButtonElement>, edge: ResizeEdge) {
    const nextMs = getTrackPointMs(event);
    if (nextMs === null) {
      return;
    }
    onResize(id, edge, nextMs);
  }

  function getActivationTime(clientX: number, currentTarget: HTMLDivElement): number {
    const rect = currentTarget.getBoundingClientRect();
    const ratio = rect.width > 0 ? clamp((clientX - rect.left) / rect.width, 0, 1) : 0;
    const segmentEndMs = typeof endMs === "number" ? endMs : startMs;
    return Math.round(startMs + (segmentEndMs - startMs) * ratio);
  }

  function handleResizeStart(event: PointerEvent<HTMLButtonElement>, edge: ResizeEdge) {
    event.stopPropagation();
    event.preventDefault();
    activeResizeEdgeRef.current = edge;
    activePointerIdRef.current = event.pointerId;
    setIsResizing(true);
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // Ignore capture failures in environments that do not support it.
    }
    commitResize(event, edge);
  }

  function handleResizeMove(event: PointerEvent<HTMLButtonElement>) {
    if (!isResizing || activePointerIdRef.current !== event.pointerId || !activeResizeEdgeRef.current) {
      return;
    }
    event.stopPropagation();
    commitResize(event, activeResizeEdgeRef.current);
  }

  function finishResize(event: PointerEvent<HTMLButtonElement>) {
    if (activePointerIdRef.current !== event.pointerId) {
      return;
    }
    event.stopPropagation();
    activeResizeEdgeRef.current = null;
    activePointerIdRef.current = null;
    setIsResizing(false);
    try {
      event.currentTarget.releasePointerCapture(event.pointerId);
    } catch {
      // Ignore release failures when capture is already gone.
    }
  }

  const isMicro = density === "micro";
  const isCompact = density === "compact" || isMicro;
  const startLabel = formatTimelineTime(startMs, isCompact);
  const endLabel = typeof endMs === "number" ? formatTimelineTime(endMs, isCompact) : "";
  const timeLabel = isMicro
    ? startLabel
    : `${startLabel}${typeof endMs === "number" ? ` - ${endLabel}` : ""}`;
  const summaryLabel = `${Math.round(startMs)}-${Math.round(endMs ?? startMs)}ms | x${scale.toFixed(1)} | ${Math.round(targetX * 100)} / ${Math.round(targetY * 100)}`;

  return (
    <div
      className={`timeline-item ${active ? "is-active" : ""} ${isCompact ? `is-${density}` : ""}`.trim()}
      aria-current={active ? "true" : undefined}
      aria-label={summaryLabel}
      title={summaryLabel}
      role="button"
      tabIndex={0}
      onPointerDown={(event) => event.stopPropagation()}
      onClick={(event) => {
        event.stopPropagation();
        onSelect(id);
        onSeek(id, getActivationTime(event.clientX, event.currentTarget));
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          event.stopPropagation();
          onSelect(id);
          onSeek(id, Math.round(startMs + ((typeof endMs === "number" ? endMs : startMs) - startMs) / 2));
        }
      }}
    >
      <span className="timeline-item-time">{timeLabel}</span>
      {!isMicro ? <span className="timeline-item-scale">x{scale.toFixed(1)}</span> : null}
      <button
        type="button"
        className="timeline-item-handle start"
        aria-label="Resize event start"
        aria-pressed={isResizing && activeResizeEdgeRef.current === "start"}
        onPointerDown={(event) => handleResizeStart(event, "start")}
        onPointerMove={handleResizeMove}
        onPointerUp={finishResize}
        onPointerCancel={finishResize}
        onLostPointerCapture={finishResize}
        onClick={(event) => event.stopPropagation()}
      />
      <button
        type="button"
        className="timeline-item-handle end"
        aria-label="Resize event end"
        aria-pressed={isResizing && activeResizeEdgeRef.current === "end"}
        onPointerDown={(event) => handleResizeStart(event, "end")}
        onPointerMove={handleResizeMove}
        onPointerUp={finishResize}
        onPointerCancel={finishResize}
        onLostPointerCapture={finishResize}
        onClick={(event) => event.stopPropagation()}
      />
    </div>
  );
});
