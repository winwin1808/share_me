import type { ReactNode } from "react";

export function Tooltip({
  content,
  children,
  placement = "top",
  disabled = false
}: {
  content: ReactNode;
  children: ReactNode;
  placement?: "top" | "bottom";
  disabled?: boolean;
}) {
  if (disabled) {
    return <>{children}</>;
  }

  return (
    <span className={`ui-tooltip ui-tooltip-${placement}`.trim()}>
      {children}
      <span className="ui-tooltip-bubble" role="tooltip">
        {content}
      </span>
    </span>
  );
}
