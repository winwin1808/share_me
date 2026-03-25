import type { ButtonHTMLAttributes } from "react";

export type IconName =
  | "add"
  | "background"
  | "cancel"
  | "crop"
  | "export"
  | "folder-open"
  | "frame"
  | "pause"
  | "play"
  | "record"
  | "refresh"
  | "save"
  | "screen"
  | "skip-end"
  | "skip-start"
  | "stop"
  | "tab"
  | "trash"
  | "window";

export function Icon({
  name,
  size = 16
}: {
  name: IconName;
  size?: number;
}) {
  const commonProps = {
    width: size,
    height: size,
    viewBox: "0 0 20 20",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true
  };

  switch (name) {
    case "add":
      return (
        <svg {...commonProps}>
          <path d="M10 4v12" />
          <path d="M4 10h12" />
        </svg>
      );
    case "background":
      return (
        <svg {...commonProps}>
          <path d="M3.5 6.5h13" />
          <path d="M5 4.5h10a1.5 1.5 0 0 1 1.5 1.5v8A1.5 1.5 0 0 1 15 15.5H5A1.5 1.5 0 0 1 3.5 14V6A1.5 1.5 0 0 1 5 4.5Z" />
          <path d="m7 11 1.9-2.2a1.2 1.2 0 0 1 1.8 0L12 11" />
          <path d="m11.5 9.5.8-.9a1 1 0 0 1 1.5 0l1.2 1.4" />
        </svg>
      );
    case "cancel":
      return (
        <svg {...commonProps}>
          <path d="m5 5 10 10" />
          <path d="m15 5-10 10" />
        </svg>
      );
    case "crop":
      return (
        <svg {...commonProps}>
          <path d="M6 3.5v3.5A1.5 1.5 0 0 0 7.5 8.5H11" />
          <path d="M14 16.5V13a1.5 1.5 0 0 0-1.5-1.5H9" />
          <path d="M3.5 7.5h8a1.5 1.5 0 0 1 1.5 1.5v8" />
          <path d="M16.5 12.5h-8A1.5 1.5 0 0 1 7 11V3.5" />
        </svg>
      );
    case "export":
      return (
        <svg {...commonProps}>
          <path d="M10 3.5v9" />
          <path d="m6.5 6.5 3.5-3 3.5 3" />
          <path d="M4.5 12.5v2a1.5 1.5 0 0 0 1.5 1.5h8a1.5 1.5 0 0 0 1.5-1.5v-2" />
        </svg>
      );
    case "folder-open":
      return (
        <svg {...commonProps}>
          <path d="M4 6h4l1.5 1.8H16a1.5 1.5 0 0 1 1.5 1.5v5.2A1.5 1.5 0 0 1 16 16H4a1.5 1.5 0 0 1-1.5-1.5V7.5A1.5 1.5 0 0 1 4 6Z" />
        </svg>
      );
    case "frame":
      return (
        <svg {...commonProps}>
          <rect x="3.5" y="4" width="13" height="12" rx="2.2" />
          <path d="M3.5 8h13" />
          <path d="M7 4v12" />
        </svg>
      );
    case "pause":
      return (
        <svg {...commonProps}>
          <path d="M7 4.5v11" />
          <path d="M13 4.5v11" />
        </svg>
      );
    case "play":
      return (
        <svg {...commonProps}>
          <path d="M7.5 4.8v10.4L15 10 7.5 4.8Z" />
        </svg>
      );
    case "record":
      return (
        <svg {...commonProps}>
          <circle cx="10" cy="10" r="4.8" />
        </svg>
      );
    case "refresh":
      return (
        <svg {...commonProps}>
          <path d="M16 8.5A6.5 6.5 0 0 0 5.5 5.5" />
          <path d="M5 4.5v3h3" />
          <path d="M4 11.5A6.5 6.5 0 0 0 14.5 14.5" />
          <path d="M15 15.5v-3h-3" />
        </svg>
      );
    case "save":
      return (
        <svg {...commonProps}>
          <path d="M5.5 4.5h7l2 2V15a1.5 1.5 0 0 1-1.5 1.5h-7A1.5 1.5 0 0 1 4.5 15V6A1.5 1.5 0 0 1 6 4.5Z" />
          <path d="M7 4.5V9h5V4.5" />
        </svg>
      );
    case "screen":
      return (
        <svg {...commonProps}>
          <rect x="3.5" y="4.5" width="13" height="10" rx="2.2" />
          <path d="M8 15.5h4" />
        </svg>
      );
    case "skip-end":
      return (
        <svg {...commonProps}>
          <path d="M4.5 5v10" />
          <path d="m7 5 6.5 5-6.5 5V5Z" />
          <path d="M15.5 5v10" />
        </svg>
      );
    case "skip-start":
      return (
        <svg {...commonProps}>
          <path d="M15.5 5v10" />
          <path d="m13 5-6.5 5 6.5 5V5Z" />
          <path d="M4.5 5v10" />
        </svg>
      );
    case "stop":
      return (
        <svg {...commonProps}>
          <rect x="5.5" y="5.5" width="9" height="9" rx="2" />
        </svg>
      );
    case "tab":
      return (
        <svg {...commonProps}>
          <rect x="3.5" y="5" width="13" height="10" rx="2.2" />
          <path d="M3.5 8.5h13" />
          <path d="M7 5v10" />
        </svg>
      );
    case "trash":
      return (
        <svg {...commonProps}>
          <path d="M6.5 7h7" />
          <path d="M8 7V5.5h4V7" />
          <path d="M6 7.5v7A1.5 1.5 0 0 0 7.5 16h5A1.5 1.5 0 0 0 14 14.5v-7" />
          <path d="M8.5 9.5v4" />
          <path d="M11.5 9.5v4" />
        </svg>
      );
    case "window":
      return (
        <svg {...commonProps}>
          <rect x="3.5" y="4.5" width="13" height="11" rx="2.2" />
          <path d="M3.5 8h13" />
        </svg>
      );
    default:
      return null;
  }
}

export function IconButton({
  className = "",
  label,
  tone = "soft",
  icon,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  label: string;
  tone?: "soft" | "solid" | "accent" | "ghost" | "danger";
  icon: IconName;
}) {
  return (
    <button
      className={`ui-icon-button ui-button ui-button-${tone} ${className}`.trim()}
      aria-label={label}
      title={label}
      {...props}
    >
      <Icon name={icon} />
    </button>
  );
}
