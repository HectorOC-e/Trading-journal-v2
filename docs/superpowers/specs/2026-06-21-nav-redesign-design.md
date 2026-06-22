# Nav redesign — floating sidebar, mobile clock, notched bottom bar

Date: 2026-06-21
Status: Approved → implementing
Scope: `src/components/layout/Sidebar.tsx`, `src/app/globals.css`, AI-coach open event.

## Goal

Restyle the app navigation to be faithful to two reference designs, keeping the
app's existing design tokens (purple `--accent`, theme vars) rather than the
references' literal palette:

- **Reference 1** (floating card sidebar: avatar on top, purple "Support" CTA,
  separate settings/logout card) → desktop + tablet sidebar, dark & light.
- **Reference 2** (floating pill bottom bar with a concave notch + center FAB) →
  mobile bottom navigation.

Plus: a **live clock** in the mobile top bar.

## Decisions (approved)

1. Apply the floating language to **all three breakpoints** (desktop, tablet, mobile).
2. Clock: **24h + short date**, e.g. `14:32 · lun 21 jun`, locale `es`.
3. Fidelity: **structure from references, app tokens** (keep `--accent`).
4. Identity moves to the **top** of the sidebar (was footer).
5. The purple "Support" CTA → **"Coach IA"**, opens the existing AI Coach drawer.
6. Bottom nav keeps **tiny labels** (Analytics/Más aren't obvious icon-only).

## Components

### Mobile top bar (52px)
- Left: `TJ` mark + **live clock** (`14:32` 15px semibold `--ink`, `· lun 21 jun`
  11px `--ink-3`). Wordmark "Trading Journal" dropped on mobile to free width.
- Right: notification bell, theme toggle, avatar (unchanged).
- Clock: `Intl.DateTimeFormat` with `profile.timezone`; ticks **once per minute**,
  aligned to the minute boundary. No seconds → no per-second renders.

### Mobile bottom bar (Reference 2)
- Floating pill: lateral inset 12px, lifted 12px + safe-area, radius 28px,
  `--panel` bg, `--shadow-lg`, hairline border.
- **Concave notch** under the FAB via an SVG-shaped background (works over any page
  background, not a color patch).
- Center FAB `+`: floating circle above the bar, gradient `--accent → --accent-h`,
  soft glow, `:active scale(0.95)`. Opens "Nuevo trade".
- 4 destinations (Dashboard, Trades | + | Analytics, Más). Active = icon + label in
  `--accent`. Used dozens×/day → color transition only, no layout animation.

### Sidebar desktop + tablet (Reference 1)
- Floating card: margin ~12px, radius `--radius-xl`, `--shadow-lg` over `--bg`.
- Identity (avatar + name + email) at the **top** with a divider.
- Grouped nav preserved (14 destinations). Active = soft purple pill + `--accent`
  text + protruding right-edge bar.
- Bottom: purple **Coach IA** pill (chat-bubble icon) → opens AI Coach.
- Separate card below: Perfil/Ajustes + Cerrar sesión.
- Tablet collapsed rail: same floating logic — avatar top, icon list, purple chat
  square, mini secondary card with settings + logout icons.

### AI Coach wiring
- Add a `coach:open` window-event listener to `ai-coach-drawer.tsx` (mirrors the
  existing `coach:ask`) so the sidebar CTA can open the panel.

## Emil details
- Add `--ease-drawer: cubic-bezier(0.32,0.72,0,1)` for the "Más" drawer.
- `ease-out` for entrances; elements never appear "from nothing".
- `:active` scale feedback on FAB and CTAs.

## Out of scope
- No new routes, no schema changes, no changes to nav destinations.
