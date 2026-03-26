import { describe, expect, it } from "vitest";
import { createZoomSegment, getActiveZoom, getZoomPreviewTime, getZoomStateAtTime, updateSegment } from "./zoom";

describe("zoom utils", () => {
  it("creates a default zoom segment", () => {
    const segment = createZoomSegment(500, 0.4, 0.6);
    expect(segment.id).toBeTypeOf("string");
    expect(segment.startMs).toBe(500);
    expect(segment.endMs).toBe(1900);
    expect(segment.targetX).toBe(0.4);
    expect(segment.targetY).toBe(0.6);
    expect(segment.scale).toBe(1.8);
    expect(segment.followCursor).toBe(false);
    expect(segment.easing).toBe("easeInOut");
  });

  it("finds the active zoom segment", () => {
    const first = createZoomSegment(100, 0.25, 0.75);
    const second = createZoomSegment(2000, 0.2, 0.8);
    expect(getActiveZoom([first, second], 100)).toBe(first);
    expect(getActiveZoom([first, second], 999)).toBe(first);
    expect(getActiveZoom([first, second], 2500)).toBe(second);
    expect(getActiveZoom([first, second], 5000)).toBeNull();
  });

  it("returns a representative preview time inside the zoom segment", () => {
    const segment = createZoomSegment(100, 0.25, 0.75);
    segment.endMs = 1100;

    expect(getZoomPreviewTime(segment)).toBe(600);
  });

  it("updates a segment immutably", () => {
    const segment = createZoomSegment(100, 0.25, 0.75);
    const updated = updateSegment([segment], segment.id, { scale: 2.2 });
    expect(updated[0].scale).toBe(2.2);
    expect(segment.scale).toBe(1.8);
  });

  it("leaves unrelated segments untouched", () => {
    const first = createZoomSegment(100, 0.25, 0.75);
    const second = createZoomSegment(500, 0.1, 0.9);
    const updated = updateSegment([first, second], first.id, { followCursor: true });
    expect(updated[0].followCursor).toBe(true);
    expect(updated[1]).toBe(second);
  });

  it("interpolates zoom state with smooth in-hold-out behavior", () => {
    const segment = createZoomSegment(0, 0.2, 0.8);
    segment.endMs = 1000;
    segment.scale = 2;
    segment.easing = "linear";

    const start = getZoomStateAtTime([segment], 0);
    const rampIn = getZoomStateAtTime([segment], 110);
    const middle = getZoomStateAtTime([segment], 500);
    const rampOut = getZoomStateAtTime([segment], 950);
    const end = getZoomStateAtTime([segment], 1000);

    expect(start.scale).toBe(1);
    expect(rampIn.scale).toBeGreaterThan(1);
    expect(middle.scale).toBeCloseTo(2);
    expect(middle.targetX).toBeCloseTo(0.2);
    expect(middle.targetY).toBeCloseTo(0.8);
    expect(rampOut.scale).toBeLessThan(1.3);
    expect(end.scale).toBeCloseTo(1, 5);
  });

  it("follows cursor samples for follow-cursor segments", () => {
    const segment = createZoomSegment(0, 0.2, 0.8);
    segment.endMs = 1000;
    segment.scale = 2;
    segment.followCursor = true;
    segment.easing = "linear";

    const middle = getZoomStateAtTime(
      [segment],
      500,
      [
        { t: 0, x: 0.2, y: 0.2 },
        { t: 1000, x: 0.8, y: 0.6 }
      ]
    );

    expect(middle.scale).toBeCloseTo(2);
    expect(middle.targetX).toBeCloseTo(0.5, 2);
    expect(middle.targetY).toBeCloseTo(0.4, 2);
  });

  it("falls back to the static target when follow-cursor data is missing", () => {
    const segment = createZoomSegment(0, 0.3, 0.7);
    segment.endMs = 1000;
    segment.scale = 2;
    segment.followCursor = true;
    segment.easing = "linear";

    const middle = getZoomStateAtTime([segment], 500, []);

    expect(middle.targetX).toBeCloseTo(0.3);
    expect(middle.targetY).toBeCloseTo(0.7);
  });
});
