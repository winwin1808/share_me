import { beforeEach, describe, expect, it, vi } from "vitest";

const { getSourcesMock } = vi.hoisted(() => ({
  getSourcesMock: vi.fn()
}));

vi.mock("electron", () => ({
  desktopCapturer: {
    getSources: getSourcesMock
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
        name: "Chrome - Cursorful",
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
        name: "Chrome - Cursorful",
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
});
