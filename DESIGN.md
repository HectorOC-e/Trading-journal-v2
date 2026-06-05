---
name: Trading Journal v2
description: A private trading journal where self-traders log trades, measure performance, and close the loop between learning and results.
colors:
  bg:               "oklch(98.5% 0.005 264)"
  panel:            "#FFFFFF"
  panel-2:          "oklch(97.5% 0.004 264)"
  ink-primary:      "oklch(14% 0.018 264)"
  ink-secondary:    "oklch(38% 0.015 264)"
  ink-muted:        "oklch(60% 0.010 264)"
  line:             "oklch(91% 0.007 264)"
  line-strong:      "oklch(87% 0.009 264)"
  chip:             "oklch(94% 0.006 264)"
  accent:           "oklch(56% 0.18 264)"
  accent-deep:      "oklch(51% 0.20 264)"
  accent-surface:   "oklch(94% 0.04 264)"
  win:              "oklch(60% 0.17 148)"
  win-surface:      "oklch(95% 0.04 148)"
  loss:             "oklch(58% 0.22 25)"
  loss-surface:     "oklch(95% 0.04 25)"
  breakeven:        "oklch(72% 0.13 88)"
  breakeven-surface: "oklch(96% 0.04 88)"
  dark-bg:          "oklch(11% 0.014 264)"
  dark-panel:       "oklch(14% 0.014 264)"
  dark-panel-2:     "oklch(17% 0.014 264)"
typography:
  headline:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "20px"
    fontWeight: 700
    lineHeight: 1.3
    letterSpacing: "-0.02em"
  title:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: "-0.01em"
  body:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "normal"
  label:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "10px"
    fontWeight: 600
    lineHeight: 1
    letterSpacing: "0.08em"
  data:
    fontFamily: "'JetBrains Mono', 'Cascadia Code', monospace"
    fontSize: "22px"
    fontWeight: 700
    lineHeight: 1
    letterSpacing: "-0.02em"
  mono:
    fontFamily: "'JetBrains Mono', 'Cascadia Code', monospace"
    fontSize: "13px"
    fontWeight: 500
    lineHeight: 1.5
    letterSpacing: "normal"
rounded:
  xs: "5px"
  sm: "7px"
  md: "10px"
  lg: "14px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "#FFFFFF"
    rounded: "{rounded.sm}"
    height: "32px"
    padding: "0 14px"
  button-primary-hover:
    backgroundColor: "{colors.accent-deep}"
    textColor: "#FFFFFF"
    rounded: "{rounded.sm}"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.ink-secondary}"
    rounded: "{rounded.sm}"
    height: "32px"
    padding: "0 14px"
  button-ghost-hover:
    backgroundColor: "{colors.chip}"
    textColor: "{colors.ink-primary}"
    rounded: "{rounded.sm}"
  button-danger:
    backgroundColor: "{colors.loss-surface}"
    textColor: "{colors.loss}"
    rounded: "{rounded.sm}"
    height: "32px"
    padding: "0 14px"
  input-default:
    backgroundColor: "{colors.panel-2}"
    textColor: "{colors.ink-primary}"
    rounded: "{rounded.sm}"
    height: "32px"
    padding: "0 12px"
  card:
    backgroundColor: "{colors.panel}"
    rounded: "{rounded.md}"
    padding: "16px 20px"
  chip:
    backgroundColor: "{colors.chip}"
    textColor: "{colors.ink-secondary}"
    rounded: "999px"
    padding: "2px 10px"
  chip-active:
    backgroundColor: "{colors.accent}"
    textColor: "#FFFFFF"
    rounded: "999px"
---

# Design System: Trading Journal v2

## 1. Overview

**Creative North Star: "The Trading Notebook"**

Trading Journal v2 is a serious practitioner's private journal — personal, deliberate, built to compound learning over time. The interface exists to surface what actually happened, without flattery or alarm. It is structured enough to trust on a bad week, and human enough to open every day.

