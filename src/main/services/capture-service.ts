import { desktopCapturer, screen } from "electron";
import type { CaptureSource, GlobalCursorState } from "../../shared/types";

function inferSourceType(id: string, name: string): CaptureSource["sourceType"] {
  if (/tab/i.test(name)) {
    return "tab";
  }
  if (/screen|display/i.test(name) || id.startsWith("screen:")) {
    return "screen";
  }
  if (/chrome|brave|edge|window/i.test(name)) {
    return "window";
  }
  return "window";
}

export interface CaptureAdapter {
  listSources(): Promise<CaptureSource[]>;
  getCursorState(): Promise<GlobalCursorState | null>;
}

function formatCaptureError(error: unknown): Error {
  const message = error instanceof Error ? error.message : String(error);
  if (process.platform === "darwin") {
    return new Error(
      `Failed to get sources. On macOS, allow Screen Recording for the app or the terminal/Codex process in System Settings > Privacy & Security > Screen & System Audio Recording. Original error: ${message}`
    );
  }
  return new Error(`Failed to get sources. ${message}`);
}

export class ElectronDesktopCaptureAdapter implements CaptureAdapter {
  async listSources(): Promise<CaptureSource[]> {
    try {
      const sources = await desktopCapturer.getSources({
        types: ["window", "screen"],
        thumbnailSize: { width: 320, height: 180 },
        fetchWindowIcons: true
      });

      return sources.map((source) => ({
        id: source.id,
        name: source.name,
        sourceType: inferSourceType(source.id, source.name),
        displayId: source.display_id,
        thumbnailDataUrl: this.toDataUrl(source.thumbnail),
        width: typeof source.thumbnail.getSize === "function" ? source.thumbnail.getSize().width || undefined : undefined,
        height: typeof source.thumbnail.getSize === "function" ? source.thumbnail.getSize().height || undefined : undefined
      }));
    } catch (error) {
      throw formatCaptureError(error);
    }
  }

  async getCursorState(): Promise<GlobalCursorState | null> {
    try {
      const point = screen.getCursorScreenPoint();
      const display = screen.getDisplayNearestPoint(point);
      if (!display) {
        return null;
      }
      return {
        x: point.x,
        y: point.y,
        displayId: String(display.id),
        displayBounds: {
          x: display.bounds.x,
          y: display.bounds.y,
          width: display.bounds.width,
          height: display.bounds.height
        }
      };
    } catch {
      return null;
    }
  }

  private toDataUrl(image: Electron.NativeImage): string | undefined {
    if (image.isEmpty()) {
      return undefined;
    }
    return image.toDataURL();
  }
}
