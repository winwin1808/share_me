import type { ReactNode } from "react";
import { Surface } from "../ui/Surface";
import { SectionHeader } from "../ui/SectionHeader";

export function SidebarSection({
  eyebrow,
  title,
  actions,
  children
}: {
  eyebrow?: string;
  title: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <Surface className="sidebar-section">
      <SectionHeader eyebrow={eyebrow} title={title} actions={actions} />
      {children}
    </Surface>
  );
}

