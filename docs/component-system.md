# Cursorful Desktop Component System

## 1. Goal

Build a disciplined component system for the Electron app that supports:

- Browser capture setup
- Recording state and source selection
- Zoom timeline editing
- Project persistence and export
- Future macOS signing / packaging states

The system should feel technical, calm, and precise. The current direction is light glassmorphism with Ant-like hierarchy: clear spacing, visible structure, controlled blue accents, and readable surfaces.

## 2. Information Architecture

### Primary surfaces

1. `Shell`
   - App chrome
   - Global status
   - Navigation between project, capture, edit, export, and settings
2. `Workspace`
   - Preview canvas
   - Timeline
   - Inspector
3. `Library`
   - Capture sources
   - Background presets
   - Export presets
4. `System`
   - Permissions
   - Build / signing status
   - Local file location

### Screen model

The app should always map to three stable zones:

- Top bar: global identity, high-signal state, and quick actions
- Left rail: project and capture controls
- Center canvas: recording preview above the unified timeline
- Right rail: selected item inspector and export

This layout is the default for desktop. On smaller widths, rails collapse into stacked panels without changing component contracts.

## 3. Component Inventory

### Navigation and structure

- `AppShell`
  - Wraps the entire app
  - Owns grid layout, background, and responsive rail collapse
- `GlassTopbar`
  - Global state, project summary, and icon-first actions
- `SectionPanel`
  - Generic framed container for grouped controls
  - Used for project, capture, look, export, and inspector blocks
- `PanelHeader`
  - Title, subtitle, and trailing actions
- `Toolbar`
  - Horizontal action strip for primary screen actions

### Capture and project

- `SourcePicker`
  - Lists desktop capture sources surfaced by Electron, primarily windows and screens
  - Shows source type, thumbnail, and active state
- `RecordControl`
  - Start / stop / pause controls
  - Shows capture readiness and recording status
- `ProjectField`
  - Editable text fields for project name, path, notes
- `StatusPill`
  - Short operational state: `idle`, `recording`, `ready`, `warning`, `error`

### Preview and timeline

- `PreviewStage`
  - Main canvas for playback and click-driven zoom capture
  - Supports overlay states and focus frame
- `BrowserFrame`
  - Optional browser chrome wrapper
  - Can be shown, hidden, or collapsed for cleaner preview
- `ZoomIndicator`
  - Read-only overlay showing active zoom target and scale
- `Timeline`
  - Single unified preview timeline
  - Renders zoom events, playhead, and scrub state on one bar
- `TimelineTrack`
  - Single logical lane for zoom blocks or cursor points
- `ZoomClip`
  - Editable time block
  - Represents one zoom segment
- `Playhead`
  - Current time marker
- `Scrubber`
  - Drag control for time navigation

### Inspector and editing

- `InspectorCard`
  - Right-rail detail panel
- `FormRow`
  - Label plus control pattern
- `NumberField`
  - For scale, X, Y, time, and duration
- `Toggle`
  - For follow cursor, browser frame, audio, and advanced options
- `SegmentEditor`
  - Editing controls for zoom block details
- `PresetPicker`
  - Background, export, and theme presets

### Export and system

- `ExportPresetCard`
  - Aspect ratio, destination name, and output flags
- `ProgressBar`
  - Export and build progress feedback
- `EmptyState`
  - Used for missing source, no recording, no zoom segments
- `ErrorBanner`
  - Used for permission, export, and packaging failures
- `SystemBadge`
  - Displays signing, build, and platform status

## 4. State Model

### Global app state

- `project`
- `captureSources`
- `selectedSourceId`
- `recordingState`
- `elapsedMs`
- `selectedZoomId`
- `exportJob`
- `systemInfo`
- `permissionsState`

### Component state rules

- Keep canonical project data in a single store or reducer.
- Components should receive immutable slices plus explicit callbacks.
- Avoid local state that duplicates project truth.
- Transient UI state is allowed for:
  - open menus
  - active drag
  - hover
  - temporary text input
  - inline validation

### State variants

#### App shell

- `default`
- `compact`
- `loading`
- `offline`
- `error`

#### Capture states

- `idle`
- `source-selected`
- `ready-to-record`
- `recording`
- `stopping`
- `recorded`
- `permission-blocked`

#### Timeline states

- `empty`
- `has-segments`
- `segment-selected`
- `playing`
- `scrubbing`
- `out-of-range`

#### Export states

- `not-available`
- `ready`
- `queued`
- `exporting`
- `completed`
- `failed`

## 5. Interaction Rules

### General

