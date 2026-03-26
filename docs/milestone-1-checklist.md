# Milestone 1 Checklist

## Goal

Deliver a smooth local-use MVP for record, edit, save/open, and export on macOS, while tracking the remaining gaps against [docs/electron-macos-mvp-prd.md](./electron-macos-mvp-prd.md) and [docs/component-system.md](./component-system.md).

## Current Handoff Status

Last updated from implementation review and thread history on `2026-03-26`.

## Done

- Shareme branding is applied across user-facing surfaces.
- Electron macOS app is usable locally.
- Source listing works for window and screen sources.
- Record and stop flow works.
- Unified preview and timeline editor are in place.
- Zoom segments can be created, selected, edited, and deleted manually.
- Preview ratio locking and extra empty timeline space were fixed.
- Local import supports `mp4` and `mov`.
- Imported video returns the user to the editor flow.
- Background, look, and browser-frame toggles are available.
- Project modal, Look modal, Export modal, and Select Input modal are implemented.
- Save/open project flow exists and is usable.
- Tray flow is usable:
  - `Select Input` opens the real picker.
  - `Record` without a source routes through the picker.
  - `Open Editor` focuses/highlights the editor window.
- Basic hotkeys are implemented:
  - `Space`
  - `R`
  - `Left`
  - `Right`
  - `Cmd/Ctrl+S`
  - `E`
  - `Escape`
- Tooltips were added to many actions, including Project modal actions.
- Project modal save state was refined:
  - idle hidden
  - saving -> `Saving...`
  - saved -> `Saved`
  - error -> `Save failed`
- Local file loading no longer relies on `file://`; it now goes through `shareme-file://`.
- Import video and local background loading were patched through multiple rounds.
- Modal tooltip clipping was fixed by moving scrolling to the modal body.
- Top bar supports drag while interactive controls remain `no-drag`.
- Runtime icon and dock icon prefer the rounded asset at `build/icon.png`.
- Local mac packaging produces a `Shareme` artifact.
- Unsigned local mac build flow is working.

## Partial

- Auto zoom exists, but currently it is driven mainly by clicks in preview/editor, not by the full real capture-event pipeline required by the PRD.
- Capture metadata exists for project, recording, crop, and frame, but it is still not rich enough to fully reconstruct zoom timing and position from real session data.
- Save/open project works, but imported video currently rebuilds a recording session from file rather than restoring a richer project recovery scenario with full metadata.
- Capture failure handling and source picker states exist, but permission recovery and source-loss UX are still basic rather than polished.
- Component coverage is solid for top bar, workspace, inspector/drawer, modal, tooltip, button, form, and timeline, but the system still does not fully match the component-system brief.
- Runtime mac icon usage is acceptable, but proper `.icns` generation is still blocked by local `iconutil` or toolchain issues.
- Build and signing setup is prepared for later release work, but it is not yet release-grade.

## Missing

- Real browser-first or tab capture is not complete; the app still leans on window and screen capture in practice.
- Auto zoom generation from real click events and cursor movement during capture is not complete.
- Cursor path and click telemetry pipeline are not complete.
- Permission-guided UX for missing capture access is not fully developed.
- Source-disappear handling during an active or recent session is not fully developed.
- Component system gaps versus the brief remain:
  - no true glass sidebar or stable left rail
  - no `Table` primitive or full table surface
  - top-level IA still favors a compact editor shell over the fuller enterprise shell described in docs
- Signed and notarized mac release path is not implemented.
- Proper `.icns` packaging output is not implemented.

## Risks And Bugs To Remember

- `shareme-file://` protocol has been patched multiple times; if local import or background loading breaks again, debug the main-process protocol handler first.
- A React hook-order error like `Should have a queue` previously appeared after refactors under Fast Refresh; if it shows up again, restart the dev process before treating it as a product bug.
- Responsive preview still needs visual QA, especially for `9:16` in shorter window heights.

## Acceptance Snapshot

### Currently satisfied

- User can list browser/window sources and start a recording session.
- User can stop a recording session and attach it to the current local flow.
- User can create, edit, select, and delete zoom segments manually.
- User can save a project locally and reopen it.
- User can export locally to MP4 in `16:9`, `9:16`, and `1:1`.
- Export, save, and several capture-related states show visible feedback instead of silent failure.
- App runs as an unsigned local macOS build and packages locally.

### Not yet satisfied according to plan

- Browser-first capture is not yet truly browser or tab centric.
- Real capture metadata is not yet sufficient to reconstruct auto-zoom behavior from click and cursor telemetry.
- Project restoration is not yet as rich as the PRD expectation for recording metadata continuity.
- Permission recovery and source-loss handling are not yet polished enough for acceptance-grade UX.
- Component-system layout still does not fully match the documented left rail / center canvas / right rail structure.
- Signing and notarization readiness are not complete.

## Smoke Checklist

1. Open the app on macOS.
2. Refresh capture sources and select a browser or window.
3. Start and stop a recording session.
4. Click in the preview to create a zoom segment.
5. Select the zoom segment and edit scale, timing, and focus point.
6. Save the project, close it, and reopen it.
7. Import a local `mp4` or `mov` file and confirm editor recovery.
8. Export the same project to `16:9`, `9:16`, and `1:1`.
9. Confirm export path, progress state, and final completion state.

## Regression Watchlist

- Project schema changes that drop recording, cursor, or export metadata.
- Export behavior that no longer respects source-video overrides or cancellation.
- Zoom edits that mutate shared state or lose selection after save/open.
- `shareme-file://` regressions that break imported video or local background assets.
- Failure paths that fall through without a visible error state.
- Layout regressions in responsive preview or timeline, especially at `9:16`.

## Suggested Next Threads

- `Hoàn thiện browser/tab capture thật + auto zoom metadata pipeline`
- `Polish responsive preview/timeline bằng visual QA theo 3 ratio`
- `Hoàn thiện mac icon/build signing path (.icns, notarization)`
