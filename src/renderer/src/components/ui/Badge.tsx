import type { ReactNode } from "react";

type BadgeTone = "neutral" | "accent" | "success" | "warning" | "danger";

export function Badge({
  tone = "neutral",
  children
}: {
  tone?: BadgeTone;
  children: ReactNode;
}) {
  return <span className={`ui-badge ui-badge-${tone}`}>{children}</span>;
}
