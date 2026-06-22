# Desktop sidebar consolidation — no scroll, no floating FABs

Date: 2026-06-22
Status: Approved → implementing
Scope: `src/components/layout/Sidebar.tsx` (desktop + tablet), `quick-actions.tsx`,
`ai-coach-drawer.tsx`. Mobile is unchanged.

## Problem (desktop view)
1. Two floating FABs stacked bottom-right clutter the screen and overlap content:
   the QuickActions speed-dial `+` and the AI Coach chat bubble.
2. The floating `+` speed-dial duplicates nav: "Log sesión" → /trades and
   "Nueva review" → /reviews are already nav items; only "Nuevo trade" is unique.
3. The floating Coach bubble is redundant — the sidebar already has a "Coach IA" CTA.
4. The expanded sidebar overflows vertically (14 items + sections + chrome) → a
   scrollbar the user dislikes.

## Decisions (approved)
- **Option C — collapsible accordion nav**, with **PRINCIPAL pinned** (always
  visible) and the other 4 sections (ANÁLISIS, GESTIÓN, APRENDIZAJE, CUENTA) as an
  accordion: **one open at a time**, auto-opening the section that holds the active
  route.
- **"+ Nuevo trade"** primary button at the top → opens the register modal directly
  (same as keyboard "n").
- Remove both floating FABs on **desktop + tablet**; mobile keeps its center `+`
  and its Coach bubble.

## Design — expanded desktop sidebar (single floating card, top→bottom)
1. Identity (avatar + name + email → /perfil) + collapse toggle.
2. `+ Nuevo trade` accent button (`openRegister`).
3. Nav (flex-1, overflow-y auto with hidden scrollbar as a safety):
   - PRINCIPAL: label (no chevron) + its 3 items, always shown.
   - 4 collapsible sections: header button with chevron; click expands it and
     collapses the others. A collapsed section that hides the active item or a
     badge shows a small accent dot on its header (no lost information).
4. `Coach IA` accent CTA → dispatches `coach:open`.
5. Footer row (bell · theme · logout) merged INTO the card (border-top) — the
   separate secondary card is removed, reclaiming the vertical space that caused
   the scroll.

Accordion state: `openSection` (string | null), initialised and synced via
`useEffect(pathname)` to the collapsible section containing the active route.
Expand/collapse animates ~180ms `ease-out` (occasional interaction).

## Collapsed rail (W≈76) & tablet (W≈64)
Icon-only, no accordion. Keep the full icon list with group dividers (already fits).
Add a `+` icon button at the top (openRegister) and keep the Coach square. Footer
icons (bell/theme/logout) stay at the bottom of the card. Floating FABs removed here
too.

## Other files
- `quick-actions.tsx`: delete the floating speed-dial UI entirely; keep the
  `RegisterTradeModal` host and the "n" keyboard shortcut.
- `ai-coach-drawer.tsx`: render the floating launcher only on mobile
  (`if (!open) return isMobile ? <bubble/> : null`). Desktop opens via the sidebar
  CTA (`coach:open`, already wired).

## Out of scope
No route changes, no schema changes, mobile untouched.
