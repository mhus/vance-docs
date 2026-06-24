---
title: "Responsive Focus Layout"
parent: Specs
permalink: /specs/responsive-focus-layout
---

<!-- AUTO-GENERATED from specification/public/en/responsive-focus-layout.md — do not edit here. -->

---
# Responsive Focus Layout

> Layout pattern for multi-zone editors with fluid resizing based on user attention. Implemented in `<EditorShell>` (`specification/web-ui.md` §7.2.1) and validated in the pilot in `chat.html` (`planning/web-ui-focus-pilot.md`).

## 1. Problem

Editors with multiple zones—Sidebar, Main area, Right-Panel, Footer—have three traditional compromises when space is limited:

1. **Static columns + scrollbars.** Everything remains visible, but each zone is equally (too) small everywhere. Does not scale to tablets or narrow browser windows.
2. **Collapse/Expand buttons.** Sidebar or panel can be opened/closed. Binary state, context is lost (closed panel no longer knows what was inside); each action requires an extra click.
3. **Resize-Handles (Drag-to-Resize).** Manually precise, but semantic-free—the user must decide what is important; does not adapt automatically to their activity.

**Observation:** The user always works *on one thing at a time*. The moment they click on the list, the list is important. The moment they use the composer, the composer is important. A UI that follows this shift feels more responsive than any static division.

## 2. Concept — Single-Focus-Zone

**Basic rule:** Exactly one of the zones is *in focus* at any given time. The others are *not in focus*. Both states are simultaneously visible—none are completely collapsed—but the size and color distribution make it clear where the user is currently working.

### 2.1 Zones

| Zone | Position | Optional | Typical Content |
|---|---|---|---|
| Main | center | no | primary content: Chat-Stream, List, Editor |
| Sidebar | left | yes | Navigation, Filters, Hierarchy |
| Right | right | yes | Details, Help, Tools, Wizards, Live Status |
| Footer | bottom (full-width) | yes | Composer, Action-Bar, Reply field |

### 2.2 Three Visualizations per Focus State

1. **Size.** Focused zone becomes wider (Right: `20rem → 32rem`, Sidebar: `16rem → 24rem`). Non-focused zones shrink to a *compact width* that is still readable/usable.
2. **Background.** Focused zone gets `base-100` (light, white), non-focused zones get the editor surround `base-200` (gray). They visually merge with the background.
3. **Reclaim-Handle.** At each boundary between two zones, there is a small chip (`›`/`‹`/`▴`) that allows the user to click on the non-focused zone to bring it back into focus. The anchor is the grid container, not the zone—the handle remains clickable even if the zone collapses to width 0.

All three react synchronously with a `200ms ease-out` transition, so the eye perceives the shift as *one* movement.

### 2.3 Symmetry Rule (Main/Footer Focus)

When the focus is on Main or Footer, Sidebar and Right widths are **equal**—this applies both in the default state (Desktop: both `16rem`, Footer focus: both `14rem`) and on narrow viewports (Tablet/Phone: both `0`). Asymmetrical rails (e.g., Sidebar 16rem, Right 20rem) unintentionally draw the eye to the right; symmetry makes it clear that the center is the stage. The side zones only grow when they are *themselves* focused.

## 3. Trigger Model

The focus changes on the following actions:

| Action | Effect |
|---|---|
| `pointerdown` on a zone | Zone is focused |
| `focusin` on the Footer (Textarea, Button, …) | Footer is focused. `focusin` instead of `pointerdown` so that tab focus from the keyboard also works. |
| `pointerdown` outside the Editor-Body-Grid (Topbar, Page edge) | Focus returns to `main` |
| `Escape` globally | Focus returns to `main` (if not already there) |
| Click on a Reclaim-Handle | Zone of the handle is focused |
| Click on the Topbar-Title (if `titleClickable`) | Editor-specific: typically focus Sidebar or leave Sub-Page |

**Why `pointerdown` and not `click`?** `click` only fires after `mouseup`. If the focus is set only then, the user sees a not-yet-focused layout for ~20–50ms, even though they have already pressed the mouse button. With `pointerdown`, the shift takes effect immediately upon pressing, which significantly increases the perception of "instant responsiveness".

**Why `@pointerdown.stop` on Navigation-Buttons in the Sidebar?** A click on a Sidebar-Nav-entry means *"navigate, show me content in Main"*—not *"focus the Sidebar"*. Without `.stop`, the pointerdown would bubble to the Aside, briefly focus on Sidebar, and then switch back to Main after click. Visible flicker. `.stop` swallows the bubble.

**When the focus change belongs to `@click` (not `@pointerdown`).** For Sidebar-Nav-items whose click should switch to `focus='main'`, the Focus-Switch runs in the `@click`-handler—*not* already in the `@pointerdown`. Reason: on narrow viewports, the Sidebar collapses to 0 with `focus='main'`. If the Focus-Switch were to fire already in the `@pointerdown`, the target would have moved away from under the finger before `click` is triggered—mobile browsers cancel the click in this case, and navigation never happens. Pattern: `@pointerdown.stop` (bubble stopper only) plus `@click="navigate(); emit('focus-main')"`. On Desktop, this costs ~50ms of perceived latency, which is not noticeable in practice.

