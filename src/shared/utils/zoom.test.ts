import { describe, expect, it } from "vitest";
import { createZoomSegment, getActiveZoom, updateSegment } from "./zoom";

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
});
