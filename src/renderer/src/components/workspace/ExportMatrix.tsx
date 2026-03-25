import type { ExportPreset } from "../../../../shared/types";
import { StatusBadge } from "../ui/StatusBadge";
import { Button } from "../ui/Button";
import { Panel } from "../ui/Panel";

export function ExportMatrix({
  presets,
  recordingReady,
  status,
  progress,
  outputPath,
  error,
  onExport
}: {
  presets: ExportPreset[];
  recordingReady: boolean;
  status: string | null;
  progress: number;
  outputPath?: string;
  error?: string;
  onExport: (preset: ExportPreset) => void;
}) {
  return (
    <Panel eyebrow="Delivery" title="Export presets" actions={status ? <StatusBadge tone="warning">{status}</StatusBadge> : undefined}>
      <div className="export-grid">
        {presets.map((preset) => (
          <Button key={preset.aspectRatio} type="button" variant="solid" disabled={!recordingReady} onClick={() => onExport(preset)}>
            Export {preset.aspectRatio}
          </Button>
        ))}
      </div>
      <p className="helper-text">
        {recordingReady ? "Offline rendering is available from the local recording cache." : "Record a source first to enable export."}
      </p>
      {status && (
        <div className="export-progress">
          <span>{Math.round(progress * 100)}%</span>
          <span>{outputPath || error || "Preparing..."}</span>
        </div>
      )}
    </Panel>
  );
}
