import type { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonVariant = "solid" | "soft" | "ghost" | "accent" | "danger";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  leading?: ReactNode;
  iconOnly?: boolean;
}

export function Button({ variant = "soft", leading, iconOnly = false, className = "", children, ...props }: ButtonProps) {
  return (
    <button className={`ui-button ui-button-${variant} ${iconOnly ? "ui-button-icon" : ""} ${className}`.trim()} {...props}>
      {leading && <span className="ui-button-leading">{leading}</span>}
      {children ? <span className="ui-button-label">{children}</span> : null}
    </button>
  );
}
