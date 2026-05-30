# Project Vision — Trading Journal v2

## What We Are Building

A **professional-grade trading intelligence platform** for retail traders — from beginners to prop-firm participants — that closes the loop between execution, reflection, and continuous learning.

Most trading journals are passive record-keepers. This platform is an active coach: it captures every trade, surfaces behavioral patterns the trader cannot see themselves, enforces rules they committed to, and tracks the learning that changes their edge over time.

## The Core Loop

```
Trade → Journal → Reflect → Learn → Improve → Trade
```

Every module feeds the loop:

| Module | Role in the loop |
|---|---|
| Trades | Capture execution reality (entries, exits, P&L, emotions) |
| Accounts | Track financial state and drawdown constraints |
| Setups | Define repeatable edge — the "what I trade" |
| Playbook | Systematic rules — the "how I trade" |
| Learning | Resources, reviews, spaced repetition — the "what I study" |
| Weekly Reviews | Reflection ritual — close the feedback cycle |
| Dashboard | Unified intelligence view — see the whole picture |

## Positioning

**Not** another spreadsheet exporter.
**Not** a broker integration dashboard.
**Not** a community signal platform.

We are the **cognitive layer** on top of any broker or strategy. We help traders see themselves clearly and improve deliberately.

## Target Users

| Persona | Profile | Key Need |
|---|---|---|
| Retail Learner | <1yr, discretionary, personal account | Habit formation, rule enforcement |
| Prop Firm Candidate | 1-3yr, structured challenge | Drawdown compliance, consistency |
| Funded Trader | 2+yr, managing capital | Edge refinement, performance analytics |
| System Trader | Backtesting setups | Correlating study with setup performance |

## Differentiators

1. **Spaced repetition for trading concepts** — ResourceReview with decay detection turns passive reading into durable knowledge
2. **Setup–learning correlation** — `resourceImpactRanking` connects what you study to how your setups perform
3. **Behavioral streaks and inactivity alerts** — nudges that surface when the trader breaks their own discipline
4. **Rule-first architecture** — Playbook Rules are first-class entities, not just text notes
5. **Multi-account prop firm support** — drawdown models (FIXED/TRAILING), phase tracking, currency isolation

## What This Is Not (Yet)

- **Not a broker integration** — no live P&L feed; trades are manually logged or CSV imported
- **Not a signal service** — no trade recommendations
- **Not a social platform** — single-trader, private vault
- **Not an algo executor** — analytics only, no order routing

## Strategic Priorities (2026)

1. **Data integrity and security** — RLS, auth, no cross-user data leaks (in progress)
2. **Domain stability** — service layer and domain logic decoupled from transport
3. **Dashboard intelligence** — actionable insights, not just charts
4. **AI analytics layer** — pattern recognition on the trader's own data
5. **Mobile-optimized input** — low-friction trade logging from a phone

## Success Metrics

- Trader returns to journal every session (daily/weekly active use)
- Setup win-rate improves measurably quarter over quarter
- Learning resources reviewed on schedule (streak > 14 days)
- Rules violated per week trends downward
