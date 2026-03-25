import type { ZoomSegment } from "../types";

export function createZoomSegment(startMs: number, targetX: number, targetY: number): ZoomSegment {
  return {
    id: crypto.randomUUID(),
    startMs,
    endMs: startMs + 1400,
    targetX,
    targetY,
    scale: 1.8,
    followCursor: false,
    easing: "easeInOut"
  };
}

export function getActiveZoom(segments: ZoomSegment[], timeMs: number): ZoomSegment | null {
  return segments.find((segment) => timeMs >= segment.startMs && timeMs <= segment.endMs) ?? null;
}

export function updateSegment(segments: ZoomSegment[], segmentId: string, patch: Partial<ZoomSegment>): ZoomSegment[] {
  return segments.map((segment) => (segment.id === segmentId ? { ...segment, ...patch } : segment));
}