The visual system is built on precision neutrals: a near-white background tinted almost imperceptibly toward the accent's own blue-violet hue (264°), white cards that pop cleanly off that surface, and a typographic hierarchy that puts data first. The accent color — Calibrated Indigo — appears rarely and intentionally. Its rarity is the point. The three outcome colors (green for wins, red for losses, amber for breakeven) carry all the emotional weight; they are the system's loudest voices and they earn that role.

Motion is responsive and crisp, not choreographed. State changes animate at 150ms; skeleton shimmer loads content gracefully; nothing performs for its own sake. This is not a product that rewards watching — it rewards using.

**This system explicitly rejects:**
- Crypto exchange aesthetics (dark neon, glowing gradients, hype energy)
- SaaS dashboard clichés (identical card grids, hero metrics with gradient accents, glassmorphism panels)
- Legacy brokerage density (gray toolbar rows, unbroken tables, 2008-era visual hierarchy)
- Productivity app casualness (pastel accents, emoji-heavy UI, Notion-style looseness)

**Key Characteristics:**
- Precision neutral foundation — no warm cream, no "AI default" sand
- Outcome colors do the emotional work; accent is structural, not decorative
- Tabular numerals everywhere money appears
- Micro-shadow baseline: surfaces carry persistent shadow-xs at rest
- Dense but readable: 14px body, JetBrains Mono for all financial values
- Full dark mode via the same hue family (264°), not inverted values

## 2. Colors: The Evidence Palette

A restrained single-accent system where the three outcome colors (win, loss, breakeven) carry all semantic weight. Everything else recedes.

### Primary
- **Calibrated Indigo** (`oklch(56% 0.18 264)`): Primary interactive element color. Used on the active tab underline, primary buttons, focus rings, chip-active backgrounds, and the selected-row state in tables. Appears on ≤10% of any given screen. Its scarcity signals importance.
- **Calibrated Indigo Deep** (`oklch(51% 0.20 264)`): Button hover state only. Slightly more saturated and darker to give a confident press response.
- **Calibrated Indigo Surface** (`oklch(94% 0.04 264)`): Tinted near-white background for accent context areas — selected rows, active chips, soft highlights. Never used as a primary background.

### Secondary (Outcome Colors)
These three colors are the system's primary emotional vocabulary. They are not decorative.
- **Confirmed Win** (`oklch(60% 0.17 148)`): Positive P&L values, winning trades, profitable periods, positive metric deltas.
- **Drawdown Red** (`oklch(58% 0.22 25)`): Negative P&L, losing trades, loss periods, error states, danger actions.
- **Breakeven Amber** (`oklch(72% 0.13 88)`): BE trades, warning states, in-progress states (e.g., "En prueba" setup status), neutral outcomes.

Each outcome color has a softened surface variant (`oklch(95–96% 0.04 hue)`) used as pill backgrounds, row tints, and alert containers. The surface variants are 94–96% lightness — pale enough to be backgrounds, saturated enough to be visible.

### Neutral
- **Precision Canvas** (`oklch(98.5% 0.005 264)`): Page background. Near-white with a barely-perceptible blue-violet tint. Not warm, not cold — pointed toward the accent's own hue.
- **Pure White Panel** (`#FFFFFF`): Card and panel surfaces. Pure white against the tinted canvas creates a clean lift without shadows needing to do the work alone.
- **Panel Two** (`oklch(97.5% 0.004 264)`): Secondary panel surface, table header backgrounds, form field fills. Slightly deeper than canvas.
- **Deep Ink** (`oklch(14% 0.018 264)`): Primary text — headings, values, labels. Near-black with minimal chroma toward the accent hue.
- **Secondary Ink** (`oklch(38% 0.015 264)`): Body text, descriptions, account names. Clear enough to read; clearly subordinate to primary.
- **Muted Ink** (`oklch(60% 0.010 264)`): Timestamps, eyebrow labels, placeholder text, supporting metadata. Always check 4.5:1 contrast before using this color for any text longer than one word.
- **Hairline** (`oklch(91% 0.007 264)`): Table row dividers, card borders, section separators.
- **Chip Fill** (`oklch(94% 0.006 264)`): Unselected filter chip backgrounds, inactive badge fills.

