import { Panel } from "../ui/Panel";

export function SystemPanel({ summary }: { summary: string }) {
  return (
    <Panel eyebrow="Runtime" title="System">
      <p className="system-summary">{summary}</p>
    </Panel>
  );
}
