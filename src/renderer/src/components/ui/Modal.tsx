import type { ReactNode } from "react";
import { IconButton } from "./Icon";

export function Modal({
  title,
  open,
  onClose,
  actions,
  children,
  variant = "dialog"
}: {
  title: string;
  open: boolean;
  onClose: () => void;
  actions?: ReactNode;
  children: ReactNode;
  variant?: "dialog" | "drawer";
}) {
  if (!open) {
    return null;
  }

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className={`modal-card ${variant === "drawer" ? "modal-card-drawer" : ""}`.trim()}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal-header">
          <div className="modal-heading">
            <p className="modal-eyebrow">Editor</p>
            <h2 className="modal-title">{title}</h2>
          </div>
          <div className="modal-actions">
            {actions}
            <IconButton label="Close modal" icon="cancel" tone="ghost" onClick={onClose} />
          </div>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}
