import { memo } from "react";
import type { ReactNode } from "react";
import { Button } from "../ui/Button";
import { Icon } from "../ui/Icon";
import { Tooltip } from "../ui/Tooltip";

type PreviewState = "idle" | "live" | "playing" | "paused";

function formatMs(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, "0");
  const seconds = (totalSeconds % 60).toString().padStart(2, "0");
  return `${minutes}:${seconds}`;
}

export const PlaybackBar = memo(function PlaybackBar({
  previewState,
  playheadMs,
  durationMs,
  canPlay,
  onTogglePlayback,
  onJumpToStart,
  onJumpToEnd,
  actions
}: {
  previewState: PreviewState;
  playheadMs: number;
  durationMs: number;
  canPlay: boolean;
  onTogglePlayback: () => void;
  onJumpToStart: () => void;
  onJumpToEnd: () => void;
  actions?: ReactNode;
}) {
  return (
    <div className="playback-bar playback-bar-compact playback-toolbar">
      <div className="playback-actions playback-toolbar-group">
        <Tooltip content="Previous (Left)">
          <Button type="button" variant="soft" iconOnly aria-label="Jump to start" onClick={onJumpToStart} disabled={!canPlay} leading={<Icon name="skip-start" />} />
        </Tooltip>
        <Tooltip content={previewState === "playing" ? "Pause (Space)" : "Play (Space)"}>
          <Button
            type="button"
            variant="accent"
            iconOnly
            aria-label={previewState === "playing" ? "Pause" : "Play"}
            onClick={onTogglePlayback}
            disabled={!canPlay || previewState === "live"}
            leading={<Icon name={previewState === "playing" ? "pause" : "play"} />}
          />
        </Tooltip>
        <Tooltip content="Next (Right)">
          <Button type="button" variant="soft" iconOnly aria-label="Jump to end" onClick={onJumpToEnd} disabled={!canPlay} leading={<Icon name="skip-end" />} />
        </Tooltip>
      </div>
      <div className="playback-toolbar-center">
        <span className="playback-time-pill" aria-label={`Timeline position ${formatMs(playheadMs)} of ${formatMs(durationMs)}`}>
          {formatMs(playheadMs)} / {formatMs(durationMs)}
        </span>
      </div>
      <div className="playback-toolbar-group playback-toolbar-meta">{actions}</div>
    </div>
  );
});
