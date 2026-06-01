# UX Improvement Roadmap — Trading Journal v2

> **Date:** 2026-05-31  
> **Scope:** Navigation, forms, feedback, mobile responsiveness, empty states, onboarding, accessibility, performance UX  
> **Methodology:** UX audit from codebase analysis + trading-specific interaction patterns

---

## 1. UX Audit Findings

### 1.1 Navigation Structure

**Current structure:**
- Desktop: Collapsible left sidebar (240px expanded, 56px collapsed)
- Tablet: Icon-only sidebar (56px)
- Mobile: Fixed top bar + bottom nav bar (5 items) + "Más" drawer (4 items)

**Strengths:**
- Sidebar collapse state is functional and smooth (`.2s ease` transition)
- Mobile bottom nav correctly highlights active section
- "Más" drawer pattern is a standard mobile convention

**Issues:**

| Issue | Severity | Location |
|---|---|---|
| Mobile hides 4 full sections in "Más" drawer | Medium | `Sidebar.tsx:88–93` |
| "Retiros" not in mobile bottom nav | Low | Navigation structure |
| No keyboard shortcut to collapse/expand sidebar | Low | `Sidebar.tsx` |
| No breadcrumbs on nested views | Low | All pages |
| "AI Coach" drawer button not visible on sidebar | Medium | `AppShell.tsx` — drawer trigger not exposed in nav |
| Active section indicator on tablet (icon-only) has no tooltip delay | Low | `Sidebar.tsx:321` |

### 1.2 Form UX

#### Trade Registration Modal

**Strengths:**
- Two-step checklist flow for A+/standard setups
- Auto-calculation of R-multiple from entry/stop/target
- Session auto-detection

**Issues:**

| Issue | Severity | Code Reference |
|---|---|---|
| Entry, stop, target use `type="text"` not `type="number"` on mobile | Medium | `register-trade-modal.tsx` |
| No validation error messages — just `required` HTML attribute | High | All form fields |
| Direction toggle uses click-to-toggle but no keyboard nav | Medium | — |
| Screenshot upload has no progress indicator | Low | — |
| "Registrar trade" button shows no loading state | Medium | `register-trade-modal.tsx` |
| Session auto-detection is not visible to the user (silent) | Low | — |

#### Weekly Review Modal

**Strengths:**
- Two-step flow (Config → Análisis) is logical
- Auto-generate from trades button works well
- Discipline score bar visualization is clear

**Issues:**

| Issue | Severity | Code Reference |
|---|---|---|
| No "Continue editing" for draft reviews | Critical | No edit path exists |
| Discipline score is an `<input type="number">` at font-size 40 — awkward on mobile | Medium | `create-review-modal.tsx:474` |
| Week selector shows only last 6 weeks — no date picker for older periods | Medium | `create-review-modal.tsx:55` |
| No confirmation before submitting (cannot undo "submitted" status) | Medium | — |
| AI summary generation button is buried in footer | Low | — |

### 1.3 Data Display and Feedback

**Issues:**

| Issue | Severity | Description |
|---|---|---|
| No toast notifications for any action | High | Mutations succeed/fail silently |
| Error state for failed mutations shows nothing | High | `onError` callbacks mostly empty |
| Loading skeletons missing | Medium | Pages show text "Cargando…" or nothing |
| `dashboard/error.tsx` uses `window.location.reload()` | Medium | SPA antipattern, should use `reset()` |
| Numbers format without thousand separators in most tables | Low | Inconsistent; some places use `.toLocaleString()` |
| P&L sign: some places show "+$100" others "$100" for positives | Low | Inconsistent sign display |

### 1.4 Detail Panels (Slide-in Right Rail)

**Pattern used across:** Trades, Reviews, Accounts, Aprendizaje

**Strengths:**
- Sticky positioning works well on desktop
- CSS class `detail-panel-mobile` correctly makes panels full-screen on mobile

**Issues:**

