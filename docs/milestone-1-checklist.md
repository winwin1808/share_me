# Milestone 1 Checklist

## Goal

Deliver a smooth local-use MVP for record, edit, save/open, and export on macOS.

## Definition Of Done

- User can list browser/window sources and start a recording session.
- User can stop recording and the recording is attached to the current local project.
- User can create, select, edit, and delete zoom segments from the timeline.
- User can save a project locally and reopen it without losing the recording reference or zoom edits.
- User can export completed media locally in `16:9`, `9:16`, and `1:1`.
- Export flow shows progress, completion, and explicit error/cancel states.
- Capture, project, and export failures surface readable messages instead of silent failure.
- All milestone-1 tests, typecheck, and build checks pass before review.

## Smoke Checklist

1. Open the app on macOS.
2. Refresh capture sources and select a browser/window.
3. Start and stop a recording session.
4. Click in the preview to create a zoom segment.
5. Select the zoom segment and edit scale, timing, and focus point.
6. Save the project, close it, and reopen it.
7. Export the same project to `16:9`, `9:16`, and `1:1`.
8. Confirm the export path, progress state, and final completion state.

## Regression Watchlist

- Project schema changes that drop recording or export metadata.
- Export behavior that no longer respects source-video overrides or cancelation.
- Zoom edits that mutate shared state or lose selection after save/open.
- Failure paths that fall through without a visible error state.