## 4. Implementation

### 4.1 CSS Grid with Variables

The Grid-Container declares CSS variables for each zone and references them in `grid-template-columns` / `grid-template-rows`:

```css
.editor-shell-grid {
  --shell-sidebar-w: 16rem;     /* default, when sidebar not focused */
  --shell-right-w: 20rem;        /* default, when right not focused */
  --shell-footer-h: auto;
  --shell-focus-duration: 200ms;

  display: grid;
  /* Tracks string is computed in TS based on which slots exist;
     widths come from the variables above. */
  transition:
    grid-template-columns var(--shell-focus-duration) ease-out,
    grid-template-rows var(--shell-focus-duration) ease-out;
}

/* Focus-driven overrides — pure CSS, no JS-recomputed styles. */
.editor-shell-grid[data-focus='sidebar'] { --shell-sidebar-w: 24rem; }
.editor-shell-grid[data-focus='right']   { --shell-right-w: 32rem; }
.editor-shell-grid[data-focus='footer']  { --shell-right-w: 14rem; }
```

The code logic only writes the value of `data-focus` to the container. CSS variables + selectors do the rest. Designers can tune values without touching TypeScript.

### 4.2 Responsive Collapse

Two breakpoints adjust the variables so that less is visible simultaneously on tablet and phone sizes. Both stages follow the same basic rule: in **Main or Footer focus, both Side-Rails are at 0**—the center area gets all the space, and L/R remain symmetrical (a hard convention of the model, see §2.3).

```css
/* Tablet (iPad portrait, ~768–900px). Sidebar collapses to 0 unless
 * explicitly focused; right is reclaimable via Handle but also 0 in
 * Main/Footer focus. */
@media (max-width: 900px) {
  .editor-shell-grid[data-focus]:not([data-help-open]) {
    --shell-sidebar-w: 0;
    --shell-right-w: 0;
  }
  .editor-shell-grid[data-focus='sidebar']:not([data-help-open]) {
    --shell-sidebar-w: 20rem;
  }
  .editor-shell-grid[data-focus='right']:not([data-help-open]) {
    --shell-right-w: 24rem;
  }
}

/* Phone (≤600px, covers iPhone 17 Pro portrait at 430px).
 * Inherits the "both 0 for main/footer" rule from the 900px breakpoint and
 * adds: the focused Side-Zone takes full width. */
@media (max-width: 600px) {
  .editor-shell-grid[data-focus='sidebar']:not([data-help-open]) {
    --shell-sidebar-w: 100%;
  }
  .editor-shell-grid[data-focus='right']:not([data-help-open]) {
    --shell-right-w: 100%;
  }
}
```

On Tablet, Main remains visible with substantial width in every focus mode. On Phone, the focused Side-Zone takes the entire width; Main shrinks to 0 and is brought back via Escape or Reclaim-Handle—the remaining edge case is documented in §7.

### 4.3 Reclaim-Handles

Anchored to the Grid-Container via `position: absolute`. Their `right` / `left` / `bottom` reference the same CSS variable as the respective track width, so the handle moves along the column boundary:

```css
.reclaim-handle-right {
  position: absolute;
  right: var(--shell-right-w);
  top: 50%;
  transform: translateY(-50%);
  ...
}
```

When `--shell-right-w` animates from 20rem to 32rem, the handle slides synchronously. If the zone collapses to 0, the handle sits at the outer edge of the container and remains clickable—the only way to bring the zone back.

### 4.4 Slot-based Composition

`<EditorShell>` receives four named slots (`#sidebar` / default / `#right-panel` / `#footer`). A zone only exists in the grid if its slot is occupied. Editors thus decide which zones are available through their slot inventory.

