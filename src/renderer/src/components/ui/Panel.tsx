import type { HTMLAttributes, ReactNode } from "react";
import { Surface } from "./Surface";
import { SectionHeader } from "./SectionHeader";

interface PanelProps extends HTMLAttributes<HTMLDivElement> {
  eyebrow?: string;
  title?: string;
  actions?: ReactNode;
  tone?: "default" | "raised" | "inset";
  children: ReactNode;
}

export function Panel({
  eyebrow,
  title,
  actions,
  tone = "default",
  className = "",
  children,
  ...props
}: PanelProps) {
  return (
    <Surface tone={tone} className={`panel-card ${className}`.trim()} {...props}>
      {(eyebrow || title || actions) && (
        <SectionHeader eyebrow={eyebrow} title={title ?? ""} actions={actions} />
      )}
      {children}
    </Surface>
  );
}

