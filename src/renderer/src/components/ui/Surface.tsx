import type { HTMLAttributes, ReactNode } from "react";

type SurfaceTone = "default" | "raised" | "inset";

interface SurfaceProps extends HTMLAttributes<HTMLDivElement> {
  tone?: SurfaceTone;
  children: ReactNode;
}

export function Surface({ tone = "default", className = "", children, ...props }: SurfaceProps) {
  return (
    <div className={`ui-surface ui-surface-${tone} ${className}`.trim()} {...props}>
      {children}
    </div>
  );
}

