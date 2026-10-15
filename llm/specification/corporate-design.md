# Vancetope — Corporate Design

> Status: v1, binding. **To view:** the sample pages in
> [`corporate-design/`](corporate-design/index.html) (basics, building blocks,
> before/after, settings — light and dark), plus `tokens.css` with all
> values of this spec. Applies to **every** interface: Web-UI (`vance-face`
> and Addon clients), Desktop and Mobile App (Facelift), Capture, the Website
> (www.vancetope.com) and Store material. This spec defines *how Vancetope
> looks and sounds*; how the Web-UI is technically built (Shell, components,
> dialog types) is described in [web-ui](web-ui.md) §7.

## 1. Core Philosophy

Vancetope is a **workspace**, not a playground. The interface recedes so that
documents and agent work can take center stage. The model is the restraint of
Apple's own apps (Notes, Mail, System Settings):

- **Calm through gray, meaning through color.** The interface is neutral. Color
  only appears when it *means* something: primary action, selection, status, danger.
- **Hierarchy through weight and position, not through loudness.** What is important
  is at the top left, larger or bolder — not more colorful.
- **One thing, one form.** The same function looks the same everywhere: a
  delete action is always the same icon in the same place.
- **Structure through groups and hairlines, not through boxes and shadows.**

Two registers of the same brand:

| Register | Where | Character |
|---|---|---|
| **Tool** | Web-UI, Apps, Capture | quiet, dense, neutral, Navy as the only accent |
| **Stage** | Website, Blog, Store images, Social | loud, large, Signal Orange and Lime as campaign colors |

The Tool register never borrows from the Stage (no orange button in the app),
but the Stage shows the Tool as it is (screenshots unchanged).

## 2. Brand

### 2.1 Name

- **Vancetope** — the product, the place. Always capitalized in running text, never "VanceTope",
  never "Vance" as a product name. Lowercase in the wordmark: **vancetope**.
- `vance` remains an internal code codename (packages, repo, protocol) and does not
  appear in the interface. The inhabitants (arthur, marvin, ...) are lowercase,
  like names in a shell.

### 2.2 Symbol and Wordmark

- **Symbol:** the italic 𝑣 (`VanceLogo.vue`, `icon-source.svg`). It is a
  shape, not a font glyph — always embed as SVG.
- **Wordmark:** "vancetope" in Inter, weight 600, letter-spacing −0.02em, next
  to the symbol; spacing symbol ↔ wordmark = half symbol width.
- **Symbol colors:** Navy on light, White on Navy or on dark, Ink
  (`label`) monochrome. No other colors, no gradients, no shadows.
- **App Icon:** white 𝑣 on Navy background (existing in stores, unchanged).
- **Clearance zone:** at least ¼ of its height free around the symbol.
- **Minimum size:** 16 px height (favicon); below that, only the symbol without wordmark.

## 3. Color

### 3.1 Brand Color: Navy

**Navy `#1E3A8A`** is the brand color and the only accent in the
Tool register. The scale (light and dark mode derive from it):

| Level | Hex | Usage |
|---|---|---|
| navy-50 | `#EEF2FB` | Selection background (light) |
| navy-100 | `#D9E2F6` | Hover on selection, badge surface |
| navy-200 | `#B3C4EC` | Focus ring (light, with transparency) |
| navy-300 | `#8AA3DF` | Accent text in dark mode |
| navy-400 | `#5F7FCF` | Hover on primary button (dark) |
| navy-500 | `#3D5FBE` | Primary button and accent surface in dark mode |
| navy-600 | `#2C4BA6` | Links and accent text (light) |
| navy-700 | `#233F94` | Hover on primary button (light) |
| **navy-800** | **`#1E3A8A`** | **Brand**, primary button, symbol |
| navy-900 | `#172C69` | Pressed state |
| navy-950 | `#0F1D47` | Selection background (dark) |

### 3.2 Neutral Colors

The interface consists almost entirely of these. Named by role, not by tone:

