import type { ReactNode } from "react";

export function SectionHeader({
  eyebrow,
  title,
  actions
}: {
  eyebrow?: string;
  title: string;
  actions?: ReactNode;
}) {
  return (
    <div className="section-header">
      <div>
        {eyebrow && <p className="section-eyebrow">{eyebrow}</p>}
        <h2 className="section-title">{title}</h2>
      </div>
      {actions && <div className="section-actions">{actions}</div>}
    </div>
  );
}

