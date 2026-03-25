import type { ReactNode } from "react";

export function EmptyState({
  title,
  description
}: {
  title: string;
  description?: string | ReactNode;
}) {
  return (
    <div className="empty-state-card">
      <strong className="empty-state-title">{title}</strong>
      {description && <p className="empty-state-description">{description}</p>}
    </div>
  );
}