| Token | Light | Dark | Role |
|---|---|---|---|
| `bg` | `#F5F5F7` | `#161618` | Window background, sidebars, surfaces behind groups |
| `surface` | `#FFFFFF` | `#1F1F22` | Content, groups, lists, editors |
| `surface-raised` | `#FFFFFF` | `#2A2A2E` | Floating layers: menus, popovers, modals |
| `scrim` | Black 32 % | Black 56 % | Darkener behind modals and sheets |
| `fill` | `#E8E8ED` | `#2E2E33` | Fields, segment controls, hover on neutral |
| `separator` | `#E3E3E8` | `#333338` | Hairlines between rows and sections |
| `border` | `#D2D2D7` | `#45454B` | Borders of input fields and secondary buttons |
| `label` | `#1D1D1F` | `#F5F5F7` | Main text |
| `label-secondary` | `#6E6E73` | `#A1A1A6` | Descriptions, metadata, icons in idle state |
| `label-tertiary` | `#8E8E93` | `#7C7C82` | Placeholders, disabled |

### 3.3 Semantic Colors

Only for what they mean — never for decoration, never for buttons except
"Delete" in a confirmation:

| Token | Light | Dark | Meaning |
|---|---|---|---|
| `danger` | `#D70015` | `#FF5A5F` | destructive, error |
| `warning` | `#B25E00` | `#FFB340` | caution, waiting for you |
| `success` | `#1F7A3E` | `#4CD07D` | completed, connected |
| `info` | = Accent | = Accent | hint |

Status is shown as a **dot (8 px) or text in the color**, not as a
colored surface. Exception: `VAlert` with tinted surface (color at 8% opacity).

### 3.4 Content Colors

What *users* color (Kanban labels, calendar, canvas nodes, tags) uses
a fixed palette of eight tones that stand out from accent and semantic colors:
Gray, Brown, Orange, Yellow, Green, Turquoise, Purple, Pink — each with a light
surface and dark text, readable in both modes. The palette exists as tokens
(`content-<name>-bg` / `-fg`, values for light and dark in
`corporate-design/tokens.css`); free hex values in content colors remain possible,
but the interface itself only suggests these eight.

### 3.5 Stage Colors (Website & Marketing only)

| Token | Hex | Role |
|---|---|---|
| `signal` | `#FF4F1F` | Hero band, closing surface, highlight |
| `lime` | `#D9F74A` | Ticker band, marking |
| `slab` | `#141416` | dark bands |

Forbidden in the Tool register. The 𝑣 symbol remains Navy or Ink on the website,
not Orange.

## 4. Typography

- **Inter** for all UI texts (self-hosted, OFL), **JetBrains Mono** for
  code, IDs, paths, tokens. The website additionally uses **Inter Tight** for
  large headings (Stage). No other fonts.
- **Tool Scale** (px / line height / weight):

| Role | Size | Line | Weight | Example |
|---|---|---|---|---|
| Page title | 22 | 28 | 600 | Title of a settings page |
| Dialog title | 17 | 22 | 600 | Title of a dialog |
| Section | 15 | 20 | 600 | Group heading above a block |
| Text | 14 | 20 | 400 | Lists, forms, body text |
| Highlighted | 14 | 20 | 500 | Row title, active entry |
| Small | 12 | 16 | 400 | Metadata, help texts, table header |
| Group Label | 11 | 14 | 600, uppercase, +0.04em | "PROJECTS" above a sidebar |
| Code | 12.5 | 18 | 400 Mono | IDs, paths |

- Document content (editor, preview) has its own, more generous typography and is
  excluded from this.
- **Never** use bolding as a color substitute for status, never underline except for links in
  running text.

## 5. Icons