**The One Voice Rule.** Calibrated Indigo is used on ≤10% of any given screen. Outcome colors (win/loss/breakeven) are the system's primary color language. When Indigo appears everywhere, it loses its signal value. Restrict it to: primary actions, active/selected states, focus rings, nav active indicator.

**The Outcome Color Rule.** Win, Loss, and Breakeven colors are never used decoratively. A green badge means a trade was profitable. A red value means money was lost. These colors have a single meaning and that meaning must hold on every screen.

## 3. Typography

**Body Font:** Inter (system-ui fallback, sans-serif)
**Data/Value Font:** JetBrains Mono (Cascadia Code fallback, monospace)

**Character:** Inter carries the information layer — labels, descriptions, nav items, copy — with weight contrast doing the hierarchy work. JetBrains Mono handles every financial value: P&L figures, R-multiples, balances, percentages. The pairing is deliberate: Inter for human language, Mono for machine language. The two families never compete because they occupy separate semantic territories.

### Hierarchy
- **Headline** (700, 20px, line-height 1.3, -0.02em): Page titles and major section titles. Used once per screen, never restated. `text-wrap: balance`.
- **Title** (600, 15px, line-height 1.4, -0.01em): Card headings, modal titles, sidebar section labels. One per card or panel.
- **Body** (400, 14px, line-height 1.5): All prose — descriptions, summaries, review content, AI coach responses. Max line length 65–75ch.
- **Label** (600, 10px, line-height 1, letter-spacing 0.08em, UPPERCASE): Eyebrow labels on KPI cards, table column headers, form field labels. Uppercase reserved for labels of ≤4 words. Never used for sentences.
- **Data** (JetBrains Mono 700, 22px, line-height 1, -0.02em): KPI values — P&L, win rate, R-multiples, balances. Fixed size, never clamp(). `font-variant-numeric: tabular-nums` always applied.
- **Mono** (JetBrains Mono 500, 13px, line-height 1.5): Inline data values in tables, timestamps, trade symbols, account IDs. Tabular numerals.

**The Mono Rule.** Every financial value uses JetBrains Mono with `font-variant-numeric: tabular-nums`. P&L columns that shift width as values update are the single most disorienting experience in financial UIs. This rule is not optional.

**The Clamp Ceiling Rule.** Display headings do not use `clamp()` in this system. Product UI is viewed at consistent DPI on consistent screen sizes. Fixed-size typography is predictable; clamp is for brand landing pages.

## 4. Elevation

This system uses a **micro-shadow baseline**: every card and panel carries a permanent `shadow-xs` at rest. Shadows amplify as elements become contextually elevated (hover on interactive cards, modal dialogs, dropdowns). Modals use `shadow-lg`. The tonal ramp (`--bg` → `--panel` → `--panel-2`) provides the primary layering cue; shadows confirm and amplify it.

### Shadow Vocabulary
- **shadow-xs** (`0 1px 2px oklch(14% 0.018 264 / 0.05)`): Permanent resting state for all cards and panels. Establishes the panel-above-canvas relationship without drawing attention.
- **shadow-sm** (`0 1px 4px oklch(14% 0.018 264 / 0.07), 0 2px 8px oklch(14% 0.018 264 / 0.04)`): Interactive cards on hover; subtle elevation cue.
- **shadow-md** (`0 4px 12px oklch(14% 0.018 264 / 0.09), 0 2px 4px oklch(14% 0.018 264 / 0.05)`): Dropdown menus, popovers, detached panels.
- **shadow-lg** (`0 8px 24px oklch(14% 0.018 264 / 0.11), 0 4px 8px oklch(14% 0.018 264 / 0.05)`): Modal dialogs — the highest elevation surface.

