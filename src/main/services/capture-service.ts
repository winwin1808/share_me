import { desktopCapturer, nativeImage } from "electron";
import type { CaptureSource } from "../../shared/types";

function inferSourceType(name: string): CaptureSource["sourceType"] {
  if (/tab/i.test(name)) {
    return "browser-tab";
  }
  if (/chrome|brave|edge|window/i.test(name)) {
    return "browser-window";
  }
  return "desktop-window";
}

export interface CaptureAdapter {
  listSources(): Promise<CaptureSource[]>;
}

export class ElectronDesktopCaptureAdapter implements CaptureAdapter {
  async listSources(): Promise<CaptureSource[]> {
    const sources = await desktopCapturer.getSources({
      types: ["window"],
      thumbnailSize: { width: 320, height: 180 },
      fetchWindowIcons: true
    });

    return sources.map((source) => ({
      id: source.id,
      name: source.name,
      sourceType: inferSourceType(source.name),
      displayId: source.display_id,
      thumbnailDataUrl: this.toDataUrl(source.thumbnail)
    }));
  }

  private toDataUrl(image: Electron.NativeImage): string | undefined {
    if (image.isEmpty()) {
      return undefined;
    }
    return image.toDataURL();
  }
}

