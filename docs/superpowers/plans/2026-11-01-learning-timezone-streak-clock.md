# Learning calendar and clock implementation plan

**Goal:** Make learning streaks, weekly hours and the current-time display agree with the profile timezone.

**Architecture:** Reuse `lib/datetime/local.ts` for calendar arithmetic. Completed study sessions remain the source of study minutes and study streaks; reviews retain their separate review streak. Both visible study summaries use `studySessions.home`. Date-only planned/review days must never be timezone shifted.

**Decisions:** Work in the freshly cloned checkout on `fix/learning-timezone-streak-clock`. No schema changes or deployment. Clock displays HH:mm:ss and the profile IANA timezone; UTC is the loading fallback. Attribute planned completions to the actual completion day. Retain pause state across reloads in browser storage keyed by the server session ID. Session time keeps running while the browser is closed unless paused.

- [x] Add regression tests for local midnight/week/DST, future dates, long streaks, planned completions and repeat finishes; observe failures.
- [x] Make study helpers timezone-aware and update home calendar queries without a capped streak window; guard finish transitions transactionally.
- [x] Use the home response for both visible summaries, refresh it on day/profile changes, and show a 24-hour profile clock. Preserve focus timer pauses across reloads and calculate elapsed time at button click.
- [x] Run focused tests, TypeScript, changed-file lint and full unit suite. Review the change and update the Graphify graph using AST only.

**Checks:** Date-only SRS/planned dates; Monday boundary west/east of UTC; DST; paused reload; profile timezone change; duplicate save. Findings outside the study flow are recorded in the audit.

**Evidence:** 1466 tests passed, one skipped with the Sentry socket-dependent file excluded. The initial full run had four `listen EPERM` failures in `sentry-wiring.test.ts`; automatic review rejected a network-enabled rerun. TypeScript passes; changed-file lint has no errors (four effect synchronization warnings). Independent review found no blocking regressions. Details: `docs/learning-time-audit.md`.