- Every action surface needs a visible idle, hover, focus, disabled, and loading state.
- Primary action must always be visually stronger than secondary action.
- Destructive actions must require an explicit affordance and never look like primary actions.
- Keyboard focus must be visible in all components.

### Capture

- Selecting a source immediately updates the capture preview.
- Starting record switches the preview into live mode and locks source switching unless the app supports re-capture.
- Clicking inside the preview during capture creates a new auto-zoom segment at that timestamp.

### Timeline editing

- Clicking a zoom clip selects it and loads its fields into the inspector.
- Dragging the edges of a zoom clip changes timing.
- Dragging the body changes position in the timeline if reordering is allowed.
- Number fields must clamp to legal values instead of silently breaking layout.

### Export

- Export presets should be selectable without mutating the original project data.
- The user must see output ratio, target name, and readiness before export starts.
- Export progress should be interruptible where the underlying render pipeline supports cancellation.

### File and build system

- Project open/save must always confirm file path or show an empty-state if unavailable.
- Signing state is informational in MVP, but the UI must reserve room for signed/unsigned distinction.

## 6. Visual System

### Principles

- Light glass surfaces should carry the layout, not heavy opaque blocks.
- Ant-style hierarchy: labels, cards, spacing, and strong action affordances.
- Color is reserved for status, identity, and high-signal state.
- Use moderate radius, not pill-heavy or sharp-rectangle extremes.
- Prefer soft separation over thick borders.

### Radius scale

- `radius-xs`: `8px`
- `radius-sm`: `10px`
- `radius-md`: `12px`
- `radius-lg`: `16px`
- `radius-xl`: `20px`
- `radius-2xl`: `24px`

Recommended default component radius:

- Controls: `12px`
- Cards and panels: `20px` to `24px`
- Pills/badges: `999px`

### Elevation and borders

- Use one border color family for the app, typically `neutral/line`.
- Use subtle inset or outer shadow only for active surfaces.
- Panels should read as layered glass or matte sheets, not neon blocks.

## 7. Color Strategy

### Base palette

The app should live in neutral light tones:

- `neutral-0`: app background
- `neutral-1`: glass surface
- `neutral-2`: elevated surface
- `neutral-3`: subtle border
- `neutral-4`: soft text
- `neutral-5`: primary text

### Color roles

Use a small set of disciplined accents:

- `accent-info`: blue for focus, links, and active playback
- `accent-success`: green for completed states
- `accent-warning`: amber for caution and draft states
- `accent-danger`: red for destructive or failed states
- `accent-violet`: reserved for identity or future feature grouping only

### Color rules

- Do not use accent colors as backgrounds for large panels.
- Do not use more than one strong accent per component surface.
- Data series, statuses, and export presets may each get their own distinct accent, but only through tokens, not hard-coded hex values.

## 8. Practical Token Model

### Primitive tokens

- `color.neutral.*`
- `color.accent.*`
- `space.*`
- `radius.*`
- `shadow.*`
- `motion.*`
- `font.*`

### Semantic tokens

- `bg.app`
- `bg.surface`
- `bg.surfaceElevated`
- `bg.overlay`
- `border.default`
- `border.focus`
- `text.primary`
- `text.secondary`
- `text.muted`
- `text.inverse`
- `action.primary`
- `action.secondary`
- `action.danger`
- `state.info`
- `state.success`
- `state.warning`
- `state.error`

### Component contracts

Each component should define:

- `base`
- `variant`
- `size`
- `state`
- `tone`

Example:

- `Button` variants: `primary`, `secondary`, `ghost`, `danger`
- `Button` sizes: `sm`, `md`, `lg`
- `Button` states: `default`, `hover`, `pressed`, `disabled`, `loading`
- `Badge` tones: `neutral`, `info`, `success`, `warning`, `danger`

## 9. Implementation Contracts

### Button

- Minimum height: `40px`
- Radius: `12px`
- Loading state must preserve width and suppress duplicate clicks
- Icon-only buttons need accessible labels

### Input

- One-line fields, numeric fields, and selects share the same baseline height
- Error state must be visible without relying on color alone

### Panel

- Must support header, body, and optional footer
- Default padding: `16px` to `20px`

### Timeline item

- Must support selected, hovered, drag-active, and locked states
- Needs room for time range, label, and metadata chip

### Preview stage

- Must support empty, loading, live, paused, and recorded states
- Overlay controls should never block core playback interaction unless explicitly in edit mode

## 10. Do Not Do

- Do not ship a rainbow UI or product-marketing palette.
- Do not use sharp radius for one component and pill radius for everything else.
- Do not encode state only by color.
- Do not let local component state diverge from project truth.
- Do not create bespoke components for one-off styling if a tokenized variant can solve it.
