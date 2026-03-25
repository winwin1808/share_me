# Glass Ant Design Guideline

## Direction
- Blend Ant Design information hierarchy with a light glassmorphism visual language.
- Keep the app readable first: glass is decorative, not an excuse to reduce contrast.
- Use a clean enterprise structure with distinct navigation, editing, and inspector zones.

## Visual Rules
- Primary color: `#1677ff`.
- Light backgrounds with soft blue gradients.
- Panels, cards, sidebars, and modals use translucent white surfaces with blur.
- Borders stay subtle and blue-tinted; avoid heavy dark outlines.
- Radius should feel modern but restrained: `12px`, `18px`, `24px` tiers.
- Shadows should be soft and layered, not dramatic.

## Layout Rules
- Desktop shell is a three-zone layout: sidebar, workspace, inspector.
- Keep the full editor visible inside one screen whenever possible.
- Only local panels scroll. The page root should not scroll on desktop.
- Timeline belongs directly below the preview surface.
- Use a compact top bar for global actions and status.

## Component Rules
- Use icon-first controls for repetitive secondary actions like refresh, open, and quick transport.
- Keep text labels for primary actions like `Save`, `Record`, and `Export`.
- Buttons, forms, tables, and modals all use the same surface, border, and shadow tokens.
- Segmented controls are preferred for short mode switches such as frame ratio and crop mode.
- Empty, loading, disabled, selected, and error states must be visually distinct.

## Accessibility Rules
- Maintain clear contrast between text and translucent surfaces.
- Provide focus-visible outlines on all interactive controls.
- Do not rely on blur or color alone to communicate state.
- Status badges should pair color with a label.

## App-Specific Application
- Capture setup lives in the sidebar with source, frame ratio, and crop mode controls.
- Preview uses the selected frame ratio before recording starts.
- Crop region uses a visible bordered overlay on the preview.
- Zoom edits are represented as event chips on the horizontal timeline below the preview.
- Export actions stay in the inspector so the center canvas remains focused on editing.
