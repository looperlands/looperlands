---
name: Mapmaker Toolbox
description: Light local authoring and playtest workspace for LooperLands.
colors:
  background: "#ffffff"
  panel: "#f7f8fa"
  input: "#ffffff"
  hover: "#edf1f5"
  text: "#202936"
  muted: "#596575"
  accent: "#2563eb"
  line: "#dde2e8"
  control-line: "#aeb8c5"
  error: "#a52828"
  selected: "#e7eef9"
  selected-text: "#1e4f9d"
  wordmark: "#50384b"
  dialogue-preview-background: "#342433"
  dialogue-preview-text: "#fff4df"
  dialogue-item: "#fce045"
  dialogue-danger: "#ffa3a1"
  dialogue-wave: "#b3d9ff"
typography:
  body:
    fontFamily: 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
    fontSize: "14px"
    lineHeight: 1.5
  pane-heading:
    fontSize: "22px"
    fontWeight: 650
    lineHeight: 1.3
  label:
    fontSize: "13px"
    fontWeight: 550
    lineHeight: 1.4
  wordmark:
    fontFamily: "GraphicPixel, Georgia, serif"
    fontSize: "23px"
    lineHeight: 1.4
  code:
    fontFamily: "ui-monospace, SFMono-Regular, Consolas, monospace"
    fontSize: "12px"
    lineHeight: 1.7
  dialogue-preview:
    fontFamily: "GraphicPixel, Georgia, serif"
    fontSize: "16px"
    lineHeight: 1.65
rounded:
  control: "4px"
components:
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.background}"
    rounded: "{rounded.control}"
    padding: "8px 13px"
  input:
    backgroundColor: "{colors.input}"
    textColor: "{colors.text}"
    rounded: "{rounded.control}"
    padding: "8px 10px"
  navigation-selected:
    backgroundColor: "{colors.selected}"
    textColor: "{colors.selected-text}"
    rounded: "{rounded.control}"
  dialogue-preview:
    backgroundColor: "{colors.dialogue-preview-background}"
    textColor: "{colors.dialogue-preview-text}"
    typography: "{typography.dialogue-preview}"
    padding: "15px"
---

# Design System: Mapmaker Toolbox

## Overview

This reference applies only to the local Toolbox served from `/local/`: Playtest, Build tools, Quest builder, Troubleshoot and Documentation. It records the implementation in [launcher.css](launcher.css), [index.html](index.html) and [dialogueeditor.js](dialogueeditor.js).

The Toolbox is a straightforward workspace with white and gray surfaces, blue actions, readable forms and a left sidebar. LooperLands branding lives in the header, wordmark and heading hierarchy. The wordmark is the only pixel-font workspace chrome; the embedded dialogue preview intentionally shows game typography and colors.

The [existing Looperlands game foundations](../../opendesign/design-systems/looperlands/README.md) describe the game and its chat prototype. Keep that system independent: this reference does not change game colors, fonts, panels or gameplay UI.

## Colors

Blue identifies primary actions, focus and selection. White is the working surface; pale gray panels and subtle borders group related controls. Muted text supports labels and guidance without competing with editable values.

Use the error color for failed actions and validation notices. Existing green and amber status treatments communicate completed, warning and unsaved states; accompany them with text. The subdued wordmark color is a branding detail rather than a general action color.

The dialogue preview alone uses a dark game surface with warm text, gold item emphasis, red danger emphasis and blue wave emphasis. Keep this preview palette scoped to the rendered game content.

## Typography

Use the system sans stack for headings, navigation, controls and reading text. The header title is compact (18px); pane headings use the role above. Documentation titles are slightly larger (24px) and body paragraphs have relaxed line height (1.8).

Use monospace for IDs, URLs, commands, JSON, build output and editable dialogue source. Keep labels and help text in sentence case. Reserve GraphicPixel for the LooperLands wordmark and rendered dialogue preview; pixel artwork previews retain their original rendering. Dialogue source stays monospace (13px, line height 1.7), with toolbar controls in the workspace sans stack.

## Layout

