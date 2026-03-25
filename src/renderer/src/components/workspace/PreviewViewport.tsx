import type { CSSProperties, MouseEventHandler, PointerEventHandler, ReactNode } from "react";
import { Surface } from "../ui/Surface";

export function PreviewViewport({
  backgroundPreset,
  backgroundImageUrl,
  showFrame,
  frameAspectRatio,
  cropRegion,
  cropDraftRegion,
  captureFrameMode,
  previewStyle,
  onClick,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  overlay,
  children
}: {
  backgroundPreset: "slate" | "ocean" | "sunset";
  backgroundImageUrl?: string | null;
  showFrame: boolean;
  frameAspectRatio?: string;
  cropRegion?: { x: number; y: number; width: number; height: number } | null;
  cropDraftRegion?: { x: number; y: number; width: number; height: number } | null;
  captureFrameMode?: "fit" | "crop";
  previewStyle?: CSSProperties;
  onClick?: MouseEventHandler<HTMLDivElement>;
  onPointerDown?: PointerEventHandler<HTMLDivElement>;
  onPointerMove?: PointerEventHandler<HTMLDivElement>;
  onPointerUp?: PointerEventHandler<HTMLDivElement>;
  overlay?: ReactNode;
  children: ReactNode;
}) {
  const cropBox = cropDraftRegion ?? cropRegion ?? null;
  const cropStyle =
    cropRegion && captureFrameMode !== "crop"
      ? {
          width: `${100 / cropRegion.width}%`,
          height: `${100 / cropRegion.height}%`,
          left: `${(-cropRegion.x / cropRegion.width) * 100}%`,
          top: `${(-cropRegion.y / cropRegion.height) * 100}%`
        }
      : undefined;
  return (
    <Surface
      className={`preview-viewport preview-viewport-${backgroundPreset} ${captureFrameMode === "crop" ? "is-cropping" : ""}`.trim()}
      style={
        backgroundImageUrl
          ? {
              backgroundImage: `linear-gradient(rgba(7, 11, 17, 0.18), rgba(7, 11, 17, 0.18)), url("${backgroundImageUrl}")`,
              backgroundSize: "cover",
              backgroundPosition: "center"
            }
          : undefined
      }
    >
      <div
        className={`preview-shell ${showFrame ? "preview-shell-frame" : "preview-shell-clean"}`}
        style={frameAspectRatio ? { aspectRatio: frameAspectRatio } : undefined}
      >
        <div className="preview-stage" onClick={onClick} onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp}>
          <div className="preview-stage-crop" style={cropStyle}>
            <div className="preview-stage-content" style={previewStyle}>
              {children}
            </div>
          </div>
          {cropBox && (
            <div
              className={`preview-crop-box ${cropDraftRegion ? "is-draft" : ""}`}
              style={{
                left: `${cropBox.x * 100}%`,
                top: `${cropBox.y * 100}%`,
                width: `${cropBox.width * 100}%`,
                height: `${cropBox.height * 100}%`
              }}
            />
          )}
        </div>
      </div>
      {captureFrameMode === "crop" && (
        <div className="preview-crop-hint">
          Drag a region on the frame to set the recording crop.
        </div>
      )}
      {overlay}
    </Surface>
  );
}
