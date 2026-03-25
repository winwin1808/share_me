import type { ReactNode } from "react";
import { Badge } from "./Badge";

type StatusTone = "neutral" | "accent" | "success" | "warning" | "danger";

export function StatusBadge({
  tone = "neutral",
  children
}: {
  tone?: StatusTone;
  children: ReactNode;
}) {
  return <Badge tone={tone}>{children}</Badge>;
}

