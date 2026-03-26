# Electron macOS MVP PRD

## 1. Purpose

Build a macOS-first Electron app for browser-based screen recording with automatic zoom and pan, editable zoom timelines, offline local export, and local project file storage under the Shareme brand.

This document defines the implementation-ready requirements for the MVP. It is intentionally scoped to deliver a shippable local app first, while reserving a clean path for future code signing and notarization.

## 2. Product Goals

- Let a user record browser content on macOS and automatically generate polished zoom-and-pan edits from clicks and cursor movement.
- Let a user inspect and edit zoom segments on a timeline with precise control over position, scale, duration, and easing.
- Let a user export the final video fully offline on their machine.
- Let a user save and reopen local project files without cloud dependency.
- Keep the app architecture ready for future desktop capture, cloud, and signing expansion without blocking MVP delivery.

## 3. Scope

### In scope

- Electron desktop app for macOS.
- Browser-first capture flow using browser/window sources.
- Auto zoom generation from click events and cursor position.
- Manual zoom editing in a timeline/editor.
- Background selection using preset themes and custom image upload.
- Browser frame visibility toggle.
- Local project file create, open, edit, and save.
- Offline export to MP4 with multiple aspect ratios.
- Unsigned local build for now.
- CI support for future signed and notarized release paths.

### Out of scope

- Full desktop capture for arbitrary macOS apps in the MVP.
- Cloud recording, cloud rendering, cloud sharing, and sync.
- Account system, billing, team workspace, and collaboration.
- Firefox support.
- Audio, microphone, camera, transcription, and 4K export in the MVP.
- Advanced subtitle, transcript, and highlight editing.

## 4. Personas

### Casual creator

- Wants a fast way to turn a browser recording into a clean, polished walkthrough.
- Cares about simple setup, automatic framing, and minimal editing time.

### Product educator

- Wants to create short demos and feature tours with visible focus on the important UI region.
- Cares about repeatable exports in different aspect ratios.

### Internal operator

- Wants a stable local workflow and predictable project storage.
- Cares about inspectable data, recoverability, and easy debugging.

## 5. User Flows

### Flow A: Create and record a browser session

1. User opens the app.
2. App lists available browser/window sources.
3. User selects a source and starts recording.
4. App captures video plus source metadata.
5. User stops recording.
6. App stores the recording locally and attaches it to the current project.

### Flow B: Auto-generate and edit zooms

1. User clicks inside the preview during review or recording.
2. App creates a zoom segment centered on the click position.
3. User views the timeline and selects a zoom segment.
4. User edits start, end, scale, target point, follow-cursor mode, and easing.
5. User removes segments that are not needed.

### Flow C: Prepare the visual treatment

1. User chooses a background preset or uploads a custom image.
2. User toggles browser frame visibility.
3. Preview updates immediately so the user can validate framing.

### Flow D: Export locally

1. User chooses an aspect ratio preset.
2. App renders the video locally without network dependency.
3. App writes the MP4 output to a local path selected by the user.
4. User can export the same project into multiple aspect ratios.

### Flow E: Save and reopen a project

1. User saves the current project as a local project file.
2. User later opens the project file again.
3. App restores recording metadata, zoom timeline, background settings, and export presets.

## 6. Functional Requirements

### Capture

- The app must support browser-first source selection.
- The app must expose available browser/window capture sources on macOS.
- The app must capture enough metadata to reconstruct zoom timing and position.
- The app must support a staged architecture where desktop capture can be added later without redesigning the editor or project model.
- The app must fail clearly if capture permissions are missing or the selected source disappears.

### Zoom logic

- The app must generate zoom segments from click events.
- Each zoom segment must store `startMs`, `endMs`, `targetX`, `targetY`, `scale`, `followCursor`, and `easing`.
- The user must be able to add, remove, and edit zoom segments manually.
- The editor must preserve segment ordering and timeline correctness.
- The preview must show the currently active zoom at the current playhead time.

### Editor

- The app must provide a preview surface and a timeline editor.
- The app must allow background selection from presets.
- The app must allow uploading a custom background image.
- The app must allow hiding the browser frame for a cleaner look.
- The app must provide visible selection state for the active zoom segment.

### Export

- The app must export locally on the user machine.
- The export must not require network access.
- The app must support at least `16:9`, `9:16`, and `1:1`.
- The same project must be exportable to multiple aspect ratios without rewriting the source project.
- The app must provide export progress and error state.