**The No Ghost Card Rule.** A `1px solid border` and a `box-shadow` with blur ≥ 16px must never appear on the same element. Pick one. For cards: keep the border, use `shadow-xs`. For floating panels: use `shadow-md`, no border. Ghost cards (thin border + soft wide shadow) read as indecisive.

**The Flat-By-Default Rule.** At rest, only the tonal ramp and shadow-xs define depth. The system's shadows grow only in response to state — hover, elevation, dropdown context.

## 5. Components

### Buttons

Precise and restrained: the smallest useful footprint with complete state coverage.

- **Shape:** Gently curved edges (7px radius, `--radius-sm`)
- **Primary:** Calibrated Indigo background (`--accent`), white text, shadow-xs at rest. Hover deepens to `--accent-deep`. Active scales to 97% (`active:scale-[0.97]`). Loading state replaces leading icon with Loader2 spinner.
- **Ghost:** Transparent background, `--line` border, `--ink-2` text. Hover fills `--chip` background, lifts text to `--ink`, strengthens border to `--line-2`.
- **Subtle:** `--chip` background, `--ink-2` text. No border. Hover deepens background to `--line`.
- **Danger:** `--loss-surface` background, `--loss` text, `--loss`/40 border. Hover fills full `--loss` red with white text.
- **Focus ring:** 2px solid Calibrated Indigo, 2px offset on `--bg` background.
- **Heights:** xs (24px), sm (28px), md (32px), lg (36px), icon (28×28px).
- **Disabled:** opacity 40%, pointer-events none.

### Chips / Filter Pills

Used for filter bars and active selection states throughout the UI.

- **Unselected:** `--chip` background (94% lightness), `--ink-2` text, full-pill radius (999px).
- **Selected/Active:** Calibrated Indigo background, white text, subtle box-shadow.
- **With count:** A smaller rounded badge inside the chip shows count; background is `--line-2` (unselected) or white/20 (selected).
- **Never use border:** Filter chips have no border in either state.

### Cards / Panels

- **Corner style:** Medium curve (10px radius, `--radius-md`)
- **Background:** Pure White (`#FFFFFF`) on canvas, with shadow-xs permanent
- **Border:** `1px solid --line` always present. No border + wide shadow on the same element.
- **Internal padding:** 16–20px on most cards; 12–16px in compact contexts.
- **No nested cards.** A card inside a card is a layout failure. Use `--panel-2` tints to sub-section a card interior.

### Inputs / Fields

- **Style:** `--panel-2` fill, `--line` border (1px), 7px radius.
- **Height:** 32px (h-8). Touch contexts may use 36px (h-9).
- **Focus:** 2px ring at 30% Calibrated Indigo opacity, border lifts to solid `--accent`.
- **Hover (at rest, pre-focus):** border strengthens to `--line-2`.
- **Error state:** border and ring shift to `--loss` color.
- **Monospace inputs:** financial values (prices, sizes, percentages) use `font-mono text-[12px]` variant.
- **Labels:** always visible; 10px uppercase Inter 600, displayed above field, never inside.

### Navigation (Sidebar)

- **Desktop:** 232px expanded, collapses to 52px icon-only. Sticky, full viewport height.
- **Active state:** `--accent-soft` background fill, `--accent` text color. No bold weight change.
- **Inactive hover:** `--chip` background fill.
- **Active page indicator:** left edge indicator is forbidden (side-stripe antipattern). Active state is communicated through background fill + text color only.
- **Section labels:** 9px uppercase, 0.12em tracking, `--ink-3` color. Structural dividers, not decorative eyebrows.
- **Mobile:** fixed top header + bottom nav (4 primary items + overflow "Más" button). Bottom nav max 5 items.

### KPI Cards

The signature data primitive. Used in all dashboard and overview surfaces.