- **One set: [Lucide](https://lucide.dev)** (ISC license), integrated via a
  `VIcon` component. Stroke width 1.75, sizes **16 px** (rows, dense
  bars) and **20 px** (toolbars, sidebar header).
- **Color:** `label-secondary` in idle state, `label` on hover, accent when
  active/selected, `danger` only for the delete icon in confirmations.
- **No emojis as UI icons.** Emojis remain allowed where *users* choose them
  (project emoji, content). No Unicode arrows or characters (→ ✕ ↻ ✓)
  as icon substitutes — use icons for that.
- **One concept, one icon.** The binding assignment (excerpt; complete in
  `@vance/components/src/icons.ts`). There, the key is the **meaning**
  (`delete`, `add-folder`, `open-in-app`), the value is the Lucide glyph — a
  view requests `<VIcon name="delete">`, never `Trash2`. Swapping a glyph
  is thus a single line, and only these icons end up in the bundle:

| Meaning | Lucide |
|---|---|
| New / Add | `plus` |
| New Folder | `folder-plus` |
| Delete | `trash-2` |
| Edit | `pencil` |
| Close | `x` |
| Refresh | `rotate-cw` |
| Search | `search` |
| Download / Export | `download` |
| Upload / Import | `upload` |
| Share | `share` |
| Copy | `copy` |
| More (overflow menu) | `ellipsis` |
| Settings | `settings` |
| Help | `circle-help` |
| Chat | `message-square` |
| Folder | `folder` |
| Document (generic) | `file-text` |
| Pin | `pin` |
| Favorite | `star` |
| Open Externally | `external-link` |
| Warning | `triangle-alert` |
| Locked / Encrypted | `lock` |

  Each document type (Kind) brings its icon in the Kind registry; the
  text abbreviations "MD", "YAML" in lists are omitted in favor of the icon.

## 6. Controls

### 6.1 Buttons — four roles

| Role | Appearance | Rule |
|---|---|---|
| **Primary** | Navy filled, white text | **at most one per view/dialog** — the action most likely desired (Save, Send, Create) |
| **Secondary** | `surface`, `border` border, `label` text | all other actions with text |
| **Plain** | no background, accent text | tertiary actions, links in forms ("Cancel" is Secondary, not Plain) |
| **Destructive** | `danger` text; filled only in confirmation dialog | Delete, Remove, Reset |

- **Height:** 32 px, dense 28 px, very dense 24 px — same height as
  input fields (§6.3), so that rows of field and button are aligned. A
  button may carry a leading icon (`icon="add"`).
- **Icon Button:** square (28 px, dense 24 px), no background, icon in
  `label-secondary`, Hover = `fill`. **Required:** Tooltip and `aria-label` —
  `VIconButton` takes a mandatory `label` for this.
- No colorful buttons, no outline variants in color, no "+" as text before
  a label (use the `plus` icon for that).
- **When Icon, when Text:** Toolbars and row actions → Icon alone.
  Menus → Icon + Text. Dialogs and forms → Text only. An action that does not
  have a common icon gets text — no invented icon.
- Label: Verb in infinitive or imperative, first letter capitalized, rest lowercase
  ("New Document", "Save"). If the action opens a dialog, the
  label ends with "...".

### 6.2 Toolbar

A single row, 40 px high, hairline at the bottom. Left: Navigation/Context (Back,
Title). Right: Actions as icon buttons, ordered by frequency from outside to inside;
the primary action (if any) as the only text button on the far right; rare items in
the `ellipsis` menu. Maximum five visible icons.

### 6.3 Inputs

Fields: `surface` with `border` border, radius 6, height 32 (dense 28), focus =
accent border + 3 px ring `navy-200`/40%. Label above the field (12/600
`label-secondary`), help text below (12 `label-secondary`), error below in
`danger`. Segment controls instead of radio groups for 2–4 options.

### 6.4 Dialogs

Dialogs are where the CI is most easily forgotten — therefore a
fixed structure, which `VModal` carries:

- **Header:** Dialog title (17/600), optionally a description below
  (13 `label-secondary`, `description`), on the right the close icon button.
  No separate heading in the content, no explanatory text as a body text paragraph
  above the first field.
- **Content:** Fields stacked, spacing 16, labels above the field (§6.3).
  The content scrolls when the dialog reaches window height — header and
  action row remain fixed.
- **Action row:** always in the `actions` slot, never in the content; right-aligned,
  spacing 8, "Cancel" (Secondary) to the left of the primary button. A form
  in the content is submitted via `form="..."` attribute.
- **One primary button** (Create, Save, Send). If actions are
  equivalent — answers to a question, goals to choose from — all are
  secondary; there is then no primary button.
- **Mode switchers** (Template / Content / Upload, Catalog / Project /
  Manual) are a segment control (`VSegment`), not a button row with
  a filled button and not tabs.
- **Selection lists** (Templates, Recipes, Documents) are a grouped list
  (`VGroup` + `VGroupRow` with `description`, `navigates`), not stacked
  boxes. In the dialog, the group gets a hairline because the background is already
  white. Many filter values → search field plus selection field, no row of
  filter buttons.
- **Width:** `sm` 440 px (few fields, confirmation), `md` 600 px
  (forms, selection lists, standard), `lg`/`xl` only for embedded
  editors and previews.
- **Confirmation dialog** (Delete...): `sm`, title as a question, one sentence about
  the consequence, "Cancel" + filled destructive button.

## 7. Surfaces, Groups, Spacing

### 7.1 Layers

| Layer | Token | Delimitation |
|---|---|---|
| Window background | `bg` | — |
| Sidebar | `bg` | Hairline to content |
| Content | `surface` | Hairline to bars |
| Group (in forms, settings) | `surface` on `bg` | Radius 10, **no** border, **no** shadow |
| Floating (Menu, Popover, Modal, Toast) | `surface-raised` | only place with shadow; behind modals and sheets the darkener `scrim` |

- **Shadows only for floating elements.** Cards and blocks in the flow have none.
- **Hairline** = 1 px `separator`. Between list rows indented from the
  text edge (like in iOS lists), continuous between sections.

### 7.2 Grouped Lists ("inset grouped")

Settings, properties, detail pages: rows in white groups on a gray
background; above each group a group label (§4), optionally an
explanatory text below (12 `label-secondary`). Row: 36 px (dense 32), label on the left,
value or control on the right, far right `chevron-right` if it leads further.

### 7.3 Lists and Tables

Rows 32–36 px, Hover = `fill` at 50%, Selection = `navy-50` (dark `navy-950`)
with accent text, column headers in "Small" `label-secondary`, no zebra stripes,
no vertical lines.

### 7.4 Grid

Spacing only from **4 · 8 · 12 · 16 · 24 · 32 · 48**. Radius: **6** (Controls),
**10** (Groups, Cards), **14** (Modals). Content width for forms and
settings maximum 720 px, centered.

## 8. Motion and States

- Transitions 120–180 ms, `ease-out`; nothing jumps, nothing flashes.
- Focus always visible (ring §6.3), even for icon buttons.
- Loading: Skeleton in lists, small spinner inline — never a full-screen spinner
  over already visible content.
- Empty states: Icon (32 px, `label-tertiary`), one sentence, one action.

## 9. Language in the Interface

- Short, factual, friendly. "Du" form in German. Only English is maintained;
  all other languages are generated from it.
- State what happens, not what it's called internally: "Board is loading..." instead of
  "Fetching kanban manifest".
- Error messages: what happened + what can be done. No exclamation marks,
  no blame.
- Vancetope terminology (Recipe, Skill, Kit, Engine, Session) remains
  English in all languages.

## 10. Implementation

### 10.1 Tokens as Code

All values of this spec exist **once** as CSS variables with prefix `--v-`
(DaisyUI occupies `--border`, `--depth` ...) in `corporate-design/tokens.css`
next to this spec — the sample pages read them directly. The code carries an
**identical copy** in `@vance/components` (`src/style/tokens.css`, export
`@vance/components/tokens.css`); both are changed together. Light applies to
`:root`, Dark under `[data-theme="dark"]` or `.dark` — the same switches
that `themeWeb.ts` (Web-UI) and `theme.ts` (Facelift shell, follows the system) set
on `<html>`.

- **DaisyUI:** the built-in themes `light` and `dark` are
  overwritten in `@vance/components/theme.css` and point to the tokens
  (`primary`/`accent` = Navy, `secondary` = neutral `fill`,
  `base-100/200/300` = `surface`/`bg`/`fill`, `error`/`warning`/`success` =
  semantic colors, radii 6/10, `--depth: 0`). The names remain `light`/`dark`
  because chat themes and diagram codecs depend on them. This ensures every
  existing DaisyUI class immediately speaks the CI.
- **Fonts:** Inter and JetBrains Mono are self-hosted in
  `@vance/components` (`src/style/fonts/`, OFL), as variable fonts split
  into Latin, Latin-extended, and Cyrillic via `unicode-range` — as on the
  website. `@vance/components/fonts.css` is imported from the **JS entry point**,
  not from Tailwind CSS: Tailwind inlines `@import`s, then the
  relative font URLs no longer resolve.
- **Who integrates:** every app that renders `@vance/components` imports
  `tokens.css` + `theme.css` in its Tailwind CSS and `fonts.css` in its JS entry point
  — the Web-UI (`vance-face/src/style/app.css`) and the
  Facelift shell (`facelift-bridge/src/style.css`). Addons inherit everything from
  the host document.
- The website keeps its copy in `_includes/sc-style.html` and aligns Navy and
  neutrals with this table.

### 10.2 Components

`@vance/components` implements the rules so that views do not have to
apply them themselves:

| Building Block | Rule |
|---|---|
| `VButton` | `variant` = `primary` · `secondary` · `plain` · `danger` (+ `filled` only in confirmations), optional `icon`. Other variants do not exist — the type does not allow them |
| `VIconButton` | Mandatory `icon` and mandatory `label` (Tooltip + `aria-label`), `size` md/sm, `active`, `danger` |
| `VIcon` | `name` from `icons.ts`, size 16 or 20 |
| `VToolbar` | Context left, `end` slot for actions (§6.2) |
| `VGroup` / `VGroupRow` | Grouped list with label, note, rows with icon tile, `meta` (mono identifier), `description` (second line), value, chevron (§7.2); in dialog with hairline |
| `useConfirm()` / `VConfirmDialog` | Replaces `window.confirm` — confirmation dialog from §6.4 as a Promise (`title`, `message`, `confirmLabel`, `danger`) |
| `VBadge` | Status pill: semantic color as text on its own tint, neutral gray; never filled |
| `VModal` | Dialog structure from §6.4: `title`, `description`, `size` sm/md/lg/xl, `actions` slot for the action row; content scrolls between fixed header and footer |
| `VSegment` | Segment control for 2–4 modes, `iconOnly`, `disabled` |
| Fields | `VInput`/`VSelect`/`VTextarea`/`VCombobox`/`VFileInput`/`CodeEditor` with the same label 12/600 secondary, fields 32 px; `VToggle`/`VCheckbox` in accent |

The reference page **`/preview.html`** of the Web-UI shows every component in
every state, light and dark, without login. It is maintained when a
building block is added or changed.

### 10.3 Guardrails

- **Active** in `eslint.config.mjs` (vance and vance-ee): no
  emojis/Unicode symbols as template text, no Tailwind palette colors in
  `class`/`:class` — for components, views, addons, and the Facelift shell.
  In views, additionally no DaisyUI classes `btn`/`badge`/`alert` including
  their modifiers — use `VButton`, `VIconButton`, `VBadge`,
  `VAlert` instead. Exceptions only inline with justification.
- `VButton` only allows the four roles (type), icons only meanings from
  `icons.ts` (type `IconName`).
- Deliberately **not** forbidden: raw `<button>` (own interactive surfaces like
  tiles, tree nodes, keypads are legitimate) and DaisyUI color classes like
  `bg-base-200` or `text-error` — they point to the tokens via the theme.
- `agent/face.md` refers to this spec; new UI is created only from the
  components in §10.2.

### 10.4 Order of Implementation

1. Tokens + Themes — immediately visible: Purple/Pink disappear everywhere.
2. Components and icon set, reference page.
3. Views by usage: Shell/Topbar → Cortex → Documents → Settings →
   Inbox/Chat → Single pages → Addons. For each area, before/after screenshot.
4. Enable lint rules as soon as an area is migrated.
5. Dialogs according to §6.4, `window.confirm` → `useConfirm()`, Facelift shell.

Status: all five steps implemented. The website remains as it is — it is
Stage (§2), its 𝑣 symbol retains its color.
