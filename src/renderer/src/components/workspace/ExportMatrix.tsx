import type { ExportJob, ExportPreset } from "@shared/types";
import { EmptyState } from "../ui/EmptyState";
import { StatusBadge } from "../ui/StatusBadge";
import { Button } from "../ui/Button";
import { Panel } from "../ui/Panel";
import { Icon } from "../ui/Icon";

export function ExportMatrix({
  presets,
  recordingReady,
  status,
  progress,
  outputPath,
  error,
  onExport,
  onCancel
}: {
  presets: ExportPreset[];
  recordingReady: boolean;
  status: ExportJob["status"] | null;
  progress: number;
  outputPath?: string;
  error?: string;
  onExport: (preset: ExportPreset) => void;
  onCancel: () => void;
}) {
  const tone = status === "failed" ? "danger" : status === "completed" ? "success" : "warning";
  return (
    <Panel
      eyebrow="Delivery"
      title="Export presets"
      actions={
        status ? (
          <>
            <StatusBadge tone={tone}>{status}</StatusBadge>
            {status === "running" && (
              <Button type="button" variant="ghost" leading={<Icon name="cancel" />} onClick={onCancel}>
                Cancel
              </Button>
            )}
          </>
        ) : undefined
      }
    >
      {!recordingReady ? (
        <EmptyState title="Record first" description="Finish a local recording before exporting MP4 files." />
      ) : (
        <>
          <div className="export-grid">
            {presets.map((preset) => (
              <Button
                key={preset.aspectRatio}
                type="button"
                variant="solid"
                leading={<Icon name="export" />}
                disabled={!recordingReady || status === "running"}
                onClick={() => onExport(preset)}
              >
                Export {preset.aspectRatio}
              </Button>
            ))}
          </div>
          <p className="helper-text">Offline rendering is available from the local recording cache.</p>
        </>
      )}
      {status && (
        <div className="export-progress">
          <span>{Math.round(progress * 100)}%</span>
          <span>{outputPath || error || "Preparing..."}</span>
        </div>
      )}
    </Panel>
  );
}
