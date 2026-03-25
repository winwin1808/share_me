import type { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonVariant = "solid" | "soft" | "ghost" | "accent" | "danger";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  leading?: ReactNode;
}

export function Button({ variant = "soft", leading, className = "", children, ...props }: ButtonProps) {
  return (
    <button className={`ui-button ui-button-${variant} ${className}`.trim()} {...props}>
      {leading && <span className="ui-button-leading">{leading}</span>}
      <span>{children}</span>
    </button>
  );
}