The workspace fills the viewport width. At desktop sizes, a full-width sticky header (88px) sits above a fixed left sidebar (220px) and a flexible content column. Content padding is generous (32px 40px 56px), with no centered page-width cap. Keep form sections separated by whitespace and horizontal rules.

Quest builder uses a quest list beside its editor. Documentation has a guide list beside reading content, with the article limited to 78ch. These local columns sit inside the shared Toolbox shell.

At 1100px and below, the main sidebar narrows to 190px and internal spacing tightens. At 820px and below, the header and tool navigation return to normal flow; tool navigation becomes a labelled native select with the current tool selected, documentation becomes one column, and quest fields stack. At 540px and below, the quest list moves above the editor, form sections stack and primary actions expand for the available width. Support a minimum viewport width of 320px.

## Elevation & Depth

Use flat surfaces, tonal grouping and one-pixel borders. The asset-results popup is the existing exception, with a small shadow (`0 8px 20px #1e293b1a`) to distinguish it from the form beneath it. Avoid introducing decorative depth into ordinary panels.

## Shapes

Controls and grouped surfaces use small corners through the control radius. Inputs have a stronger border than structural dividers. Keep the simple rectangular form language; the Toolbox does not use the game's stepped pixel frames.

## Components

- **Buttons:** neutral white by default; blue with white text for primary actions. Standard controls have a minimum height of 40px and primary buttons 42px; the compact dialogue toolbar uses 30px buttons. Disabled controls reduce emphasis and remain visibly disabled.
- **Fields:** visible labels above full-width inputs, selects and textareas; guidance below. Preserve native input behavior. Keyboard-focusable elements use a blue focus outline (2px, normally with a 3px offset); dialogue toolbar and source outlines stay inside their editor boundary.
- **Navigation:** plain labels in the left sidebar, a subtle blue selected surface and stronger selected text. Keep selected state available through the existing ARIA state as well as color.
- **Quest editor:** separate the quest list, metadata, dialogue, objectives and rewards with clear headings and spacing. Each objective is a bordered pale surface with its own controls.
- **Dialogue editor:** group a wrapping style toolbar, editable source and live static game preview in one bordered editor. Offer Item, Danger, Wave and Shake styles, the Danger + shake preset, Remove styles and Undo. The in-progress editor adds `{{remaining}}`, `{{done}}` and `{{amount}}` insertion controls when supported. Its preview uses sample values of 7 remaining, 3 done and 10 total. Wave and shake animate in the game; the Toolbox preview remains static and labels this limit.
- **Documentation:** readable paragraphs, ordered steps, conventional links and restrained code backgrounds. Keep the four Markdown guides in `docs/mapmaker-*.md` as the user-facing content source.
- **Status and output:** place feedback near its action; use readable, selectable monospace output with wrapping and scrolling for long build logs, commands and JSON.

## Do's and Don'ts

- Do keep new Toolbox screens consistent with these light surfaces, system sans text and blue actions.
- Do preserve full-width working space and responsive navigation behavior.
- Do keep branding concentrated in the header and clear heading hierarchy.
- Don't apply this surface's styles to the game or rewrite the existing game design system to match it.
- Don't extend the pixel font beyond the wordmark and rendered dialogue preview to editable fields, controls, navigation or documentation.
- Don't extend the dialogue preview's dark game palette to the surrounding workspace or add decorative game panels to routine Toolbox tasks without a new user direction.

## Authoring workspaces

Tile actions keep identity fields above Stages/Farming, Map placement and Preview tabs. Use the standard selected blue surface and underline for the active tab, with keyboard arrow navigation. Costs, rewards and care boosts use native details to disclose optional settings. Chance inputs show percentages while source files retain fractional values. Desktop tile and NPC editors keep their save toolbar visible during scrolling.

NPC waypoint rows use native details: their summaries show the waypoint number, coordinates and wait; opening a row selects that point on the route. World connections puts labelled search/direction filters before the results, preserves filters across map selection and paginates 12 entrances at a time. Its graph and source coverage expand on demand. These controls retain the existing flat surfaces and small control radius.