| Issue | Severity | Code Reference |
|---|---|---|
| ReviewDetailPanel has no edit or delete button | Critical | `review-detail-panel.tsx` |
| TradeDetailPanel — no keyboard shortcut to close (Escape) | Medium | — |
| TradeDetailPanel — 380px is too narrow for screenshot gallery | Low | `trade-detail-panel.tsx` |
| AccountDetailPanel — no sticky header on scroll | Low | — |
| Mobile panels have no swipe-to-dismiss gesture | Medium | All detail panels |

---

## 2. Mobile Responsiveness Issues

### 2.1 Known Issues by Page

| Page | Issue | Severity |
|---|---|---|
| Dashboard | Tab bar overflows horizontally on small screens (< 375px) | High |
| Dashboard | Charts (Recharts) render at fixed heights without mobile optimization | Medium |
| Trades | Trade table has 8+ columns — horizontally scrollable but no col pinning | Medium |
| Trades | KPI strip shows 2 columns of 4 — bottom row requires scroll | Low |
| Reviews | Detail panel overlay works but back navigation is unclear | Medium |
| Reviews | Review card summary text hidden with `hidden sm:block` | Low |
| Playbook | Setup drawer is `sm:w-[480px]` — full-width on mobile | Low |
| Cuentas | Account card RuleBar may overflow on very small screens | Low |
| Register Trade Modal | Decimal number inputs not `inputmode="decimal"` | Medium |
| AI Coach Drawer | Fixed-position drawer may conflict with iOS keyboard | Medium |

### 2.2 Missing Mobile Optimizations

1. **No `viewport` touch optimization** for number inputs — `inputmode="decimal"` is missing on price/size inputs in the trade form
2. **Charts need touch event handlers** — Recharts does not enable touch tooltips by default; add `<Tooltip trigger="click">` on mobile
3. **Table overflow on mobile** — the trades table has no horizontal scroll container with a shadow fade indicator
4. **iOS Safari rubber-band scroll** — only partially addressed by `overscroll-behavior: contain` on detail panels

### 2.3 Responsive Breakpoint Gaps

| Breakpoint | Status |
|---|---|
| `< 375px` (small phones) | Not tested; dashboard tabs likely overflow |
| `375–767px` (standard mobile) | Generally works; issues noted above |
| `768–1023px` (tablet) | Good — icon-only sidebar works well |
| `1024–1280px` (small desktop) | Good |
| `> 1280px` (large desktop) | Good |

---

## 3. Empty States Design

### 3.1 Current Coverage

| Page | Empty State Exists | Quality |
|---|---|---|
| Reviews | Yes — "No hay reviews" + CTA | Good |
| Aprendizaje | Yes — filtered and unfiltered | Good |
| Cuentas | No — blank space if no accounts | Missing |
| Trades | Spinner only | Minimal |
| Playbook | No — blank canvas if no setups | Missing |
| Mercados | No — blank table | Missing |
| Dashboard | "No hay trades" text only | Minimal |
| Retiros | No — blank | Missing |
| Reglas | Auto-seeded (always has content) | N/A |

### 3.2 Empty State Design Spec

Every empty state should include:
1. **Illustration or icon** — relevant to the section (keep it small, 48–64px)
2. **Headline** — "Aún no tienes X" (friendly, active voice)
3. **Sub-text** — one line explaining what X is for
4. **Primary CTA** — action button to create the first item
5. **Optional: secondary link** — "¿Qué es X? Ver guía"

**Example — Trades page empty state:**

```
┌────────────────────────────────────┐
│           📊                       │
│   Aún no tienes trades registrados │
│   Empieza registrando tu primera   │
│   operación para ver tus métricas. │
│                                    │
│   [+ Registrar primer trade]       │
│   o importa desde MT4/cTrader      │
└────────────────────────────────────┘
```

---

## 4. Onboarding Flow

### 4.1 Current State

New users land on the dashboard with no trades, no accounts, no setups. The dashboard shows all zeros with no guidance. There is no onboarding flow.

### 4.2 Proposed Onboarding Checklist