- **Layout:** Label (10px uppercase) top-left, icon top-right. Value (22px JetBrains Mono 700) below. Sub-text (11px `--ink-3`) below value.
- **Value color:** Driven by trend/outcome token: `--win` for positive, `--loss` for negative, `--be` for neutral, `--accent` as default.
- **No clamp on value font-size.** 22px fixed at all viewport sizes.
- **Tabular numerals always.** Values must not shift width when data refreshes.

### Trade Row (Table)

- **No side-stripe accent.** Result is communicated via pill badges (WIN/LOSS/BE/OPEN) and P&L value color. Never a `border-left` colored stripe.
- **Responsive visibility:** Account/Date columns hidden on mobile, Session column hidden on tablet.
- **Selected state:** `--accent-soft` background fill on the entire row.
- **Hover:** `--panel-2` background fill.
- **P&L column:** JetBrains Mono 700, `tabular-nums`, result color. Two decimal places always.

## 6. Do's and Don'ts

### Do:
- **Do** use `font-variant-numeric: tabular-nums` on every element displaying a financial value. This rule applies globally, no exceptions.
- **Do** use outcome colors (Confirmed Win, Drawdown Red, Breakeven Amber) only to communicate trade outcomes. Their meaning is specific and must remain consistent.
- **Do** restrict Calibrated Indigo to ≤10% of any screen surface. Primary buttons, focus rings, active states, selected rows — that is the complete list.
- **Do** keep cards flat at rest. shadow-xs is the resting elevation. Hover adds shadow-sm; that is the maximum for interactive cards.
- **Do** use JetBrains Mono for all financial values: prices, P&L figures, R-multiples, percentages, balances, timestamps.
- **Do** show visible `focus-visible` rings (2px Calibrated Indigo) on every interactive element without exception.
- **Do** use `text-wrap: balance` on h1–h3 titles and `text-wrap: pretty` on prose blocks.
- **Do** communicate navigation active state through background fill + text color, never through a side-stripe border.
- **Do** check 4.5:1 contrast before using `--ink-3` for any text longer than one word.
- **Do** use `prefers-reduced-motion` alternatives for every animation in the system.

### Don't:
- **Don't** use `border-left` or `border-right` greater than 1px as a colored accent on cards, list items, or rows. This is an absolute ban. Replace with full border, background tint, or dot/icon indicator.
- **Don't** use gradient text (`background-clip: text` + gradient). Financial values and headings use a single solid color.
- **Don't** use glassmorphism (`backdrop-filter: blur`) decoratively. Reserve for modal overlays only.
- **Don't** pair a `1px solid border` with a `box-shadow` blur ≥ 16px on the same element. Choose one or the other.
- **Don't** use `clamp()` for data value font sizes. KPI values are 22px fixed.
- **Don't** build identical card grids with icon + heading + text repeated endlessly. Data tables, list rows, and multi-column KPI strips are this system's primary layout patterns.
- **Don't** design screens that look like a crypto exchange: no dark neon, no glowing gradients, no hype energy (Binance / Bybit aesthetic).
- **Don't** use SaaS dashboard clichés: no hero metric template (big number + small label + gradient accent), no glassmorphism panels, no purple-to-blue gradients.
- **Don't** use brokerage platform legacy density: no gray toolbar rows, no unbroken monochrome tables, no visual hierarchy from 2008.
- **Don't** create a productivity app feel: no Notion/Linear casual tone, no pastel accents, no emoji-heavy interface.
- **Don't** add section eyebrow labels on every block. Eyebrows belong on KPI card labels and table column headers; not as "ABOUT / PROCESS / PRICING" kickers before every paragraph block.
- **Don't** use warm-tinted neutrals (`OKLCH L 0.84–0.97, C < 0.06, hue 40–100`). This is the cream/sand AI default. The canvas (`--bg`) is tinted toward the accent hue (264°), not toward warm.
