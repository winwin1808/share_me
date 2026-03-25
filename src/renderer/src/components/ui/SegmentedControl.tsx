import type { ReactNode } from "react";

export interface SegmentedOption<T extends string> {
  value: T;
  label: ReactNode;
  description?: string;
}

export function SegmentedControl<T extends string>({
  value,
  options,
  onChange
}: {
  value: T;
  options: SegmentedOption<T>[];
  onChange: (next: T) => void;
}) {
  return (
    <div className="segmented-control" role="radiogroup" aria-label="Segmented control">
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            className={`segmented-control-item ${active ? "is-active" : ""}`}
            onClick={() => onChange(option.value)}
          >
            <span className="segmented-control-label">{option.label}</span>
            {option.description && <span className="segmented-control-description">{option.description}</span>}
          </button>
        );
      })}
    </div>
  );
}