A dismissable checklist widget shown on the dashboard until completed:

```
┌─ Configura tu Trading Journal ────────────────────┐
│  Completa estos pasos para empezar bien            │
│                                                     │
│  ✓  Crea tu primera cuenta de trading    [→]       │
│  □  Define tus primeros setups           [→]       │
│  □  Registra tu primer trade             [→]       │
│  □  Completa tu perfil                  [→]       │
│  □  Crea tu primera review semanal      [→]       │
│                                                     │
│  1 de 5 completados ██░░░░░░░░                     │
│                               [Omitir este bloque] │
└─────────────────────────────────────────────────────┘
```

**Implementation:**
- State stored in `User.onboardingCompletedAt` (null = in progress)
- Each step checks if data exists (account created, first setup, first trade, etc.)
- "Omitir" marks onboarding as dismissed

### 4.3 First-Run Experience

On very first login (no accounts):
1. Welcome modal with brief product overview (3 slides)
2. "Empecemos" CTA → opens Create Account modal
3. After account creation → opens "Crea tu primer setup" nudge
4. After setup → opens trade registration with tooltip hints on each field

---

## 5. Accessibility Gaps

### 5.1 Keyboard Navigation

| Component | Keyboard Support | Issue |
|---|---|---|
| Sidebar nav | Partial — `<Link>` is keyboard accessible | No focus ring visible by default |
| Trade registration modal | Partial | Tab order not optimized for form flow |
| Dialog close (X button) | No Escape key handler | — |
| Detail panels | No Escape to close | — |
| Tag input | Unclear — uses `<button>` chips | — |
| Direction toggle (LONG/SHORT) | Unknown | Needs `role="radiogroup"` |

### 5.2 Color Contrast

The light mode uses `--ink-3: #8A8678` on `--panel: #FFFFFF`. Contrast ratio: ~4.1:1. This meets WCAG AA for normal text (≥ 4.5:1 for small text is borderline).

**High-risk locations:**
- `text-eyebrow` class (10.5px small text, `--ink-3`) — fails WCAG AA at 10.5px
- Table column headers in light mode — same issue
- "Peor día" and other subdued labels on KPI cards

### 5.3 Screen Reader Support

- No `aria-label` on icon-only buttons (sidebar collapse, panel close X)
- KPI cards have no accessible labels for percentage changes
- Chart components (Recharts) have no screen reader alternative

### 5.4 Reduced Motion

No `@media (prefers-reduced-motion)` media query. All transitions (sidebar collapse, panel slide-in, drawer) play regardless of user preference.

---

## 6. Performance UX (Loading States and Optimistic Updates)

### 6.1 Current Loading State Coverage

| Interaction | Loading State | Quality |
|---|---|---|
| Page initial load | Suspense-based (`loading.tsx`) | Minimal |
| Trade creation | `createTrade.isPending` (button changes to "Guardando…") | Good |
| Trade close | No visible loading state | Poor |
| Review creation | "Enviando…" on button | Good |
| AI summary generation | Spinner + "Generando…" | Good |
| Account stats loading | No skeleton | Poor |
| Dashboard data loading | "Cargando…" text | Minimal |

### 6.2 Optimistic Updates

Currently no optimistic updates are implemented. All mutations wait for server confirmation before UI updates. For common actions (marking a tag on a trade, updating a filter), this creates perceptible lag.

**Candidates for optimistic updates:**
- Trade tag toggle
- Rule enabled/disabled toggle
- Review draft save
- Learning resource status toggle

Implementation pattern with tRPC + TanStack Query:

```typescript
const updateRule = trpc.rules.toggle.useMutation({
  onMutate: async (input) => {
    await utils.rules.list.cancel()
    const prev = utils.rules.list.getData()
    utils.rules.list.setData(undefined, old =>
      old?.map(r => r.id === input.id ? { ...r, enabled: input.enabled } : r)
    )
    return { prev }
  },
  onError: (_, __, ctx) => {
    if (ctx?.prev) utils.rules.list.setData(undefined, ctx.prev)
  },
  onSettled: () => utils.rules.list.invalidate(),
})
```

