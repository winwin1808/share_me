import { Button } from "../ui/Button";
import { Panel } from "../ui/Panel";
import { StatusBadge } from "../ui/StatusBadge";

type PreviewState = "idle" | "live" | "playing" | "paused";

function toneForState(state: PreviewState) {
  switch (state) {
    case "live":
      return "success";
    case "playing":
      return "accent";
    case "paused":
      return "warning";
    default:
      return "neutral";
  }
}

function labelForState(state: PreviewState) {
  switch (state) {
    case "live":
      return "recording";
    case "playing":
      return "playing";
    case "paused":
      return "paused";
    default:
      return "idle";
  }
}

function formatMs(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, "0");
  const seconds = (totalSeconds % 60).toString().padStart(2, "0");
  return `${minutes}:${seconds}`;
}

export function PlaybackBar({
  previewState,
  playheadMs,
  durationMs,
  canPlay,
  onTogglePlayback,
  onSeek,
  onJumpToStart,
  onJumpToEnd
}: {
  previewState: PreviewState;
  playheadMs: number;
  durationMs: number;
  canPlay: boolean;
  onTogglePlayback: () => void;
  onSeek: (nextMs: number) => void;
  onJumpToStart: () => void;
  onJumpToEnd: () => void;
}) {
  const max = Math.max(1, durationMs);

  return (
    <Panel
      eyebrow="Playback"
      title="Preview controls"
      actions={<StatusBadge tone={toneForState(previewState)}>{labelForState(previewState)}</StatusBadge>}
      tone="raised"
    >
      <div className="playback-bar">
        <div className="playback-actions">
          <Button type="button" variant="accent" onClick={onTogglePlayback} disabled={!canPlay || previewState === "live"}>
            {previewState === "playing" ? "Pause" : "Play"}
          </Button>
          <Button type="button" variant="soft" onClick={onJumpToStart} disabled={!canPlay}>
            To start
          </Button>
          <Button type="button" variant="soft" onClick={onJumpToEnd} disabled={!canPlay}>
            To end
          </Button>
        </div>
        <label className="playback-scrubber">
          <span className="playback-time">
            {formatMs(playheadMs)} / {formatMs(durationMs)}
          </span>
          <input
            type="range"
            min={0}
            max={max}
            value={Math.min(playheadMs, max)}
            onChange={(event) => onSeek(Number(event.target.value))}
            disabled={!canPlay}
          />
        </label>
      </div>
    </Panel>
  );
}
