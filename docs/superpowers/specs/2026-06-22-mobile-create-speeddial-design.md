# Mobile center FAB → create speed-dial

Date: 2026-06-22
Status: Approved → implementing
Scope: new `components/layout/mobile-bottom-bar.tsx`, `Sidebar.tsx` (mobile branch),
`command-palette.tsx`. Desktop/tablet untouched.

## Goal
Turn the mobile bottom-bar center "+" (today: opens Registrar trade directly) into a
create **speed-dial**, faithful to the reference GIF: tapping "+" fades out the nav
icons and reveals 4 circular action buttons that emerge from the FAB; the "+" rotates
to "×". Tap an action to run it; tap "×" or the backdrop to close.

## Decisions (approved)
- 4 actions: **Nuevo trade · Coach IA | Buscar (⌘K) · Nueva review** (2 left, 2 right
  of the notch).
- Animation **faithful to the GIF**: nav icons cross-fade out; action circles scale
  up (0.4→1) and slide out from the FAB center, staggered ~35ms, strong `ease-out`
  (~260ms); "+" rotates 45°→"×" (200ms); backdrop fades (150ms). Reverse on close.
- Nueva review → **navigates to `/reviews`** (no deep-link).

## Behaviour
- `menuOpen` state in the bottom bar. FAB toggles it.
- Open: backdrop (tap to close) + action layer interactive; nav-tab layer faded and
  non-interactive. Each action: run → close.
- `prefers-reduced-motion`: opacity only, no transforms.

## Wiring
- Nuevo trade → `openRegister()` (shared store).
- Coach IA → `window.dispatchEvent(new Event("coach:open"))` (listener exists).
- Buscar → `window.dispatchEvent(new Event("palette:open"))` — add a matching
  listener to `command-palette.tsx` (mirrors `coach:open`).
- Nueva review → `router.push("/reviews")`.

## Architecture
Extract the mobile bottom navigation into `components/layout/mobile-bottom-bar.tsx`
(the pill + notch + IconTabs + FAB + the new speed-dial). It receives the nav item
arrays, `pathname`, and the drawer open/state from `Sidebar` via props; it owns
`menuOpen`. The "Más" drawer panel and the mobile header (clock) stay in
`Sidebar.tsx`. This keeps the large `Sidebar.tsx` focused and isolates the animation.

### Layout note (avoid clipping)
The action circles render as **siblings of the masked pill** (overlaid, absolutely
positioned over the pill box), not inside it — the pill's notch mask would otherwise
clip a circle as it emerges from the FAB (which sits above the pill's top edge). The
nav-tab layer stays inside the pill as today and just cross-fades.

## Emil details
Occasional interaction → delight is allowed. Strong `ease-out` emerge with a small
outward stagger; spatial consistency (buttons retract into the FAB on close);
backdrop dim; `:active` scale on each circle.

## Out of scope
Desktop/tablet, the "Más" drawer contents, route changes, schema.
