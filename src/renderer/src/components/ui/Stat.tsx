export function Stat({
  label,
  value,
  tone = "neutral"
}: {
  label: string;
  value: string;
  tone?: "neutral" | "accent" | "success" | "warning";
}) {
  return (
    <div className={`ui-stat ui-stat-${tone}`}>
      <span className="ui-stat-value">{value}</span>
      <span className="ui-stat-label">{label}</span>
    </div>
  );
}

