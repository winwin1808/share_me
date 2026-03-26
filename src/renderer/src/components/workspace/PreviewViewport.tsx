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
  const browserFrameTopInset = !showFrame && !cropRegion ? 0.06 : 0;
  const effectivePreviewCrop =
    captureFrameMode !== "crop"
      ? cropRegion ??
        (browserFrameTopInset > 0
          ? {
              x: 0,
              y: browserFrameTopInset,
              width: 1,
              height: 1 - browserFrameTopInset
            }
          : null)
      : null;
  const cropStyle =
    effectivePreviewCrop
      ? {
          width: `${100 / effectivePreviewCrop.width}%`,
          height: `${100 / effectivePreviewCrop.height}%`,
          left: `${(-effectivePreviewCrop.x / effectivePreviewCrop.width) * 100}%`,
          top: `${(-effectivePreviewCrop.y / effectivePreviewCrop.height) * 100}%`
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
        className="preview-frame-shell"
        data-preview-aspect={frameAspectRatio}
        data-show-frame={showFrame ? "true" : "false"}
        style={frameAspectRatio ? { aspectRatio: frameAspectRatio } : undefined}
      >
        <div className="preview-shell preview-shell-recorded">
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
      </div>
      <div className="preview-frame-meta">
        {captureFrameMode === "crop" ? (
          <div className="preview-crop-hint preview-crop-hint-compact">
            Drag a region on the frame to set the recording crop.
          </div>
        ) : null}
        {overlay ? <div className="preview-overlay-slot">{overlay}</div> : null}
      </div>
    </Surface>
  );
}
