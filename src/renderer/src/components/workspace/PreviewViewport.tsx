import type { CSSProperties, MouseEventHandler, ReactNode } from "react";
import { Surface } from "../ui/Surface";

export function PreviewViewport({
  backgroundPreset,
  showFrame,
  previewStyle,
  onClick,
  overlay,
  children
}: {
  backgroundPreset: "slate" | "ocean" | "sunset";
  showFrame: boolean;
  previewStyle?: CSSProperties;
  onClick: MouseEventHandler<HTMLDivElement>;
  overlay?: ReactNode;
  children: ReactNode;
}) {
  return (
    <Surface className={`preview-viewport preview-viewport-${backgroundPreset}`} onClick={onClick}>
      <div className={`preview-shell ${showFrame ? "preview-shell-frame" : "preview-shell-clean"}`}>
        <div className="preview-stage" style={previewStyle}>
          {children}
        </div>
      </div>
      {overlay}
    </Surface>
  );
}