### 6.3 Skeleton Screens

Replace "Cargando…" text and spinner-only states with content-shaped skeletons:

```typescript
// Example skeleton for KPI strip
function KpiStripSkeleton() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="h-20 rounded-[var(--radius)] animate-pulse"
          style={{ background: "var(--chip)" }} />
      ))}
    </div>
  )
}
```

---

## 7. Phased UX Improvement Plan

### Phase 1 — Critical Fixes (Weeks 1–2)

| Item | Effort | Impact |
|---|---|---|
| Add Edit button to ReviewDetailPanel | S | Fixes critical missing feature |
| Add delete button to ReviewDetailPanel | S | Basic data management |
| Toast notification system (Sonner) | M | Fixes silent failure UX across all mutations |
| Fix `window.location.reload()` in error boundary | S | SPA correctness |
| Add mobile back button to detail panels | S | Mobile navigation |
| `type="number"` with `inputmode="decimal"` on price inputs | S | Mobile input quality |

### Phase 2 — Feedback and States (Weeks 3–5)

| Item | Effort | Impact |
|---|---|---|
| Skeleton screens for KPI strip, trade table, account cards | M | Perceived performance |
| Empty states for Cuentas, Trades, Playbook, Mercados | M | Onboarding quality |
| Loading states on trade close and account mutations | S | Feedback completeness |
| Escape key to close modals and detail panels | S | Accessibility |
| Focus ring visibility on interactive elements | S | Accessibility |
| Error boundary `reset()` instead of `window.reload()` | S | SPA correctness |

### Phase 3 — Mobile Polish (Weeks 6–8)

| Item | Effort | Impact |
|---|---|---|
| Chart touch interactions (Recharts) | M | Mobile charts usability |
| Table horizontal scroll with shadow fade | S | Mobile tables |
| iOS keyboard conflict in AI coach drawer | M | Mobile chat |
| `prefers-reduced-motion` media query | S | Accessibility |
| Dashboard tab overflow on small screens | M | Mobile responsiveness |
| Swipe-to-dismiss on detail panels | M | Mobile delight |

### Phase 4 — Onboarding and Advanced UX (Weeks 9–14)

| Item | Effort | Impact |
|---|---|---|
| Onboarding checklist widget | M | New user retention |
| First-run welcome flow | L | Activation rate |
| Optimistic updates (rule toggle, tag toggle) | M | Perceived speed |
| Keyboard shortcuts (sidebar collapse, new trade, etc.) | M | Power user efficiency |
| Screen reader aria-labels for icon buttons | S | Accessibility compliance |
| WCAG contrast fixes for `text-eyebrow` and small labels | S | Accessibility compliance |

### Phase 5 — Design System Maturation (Month 4+)

| Item | Effort | Impact |
|---|---|---|
| Component library documentation | L | Developer velocity |
| Storybook setup for UI components | L | Design-dev consistency |
| End-to-end tests for critical flows | L | Regression prevention |
| Color token audit for all contrast ratios | M | Accessibility |
| Animation system with `prefers-reduced-motion` | M | Accessibility + polish |

---

## 8. Quick Wins — Do These First

These require < 1 day each and have visible user impact:

1. **Add `inputmode="decimal"` to all price/quantity inputs** — Fixes mobile keyboard for numbers
2. **Add Escape key handler to all Dialog/modal components** — Standard UX expectation
3. **Add back button to mobile detail panels** — Fixes critical mobile navigation
4. **Add `title` attributes to icon-only buttons** — Quick accessibility win
5. **Fix "Drawdown" label on trades page** — From "peor día" to accurate label
6. **Add `aria-live="polite"` region for mutation feedback** — Screen reader support
7. **Replace `window.location.reload()` in dashboard error** — SPA correctness
8. **Add `animate-pulse` skeleton to dashboard KPIs** — Perceived performance improvement