### Project persistence

- The app must create, open, and save local project files.
- Project data must be versioned.
- Project files must preserve the recording reference, zoom timeline, cursor path, background settings, export presets, and frame visibility.
- The app must be able to load older `ProjectFileV1` data without breaking.

### Build and release

- The default distribution state must be an unsigned local build.
- The build pipeline must already support later signing and notarization.
- The codebase must keep signing config isolated from the app domain logic.
- The CI pipeline must build the app on macOS and produce artifacts suitable for local testing and packaging.

## 7. Component System Requirements

The app needs a separate component system that can be reused across editor, inspector, timeline, and export surfaces.

### Structural rules

- Components must be composable and narrowly scoped.
- Each component must have a clear responsibility and not combine layout, state, and side effects unless necessary.
- Layout primitives, form controls, timeline items, cards, badges, and preview surfaces must follow the same visual and interaction rules.
- Components must be documented with their expected props, state, and interaction states.

### State model rules

- Every interactive component must define its state explicitly.
- Components must distinguish at least `default`, `hover`, `focus`, `active`, `selected`, `disabled`, `loading`, and `error` states where relevant.
- State should be represented through typed props and predictable local state, not ad hoc styling only.
- Empty states and error states must be first-class and not hidden behind generic placeholders.

### Visual rules

- The base palette must be monochrome-friendly and work well in grayscale.
- Color usage must come from theme tokens, semantic tokens, and status accents rather than decorative rainbow styling.
- Radius should be moderate and consistent, not sharp and not overly pill-shaped.
- Visual hierarchy must come from spacing, contrast, elevation, and typography first.
- Color diversity is allowed and required through tokens for accents, statuses, backgrounds, and focus states, but the system must remain controlled and restrained.

### Component categories

- Navigation and shell components.
- Project and capture controls.
- Timeline and segment components.
- Editor preview and framing components.
- Inspector form components.
- Export job and progress components.

## 8. Non-Goals

- No cloud sync or collaboration in MVP.
- No multi-user auth or billing flows.
- No desktop-wide app capture in MVP.
- No advanced media editing beyond zoom, crop, and framing.
- No mobile client.
- No Firefox support in MVP.
- No enterprise deployment features.

## 9. Acceptance Criteria

### Capture

- A user can list browser/window sources on macOS.
- A user can start and stop a recording session successfully.
- The app surfaces a clear error if capture permissions fail.

### Timeline editing

- A click in the preview creates a zoom segment at the current time.
- A user can select a zoom segment and edit its fields.
- A user can delete a zoom segment.
- The active zoom in preview changes according to playhead time.

### Export

- A user can export at least one completed project locally to MP4.
- The app can export the same project in multiple aspect ratios.
- The app surfaces export progress and completion state.
- The app does not require cloud access for export.

### Project files

- A user can save a project and reopen it later.
- The reopened project restores recorded media metadata and editing state.
- A project file can be versioned and upgraded without data loss for current fields.

### Release and build

- The app runs as an unsigned local macOS build now.
- CI builds the app on macOS.
- The release pipeline can later accept signing secrets without changing core product logic.

## 10. Dependencies

- Electron runtime and macOS packaging tooling.
- Browser source capture support on macOS.
- Local video export tooling such as `ffmpeg`.
- A local file picker and project save/open permissions.
- Future Apple Developer signing assets for later notarized releases.

## 11. Risks and Constraints

- Browser-first capture is simpler than full desktop capture, but it constrains the first release surface.
- Local export quality depends on the stability of the rendering pipeline and codec configuration.
- Unsigned builds are acceptable for local development but not for polished external distribution.
- The project file schema must be versioned from day one to avoid breaking saved edits.

## 12. Release Strategy

### Phase 1

- Ship unsigned local builds for development and validation.
- Keep signing hooks and packaging configuration in place, but inactive by default.

### Phase 2

- Enable Developer ID signing.
- Add notarization and DMG packaging for distribution.
- Keep the same app behavior and project format across the transition.

## 13. Open Implementation Notes

- Browser capture must be designed as an adapter so desktop capture can be added later.
- Zoom generation and manual editing should share the same `ZoomSegment` model.
- Project persistence should remain local-first even if cloud storage is added later.
- UI components should use a restrained monochrome base with theme tokens providing semantic diversity.
- Any future component library should preserve the same state model and visual rules across the app.
