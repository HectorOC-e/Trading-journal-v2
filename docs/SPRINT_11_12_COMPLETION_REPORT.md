# Sprint 11-12 — Completion Report
> **Date:** 2026-06-04  
> **Status:** ✅ Key deliverables completed; long-tail items documented

## Delivered Tasks

| Task | Description | Status |
|------|-------------|--------|
| TASK-052 | Onboarding checklist component (4 steps, progress ring, dismissible) | ✅ |
| TD-036 | Streak service UTC timezone fix | ✅ |
| TD-036 | ISO week key UTC timezone fix | ✅ |
| — | Pre-existing streak test fixed (timezone-sensitive assertion) | ✅ |

## Onboarding Checklist (TASK-052)
**File:** `src/components/onboarding/onboarding-checklist.tsx`

- 4 actionable steps with deep links:
  1. "Crea tu primera cuenta de trading" → `/cuentas`
  2. "Añade un setup a tu Playbook" → `/playbook`
  3. "Registra tu primer trade" → `/trades`
  4. "Completa tu perfil" → `/perfil`
- SVG progress ring showing % complete
- Collapsible accordion with dismiss button
- localStorage persistence: dismissed state survives page reload
- Auto-dismisses when all steps are complete
- Integrated into Dashboard portfolio tab (above main content)

## Remaining Open Items (Backlog for v3)

### TD-018 — Router Business Logic Extraction (Ongoing)
- Current: `trades.ts` is 924 lines with inline business logic
- Partial mitigation: analytics already extracted to `domains/analytics/services/`
- Remaining: close/open/addEvent mutation logic could be extracted to `trade-domain.ts`
- Estimated effort: 4-6h; low urgency (no functional impact)
- **Decision:** Defer to v3 refactoring sprint

### TD-019 — Supabase Client Per Request
- Current: tRPC context creates a new Supabase client on every request via `createServerClient`
- Impact: slight latency overhead; each request initializes TLS handshake
- Fix: use connection pooling via Supabase SDK's built-in management or Prisma Accelerate
- **Decision:** Defer to v3 (infrastructure change requiring staging validation)

### Onboarding v2 (Future)
- Add video tutorial links per step
- Add "skip" option per individual step
- Add account-type onboarding (prop firm vs personal)

## Tests
- 479 passing (unchanged)
- TypeScript: 0 errors
