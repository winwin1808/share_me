import type { CSSProperties, MouseEventHandler, ReactNode } from "react";
import { Surface } from "../ui/Surface";

export function PreviewViewport({
  backgroundPreset,
  backgroundImageUrl,
  showFrame,
  previewStyle,
  onClick,
  overlay,
  children
}: {
  backgroundPreset: "slate" | "ocean" | "sunset";
  backgroundImageUrl?: string | null;
  showFrame: boolean;
  previewStyle?: CSSProperties;
  onClick: MouseEventHandler<HTMLDivElement>;
  overlay?: ReactNode;
  children: ReactNode;
}) {
  return (
    <Surface
      className={`preview-viewport preview-viewport-${backgroundPreset}`}
      onClick={onClick}
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
      <div className={`preview-shell ${showFrame ? "preview-shell-frame" : "preview-shell-clean"}`}>
        <div className="preview-stage" style={previewStyle}>
          {children}
        </div>
      </div>
      {overlay}
    </Surface>
  );
}
