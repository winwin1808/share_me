import type { ButtonHTMLAttributes } from "react";

export type IconName =
  | "add"
  | "background"
  | "cancel"
  | "crop"
  | "edit"
  | "export"
  | "focus"
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
  | "success"
  | "timeline"
  | "tab"
  | "trash"
  | "warning"
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
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.75,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true
  };

  switch (name) {
    case "add":
      return (
        <svg {...commonProps}>
          <path d="M12 5v14" />
          <path d="M5 12h14" />
        </svg>
      );
    case "background":
      return (
        <svg {...commonProps}>
          <rect x="3.75" y="4.75" width="16.5" height="14.5" rx="2.5" />
          <path d="M3.75 8.75h16.5" />
          <path d="m7.5 16 3.3-3.6a1.2 1.2 0 0 1 1.8 0L15 15" />
          <path d="m14 13 1.2-1.3a1 1 0 0 1 1.5 0l2 2.3" />
        </svg>
      );
    case "cancel":
      return (
        <svg {...commonProps}>
          <path d="m6 6 12 12" />
          <path d="M18 6 6 18" />
        </svg>
      );
    case "crop":
      return (
        <svg {...commonProps}>
          <path d="M7 4v4.5A1.5 1.5 0 0 0 8.5 10H13" />
          <path d="M17 20v-4.5A1.5 1.5 0 0 0 15.5 14H11" />
          <path d="M4 7h8.5A1.5 1.5 0 0 1 14 8.5V17" />
          <path d="M20 17h-8.5A1.5 1.5 0 0 1 10 15.5V7" />
        </svg>
      );
    case "edit":
      return (
        <svg {...commonProps}>
          <path d="M4 20h4l10.5-10.5a1.75 1.75 0 1 0-3-3L5 17v3Z" />
          <path d="m14.5 6.5 3 3" />
        </svg>
      );
    case "export":
      return (
        <svg {...commonProps}>
          <path d="M12 4v10" />
          <path d="m8 8 4-4 4 4" />
          <path d="M5 14.5V18a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-3.5" />
        </svg>
      );
    case "focus":
      return (
        <svg {...commonProps}>
          <path d="M4 9V6a2 2 0 0 1 2-2h3" />
          <path d="M20 9V6a2 2 0 0 0-2-2h-3" />
          <path d="M4 15v3a2 2 0 0 0 2 2h3" />
          <path d="M20 15v3a2 2 0 0 1-2 2h-3" />
          <circle cx="12" cy="12" r="2.5" />
        </svg>
      );
    case "folder-open":
      return (
        <svg {...commonProps}>
          <path d="M3.75 7.5A2.25 2.25 0 0 1 6 5.25h4l1.8 2H18A2.25 2.25 0 0 1 20.25 9.5v7A2.25 2.25 0 0 1 18 18.75H6A2.25 2.25 0 0 1 3.75 16.5Z" />
          <path d="M3.75 10.25h16.5" />
        </svg>
      );
    case "frame":
      return (
        <svg {...commonProps}>
          <rect x="4" y="5" width="16" height="14" rx="2.5" />
          <path d="M4 9h16" />
          <path d="M8.5 5v14" />
        </svg>
      );
    case "pause":
      return (
        <svg {...commonProps}>
          <path d="M9 5v14" />
          <path d="M15 5v14" />
        </svg>
      );
    case "play":
      return (
        <svg {...commonProps}>
          <path d="m8 6 10 6-10 6V6Z" />
        </svg>
      );
    case "record":
      return (
        <svg {...commonProps}>
          <circle cx="12" cy="12" r="4.5" />
        </svg>
      );
    case "refresh":
      return (
        <svg {...commonProps}>
          <path d="M20 11a8 8 0 0 0-14.9-3.8" />
          <path d="M4 4v4h4" />
          <path d="M4 13a8 8 0 0 0 14.9 3.8" />
          <path d="M20 20v-4h-4" />
        </svg>
      );
    case "save":
      return (
        <svg {...commonProps}>
          <path d="M5 4.75h11l3 3V19a1.25 1.25 0 0 1-1.25 1.25H6.25A1.25 1.25 0 0 1 5 19Z" />
          <path d="M8 4.75v5h7v-5" />
          <path d="M8 20.25v-6h8v6" />
        </svg>
      );
    case "screen":
      return (
        <svg {...commonProps}>
          <rect x="3.75" y="4.75" width="16.5" height="11.5" rx="2.5" />
          <path d="M9 19.25h6" />
          <path d="M12 16.25v3" />
        </svg>
      );
    case "skip-end":
      return (
        <svg {...commonProps}>
          <path d="m6 6 8 6-8 6V6Z" />
          <path d="M18 6v12" />
        </svg>
      );
    case "skip-start":
      return (
        <svg {...commonProps}>
          <path d="m18 6-8 6 8 6V6Z" />
          <path d="M6 6v12" />
        </svg>
      );
    case "stop":
      return (
        <svg {...commonProps}>
          <rect x="7" y="7" width="10" height="10" rx="2.25" />
        </svg>
      );
    case "success":
      return (
        <svg {...commonProps}>
          <path d="m5 12.5 4.5 4.5L19 7.5" />
        </svg>
      );
    case "timeline":
      return (
        <svg {...commonProps}>
          <path d="M5 6.5h14" />
          <path d="M5 12h14" />
          <path d="M5 17.5h14" />
          <rect x="7" y="10.25" width="5" height="3.5" rx="1.25" />
          <rect x="14" y="15.75" width="3.5" height="3.5" rx="1.25" />
        </svg>
      );
    case "tab":
      return (
        <svg {...commonProps}>
          <rect x="3.75" y="5.25" width="16.5" height="13.5" rx="2.5" />
          <path d="M3.75 9.25h16.5" />
          <path d="M8.5 5.25v13.5" />
        </svg>
      );
    case "trash":
      return (
        <svg {...commonProps}>
          <path d="M5 7h14" />
          <path d="M9 7V5h6v2" />
          <path d="M7 7.5v10A1.5 1.5 0 0 0 8.5 19h7a1.5 1.5 0 0 0 1.5-1.5v-10" />
          <path d="M10 10.5v5" />
          <path d="M14 10.5v5" />
        </svg>
      );
    case "warning":
      return (
        <svg {...commonProps}>
          <path d="M12 4.75 20 19.25H4L12 4.75Z" />
          <path d="M12 9.5v4.5" />
          <path d="M12 17h.01" />
        </svg>
      );
    case "window":
      return (
        <svg {...commonProps}>
          <rect x="3.75" y="4.75" width="16.5" height="14.5" rx="2.5" />
          <path d="M3.75 8.75h16.5" />
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
      {...props}
    >
      <Icon name={icon} />
    </button>
  );
}
