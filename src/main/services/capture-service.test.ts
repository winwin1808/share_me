import { beforeEach, describe, expect, it, vi } from "vitest";

const { getSourcesMock } = vi.hoisted(() => ({
  getSourcesMock: vi.fn()
}));

vi.mock("electron", () => ({
  desktopCapturer: {
    getSources: getSourcesMock
  },
  screen: {
    getCursorScreenPoint: vi.fn(() => ({ x: 240, y: 180 })),
    getDisplayNearestPoint: vi.fn(() => ({
      id: 7,
      bounds: { x: 0, y: 0, width: 1440, height: 900 }
    }))
  },
  nativeImage: {}
}));

import { ElectronDesktopCaptureAdapter } from "./capture-service";

describe("ElectronDesktopCaptureAdapter", () => {
  beforeEach(() => {
    getSourcesMock.mockReset();
  });

  it("maps Electron sources to shared capture sources", async () => {
    getSourcesMock.mockResolvedValue([
      {
        id: "1",
        name: "Chrome - Shareme",
        display_id: "display-1",
        thumbnail: { isEmpty: () => false, toDataURL: () => "data:image/png;base64,thumb1" }
      },
      {
        id: "2",
        name: "Finder",
        display_id: "display-2",
        thumbnail: { isEmpty: () => true, toDataURL: () => "ignored" }
      },
      {
        id: "3",
        name: "Tab: Docs",
        display_id: undefined,
        thumbnail: { isEmpty: () => false, toDataURL: () => "data:image/png;base64,thumb3" }
      },
      {
        id: "4",
        name: "Screen 1",
        display_id: "display-3",
        thumbnail: { isEmpty: () => false, toDataURL: () => "data:image/png;base64,thumb4" }
      }
    ]);

    const adapter = new ElectronDesktopCaptureAdapter();
    const sources = await adapter.listSources();

    expect(sources).toEqual([
      {
        id: "1",
        name: "Chrome - Shareme",
        sourceType: "window",
        displayId: "display-1",
        thumbnailDataUrl: "data:image/png;base64,thumb1"
      },
      {
        id: "2",
        name: "Finder",
        sourceType: "window",
        displayId: "display-2",
        thumbnailDataUrl: undefined
      },
      {
        id: "3",
        name: "Tab: Docs",
        sourceType: "tab",
        displayId: undefined,
        thumbnailDataUrl: "data:image/png;base64,thumb3"
      },
      {
        id: "4",
        name: "Screen 1",
        sourceType: "screen",
        displayId: "display-3",
        thumbnailDataUrl: "data:image/png;base64,thumb4"
      }
    ]);
  });

  it("returns the current global cursor state", async () => {
    const adapter = new ElectronDesktopCaptureAdapter();
    await expect(adapter.getCursorState()).resolves.toEqual({
      x: 240,
      y: 180,
      displayId: "7",
      displayBounds: { x: 0, y: 0, width: 1440, height: 900 }
    });
  });
});
