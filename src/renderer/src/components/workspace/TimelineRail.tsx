import { memo, useRef } from "react";
import type { PointerEvent } from "react";
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

export const TimelineRail = memo(function TimelineRail({
  items,
  activeId,
  playheadMs,
  durationMs,
  onSelect,
  onSeek,
  onResize
}: {
  items: TimelineItem[];
  activeId: string | null;
  playheadMs: number;
  durationMs: number;
  onSelect: (id: string) => void;
  onSeek: (nextMs: number) => void;
  onResize: (id: string, edge: "start" | "end", nextMs: number) => void;
}) {
  const max = Math.max(1, durationMs);
  const playheadPosition = Math.min(playheadMs / max, 1);
  const activePointerIdRef = useRef<number | null>(null);

  function getTrackTime(event: PointerEvent<HTMLDivElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    const ratio = Math.min(Math.max((event.clientX - rect.left) / rect.width, 0), 1);
    return Math.round(ratio * max);
  }

  function seekFromPointer(event: PointerEvent<HTMLDivElement>) {
    onSeek(getTrackTime(event));
  }

  function handleScrubStart(event: PointerEvent<HTMLDivElement>) {
    activePointerIdRef.current = event.pointerId;
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // Ignore pointer capture failures when unavailable.
    }
    seekFromPointer(event);
  }

  function handleScrubMove(event: PointerEvent<HTMLDivElement>) {
    if (activePointerIdRef.current !== event.pointerId) {
      return;
    }
    seekFromPointer(event);
  }

  function handleScrubEnd(event: PointerEvent<HTMLDivElement>) {
    if (activePointerIdRef.current !== event.pointerId) {
      return;
    }
    activePointerIdRef.current = null;
    try {
      event.currentTarget.releasePointerCapture(event.pointerId);
    } catch {
      // Ignore release failures when capture is already cleared.
    }
  }

  return (
    <Panel className="timeline-rail-shell">
      <div className="timeline-bar timeline-unified-frame">
        <div className="timeline-unified-events-lane">
          <div
            className="timeline-track timeline-unified-event-track"
            role="slider"
            aria-label="Timeline position"
            aria-valuemin={0}
            aria-valuemax={max}
            aria-valuenow={Math.min(playheadMs, max)}
            tabIndex={0}
            onPointerDown={handleScrubStart}
            onPointerMove={handleScrubMove}
            onPointerUp={handleScrubEnd}
            onPointerCancel={handleScrubEnd}
            onLostPointerCapture={handleScrubEnd}
            onKeyDown={(event) => {
              if (event.key === "ArrowLeft") {
                event.preventDefault();
                onSeek(playheadMs - 250);
              }
              if (event.key === "ArrowRight") {
                event.preventDefault();
                onSeek(playheadMs + 250);
              }
            }}
          >
            <div className="timeline-playhead" style={{ left: `${playheadPosition * 100}%` }} />
            {items.length === 0 ? (
              <EmptyState title="No zoom events yet." description="Click the preview to create your first focus change." />
            ) : (
              items.map((item) => {
                const leftPercent = (item.startMs / max) * 100;
                const unclampedWidthPercent = Math.max((((item.endMs ?? item.startMs + 1400) - item.startMs) / max) * 100, 12);
                const widthPercent = Math.min(unclampedWidthPercent, Math.max(8, 100 - leftPercent));
                const density = widthPercent < 14 ? "micro" : widthPercent < 22 ? "compact" : "full";

                return (
                  <div
                    key={item.id}
                    className="timeline-event-shell timeline-unified-event-shell"
                    style={{
                      left: `${leftPercent}%`,
                      width: `${widthPercent}%`
                    }}
                  >
                    <TimelineItem
                      {...item}
                      density={density}
                      active={item.id === activeId}
                      durationMs={max}
                      onSelect={onSelect}
                      onSeek={(_, nextMs) => onSeek(nextMs)}
                      onResize={onResize}
                    />
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="timeline-unified-scrubber-lane">
          <div
            className="timeline-ruler timeline-unified-ruler"
            onPointerDown={handleScrubStart}
            onPointerMove={handleScrubMove}
            onPointerUp={handleScrubEnd}
            onPointerCancel={handleScrubEnd}
            onLostPointerCapture={handleScrubEnd}
          >
            <span>00:00</span>
            <span>{formatMs(durationMs)}</span>
          </div>
        </div>
      </div>
    </Panel>
  );
});
