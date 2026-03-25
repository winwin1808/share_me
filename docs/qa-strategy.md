# QA Strategy

## Goal

Verify the shared app logic for the Electron macOS MVP without coupling tests to renderer or Electron runtime behavior. The focus is on project model stability, zoom behavior, source capture assumptions, and export command generation.

## Scope

- Project defaults and backward-compatible normalization.
- Zoom segment creation, selection, and immutable updates.
- Capture source inference for browser/window discovery.
- Export adapter behavior around aspect-ratio filtering, cancelation, and progress emission.

## Out of Scope

- Full browser automation.
- Native macOS permission flows.
- Visual regression for the renderer.
- Signed/notarized packaging validation in CI.

## Test Layers

- `shared/unit`: pure helpers such as project and zoom utilities.
- `adapter/unit`: mocked Electron and ffmpeg interactions for capture/export service behavior.
- `contract`: ensure shared types and defaults remain aligned with editor assumptions.

## Acceptance Criteria

- New project files always start with version `1`, empty recordings, empty zooms, and default export presets.
- Missing optional project fields are normalized safely when opening older files.
- Zoom segments always default to a bounded duration, centered focus, and non-follow-cursor mode.
- Browser-like source names map to browser source types; unknown names fall back to desktop window.
- Export requests produce the expected scaling/padding command for `16:9`, `9:16`, and `1:1`.

## Notes

- Keep tests deterministic by mocking `crypto.randomUUID`, Electron APIs, and child processes where needed.
- Prefer tests that fail on contract drift instead of implementation detail unless the implementation detail is the contract.
