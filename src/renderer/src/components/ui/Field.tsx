import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";

interface FieldShellProps {
  label: string;
  hint?: string;
  children: ReactNode;
}

export function FieldShell({ label, hint, children }: FieldShellProps) {
  return (
    <label className="field-shell">
      <span className="field-label">{label}</span>
      {children}
      {hint && <span className="field-hint">{hint}</span>}
    </label>
  );
}

export function TextField(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input className="ui-field" {...props} />;
}

export function SelectField(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className="ui-field" {...props} />;
}

export function TextAreaField(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className="ui-field ui-textarea" {...props} />;
}
