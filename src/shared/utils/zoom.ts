import type { CursorPoint, ZoomSegment } from "../types";

const ZOOM_RAMP_FRACTION = 0.22;

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

export function getZoomPreviewTime(segment: ZoomSegment): number {
  const duration = Math.max(segment.endMs - segment.startMs, 0);
  return segment.startMs + Math.round(duration / 2);
}

export function getActiveZoom(segments: ZoomSegment[], timeMs: number): ZoomSegment | null {
  return segments.find((segment) => timeMs >= segment.startMs && timeMs <= segment.endMs) ?? null;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function easeProgress(easing: ZoomSegment["easing"], progress: number): number {
  const clamped = clamp(progress, 0, 1);
  if (easing === "linear") {
    return clamped;
  }
  if (easing === "easeOut") {
    return 1 - (1 - clamped) * (1 - clamped);
  }
  if (clamped < 0.5) {
    return 2 * clamped * clamped;
  }
  return 1 - Math.pow(-2 * clamped + 2, 2) / 2;
}

function getSegmentIntensity(segment: ZoomSegment, timeMs: number): number {
  const duration = Math.max(segment.endMs - segment.startMs, 1);
  const progress = clamp((timeMs - segment.startMs) / duration, 0, 1);
  const rampFraction = Math.min(ZOOM_RAMP_FRACTION, 0.5);

  if (progress <= rampFraction) {
    return easeProgress(segment.easing, progress / rampFraction);
  }

  if (progress >= 1 - rampFraction) {
    return 1 - easeProgress(segment.easing, (progress - (1 - rampFraction)) / rampFraction);
  }

  return 1;
}

export function getZoomStateAtTime(
  segments: ZoomSegment[],
  timeMs: number,
  cursorPath: CursorPoint[] = []
): { scale: number; targetX: number; targetY: number; segment: ZoomSegment | null } {
  const segment = getActiveZoom(segments, timeMs);
  if (!segment) {
    return { scale: 1, targetX: 0.5, targetY: 0.5, segment: null };
  }

  const intensity = getSegmentIntensity(segment, timeMs);
  const target = getSegmentTargetAtTime(segment, timeMs, cursorPath);
  return {
    scale: 1 + (segment.scale - 1) * intensity,
    targetX: 0.5 + (target.targetX - 0.5) * intensity,
    targetY: 0.5 + (target.targetY - 0.5) * intensity,
    segment
  };
}

export function updateSegment(segments: ZoomSegment[], segmentId: string, patch: Partial<ZoomSegment>): ZoomSegment[] {
  return segments.map((segment) => (segment.id === segmentId ? { ...segment, ...patch } : segment));
}

function getSegmentTargetAtTime(
  segment: ZoomSegment,
  timeMs: number,
  cursorPath: CursorPoint[]
): { targetX: number; targetY: number } {
  if (!segment.followCursor) {
    return { targetX: segment.targetX, targetY: segment.targetY };
  }

  const relevantPoints = cursorPath.filter((point) => point.t >= segment.startMs && point.t <= segment.endMs);
  if (relevantPoints.length === 0) {
    return { targetX: segment.targetX, targetY: segment.targetY };
  }

  if (timeMs <= relevantPoints[0].t) {
    return { targetX: relevantPoints[0].x, targetY: relevantPoints[0].y };
  }

  const lastPoint = relevantPoints[relevantPoints.length - 1];
  if (timeMs >= lastPoint.t) {
    return { targetX: lastPoint.x, targetY: lastPoint.y };
  }

  for (let index = 0; index < relevantPoints.length - 1; index += 1) {
    const current = relevantPoints[index];
    const next = relevantPoints[index + 1];
    if (timeMs < current.t || timeMs > next.t) {
      continue;
    }

    const duration = Math.max(next.t - current.t, 1);
    const progress = clamp((timeMs - current.t) / duration, 0, 1);
    return {
      targetX: current.x + (next.x - current.x) * progress,
      targetY: current.y + (next.y - current.y) * progress
    };
  }

  return { targetX: segment.targetX, targetY: segment.targetY };
}