Slot detection occurs via two mechanisms:
- `slots.X` (Vue's `useSlots()`) — Default detection
- Explicit Props `:show-sidebar` / `:show-right-panel` / `:show-footer` — Override, if the slot is filled but should render empty (e.g., if the inner `v-if` is false and an empty rail would otherwise be visible)

### 4.5 State Ownership

`focusZone` is a Vue model Ref in `<EditorShell>`. Default: `'main'`. Editors bind it via `v-model:focus-zone` if they need programmatic access to the focus (e.g., to jump directly to Main after a Sidebar-Nav-Click). Otherwise, everything runs internally.

## 5. Comparison with Related Patterns

| Pattern | Characteristic | Difference from Focus-Layout |
|---|---|---|
| Collapse/Expand-Buttons (Bootstrap, DaisyUI Drawer) | Binary open/closed; explicit user action | No intermediate state—panel is either fully there or gone. Loses context when collapsing. |
| Resize-Handles (VSCode, Photoshop) | Drag-to-resize, freely adjustable | Semantic-free: the user has to think about what's important. No automatic reaction to their activity. |
| Master-Detail-View (iOS UISplitViewController) | Mode-Switch depending on viewport | Viewport-driven, not user-intent-driven. Tablet shows both, Phone only one. No gradual transition. |
| Activity Bar with Hover-Expand (Vue-Code-Sidebar) | Hover opens panel | Hover is not "focus"—no persistent state, user must hold mouse. |
| Focus Mode (Bear, iA Writer) | Hide everything except the current paragraph | Binary (everything gone) instead of gradient. Target audience is single-pane writing, not multi-pane editor. |

What makes the **Responsive Focus Layout** unique in combination:

1. **Gradient instead of binary.** No zone is completely collapsed (except in the Phone-Collapse variant, and there the Reclaim-Handle serves as a visibility affordance).
2. **User-Intent-driven.** The system reacts to the *current action* (pointer, focus), not to viewport or pre-configured modes.
3. **Synchronous Multi-Channel-Animation.** Size + Background + Handle-Position move in one motion. The eye reads this as "shift of attention".
4. **CSS-First-Implementation.** Logic (which `data-focus` to set) is trivial; visuals are entirely in CSS variables. Tuning happens without code changes.

As far as our research goes (as of 2026-06-01), no established UI framework combines these four properties into a single pattern. Individual aspects exist everywhere—e.g., focus-style-Boxes around inputs have always existed, and Hover-Expand-Sidebars are common—but the *unified Single-Focus-Zone model for Multi-Pane-Editors* is new.

## 6. Designer-API

The following CSS variables are tunable **without** touching TypeScript:

| Variable | Default | Purpose |
|---|---|---|
| `--shell-sidebar-w` | `16rem` | Sidebar width (default state) |
| `--shell-right-w` | `16rem` | Right width (default state) — matched with Sidebar for the symmetry rule (§2.3) |
| `--shell-footer-h` | `auto` | Footer height |
| `--shell-focus-duration` | `200ms` | Synchronous transition value |

Allowed values: anything CSS-Grid understands, including `clamp(min, vw-fraction, max)` for viewport-responsive values (e.g., `--shell-right-expanded: clamp(24rem, 40vw, 36rem)`).

Override point: via editor-specific scoped CSS that selects the variables on `.editor-shell-grid`. Example: an editor with particularly wide Right-Panel content (Settings-Form) overrides `--shell-right-w` to `28rem` as default.

## 7. Open Questions / Edge Cases

1. **Main-Reclaim on Phone.** If on a phone viewport (`max-width: 400px`) focus is on Right or Sidebar and Main shrinks to 0, there is no visual affordance to bring Main back. `Escape` works (keyboard), but it's missing on touchscreen. Possible: additional Reclaim-Handle for Main (`›`/`‹` symbol on the respective other edge), or a tap on the background.
2. **Footer-Height vs. Content-Drive.** Currently, `--shell-footer-h: auto`, so the Composer determines its own height. This makes it difficult to signal focus on Footer by enlargement—we use the Background-Highlight as the sole visual perception. Works, but more subtle than for Sidebar/Right.
3. **Help-Drawer Override.** When the Topbar-`?`-button is pressed, the Help-Drawer hijacks the Right column for help Markdown. This overrides the Focus-driven width (via `[data-help-open]`-CSS-selector). Conceptually clean, but the user might be confused if they had just focused Right and the Drawer "freezes" the layout. Currently accepted.
4. **Multi-Tab-Browser-Tabs.** Focus-State is not persisted. On a tab reload, everything is at Default. Persistence would be conceivable (URL-Param, localStorage), but would complicate URL logic and is not worth it for v1.
5. **Keyboard-Shortcuts.** Currently only Escape. `Cmd+1/2/3` for direct jumping to Sidebar/Main/Right would be a natural extension, but conflicts with browser Tab/Window shortcuts.

## 8. Selected Realizations

| Editor | Zones | Special Feature |
|---|---|---|
| `chat.html` (Pilot) | Sidebar (Picker-Mode), Main, Right, Footer | First editor with Focus-Model. Picker-Mode has Sidebar, Live-Mode has Right + Footer. Title-Click changes Mode. |
| `inbox.html` | Sidebar, Main | Click on Sidebar-Nav-entry jumps directly to Main (Master-Detail-Switching: List ↔ Detail). |

Other editors (Documents, Insights, Tools, Users etc.) do not yet use the model and are candidates for future migration.

## 9. References

- `specification/web-ui.md` §7.2 / §7.2.1 — `<EditorShell>` component and its Slot/Focus-API
- `planning/web-ui-focus-pilot.md` — Pilot plan, test drive notes, tweak history
- `repos/vance/client/packages/vance-face/src/components/EditorShell.vue` — Implementation
- `repos/vance/client/packages/vance-face/src/components/EditorTopbar.vue` — Topbar with clickable Title and Breadcrumb-Forwarding
