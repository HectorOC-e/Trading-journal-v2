# Personalization — Trading Journal v2

> **Last Updated: 2026-05-31**  
> Merges the existing personalization-roadmap.md with product-gap-analysis and ux-improvement-roadmap findings. Covers current state, proposed schemas, theme system, color customization, dashboard layout, psychology templates, goals, tags, notifications, and phased implementation.

---

## 1. Vision

Every trader has different analytics priorities, cognitive styles, and risk tolerance. Personalization allows Trading Journal v2 to adapt to the individual: a scalper cares about session breakdowns and R-distribution; a swing trader cares about weekly P&L and setup evolution. The goal is to make the tool feel purpose-built for each user without requiring code changes.

**Personalization dimensions:**
1. **Visual** — theme, colors, density, accessibility
2. **Layout** — dashboard configuration, KPI order, default views
3. **Psychology** — pre-session templates, reflection prompts, violation categories
4. **Goals** — weekly targets with progress tracking
5. **Tags** — structured, categorized, color-coded
6. **Notifications** — channel, timing, threshold configuration
7. **Data** — export format, CSV column mapping preferences

---

## 2. Current Personalization State

| Feature | Status | Location | Notes |
|---|---|---|---|
| Dark / Light theme toggle | Implemented | `ThemeProvider`, localStorage `tj-theme` | Works |
| System theme (OS preference) | Missing | — | Not implemented |
| Custom accent color | Missing | Hardcoded `oklch(58% 0.16 264)` (blue) | TASK-046 |
| Colorblind mode | Missing | Only green/red available | TASK-046 |
| Font size / density | Missing | — | |
| Dashboard tab persistence | Missing | Always opens on "Portfolio" | TASK-047 |
| KPI card ordering | Missing | Fixed layout | TASK-050 |
| Chart grain persistence | Missing | Resets to "daily" on reload | TASK-047 |
| Session time customization | Display only | Hardcoded in `Sidebar.tsx` | |
| Risk defaults (pre-fill trade form) | Missing | Profile page disconnected | TASK-006 |
| Custom tags management | None | Free-form strings | TASK-051 |
| Notification preferences | Not saved | Profile page toggles exist but not persisted | TASK-006 |
| Language | Not saved | UI toggle present; defaults to "es" | TASK-006 |
| Theme preference persistence | DB only | Stored in localStorage only (not in DB) | TASK-030 |

**Profile-to-App propagation: 0/14.** No setting saved in the profile propagates to any other part of the application.

---

## 3. User Preferences Model (Proposed)

### `UserPreferences` Table

```prisma
model UserPreferences {
  userId            String   @id @map("user_id") @db.Uuid

  // ── Theme ───────────────────────────────────────────────────────────────
  theme             String   @default("system")     // "light" | "dark" | "system"
  accentHue         Int?     @map("accent_hue")     // 0–360 OKLCH hue
  colorScheme       String   @default("default")    @map("color_scheme")
  // "default" | "deuteranopia" | "protanopia" | "mono"

  // ── Dashboard ───────────────────────────────────────────────────────────
  defaultTab        String   @default("portfolio")  @map("default_tab")
  kpiOrder          String[] @default([])            @map("kpi_order")
  kpiHidden         String[] @default([])            @map("kpi_hidden")
  defaultGrain      String   @default("daily")      @map("default_grain")

  // ── Density ─────────────────────────────────────────────────────────────
  tableDensity      String   @default("comfortable") @map("table_density")
  // "compact" | "comfortable"

  // ── Date/number format ──────────────────────────────────────────────────
  dateFormat        String   @default("DD/MM/YYYY") @map("date_format")
  numberLocale      String   @default("es-HN")      @map("number_locale")

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("user_preferences")
}
```

### tRPC Procedures

```typescript
// src/server/trpc/routers/preferences.ts

preferences: router({
  get: protectedProcedure.query(async ({ ctx }) => {
    return prisma.userPreferences.findUnique({ where: { userId: ctx.userId } })
      ?? DEFAULT_PREFERENCES
  }),

  update: protectedProcedure.input(z.object({
    theme:         z.enum(["light", "dark", "system"]).optional(),
    accentHue:     z.number().min(0).max(360).nullable().optional(),
    colorScheme:   z.enum(["default", "deuteranopia", "mono"]).optional(),
    defaultTab:    z.string().optional(),
    kpiOrder:      z.string().array().optional(),
    kpiHidden:     z.string().array().optional(),
    defaultGrain:  z.string().optional(),
    tableDensity:  z.enum(["compact", "comfortable"]).optional(),
    dateFormat:    z.string().optional(),
    numberLocale:  z.string().optional(),
  })).mutation(async ({ ctx, input }) => {
    return prisma.userPreferences.upsert({
      where: { userId: ctx.userId },
      create: { userId: ctx.userId, ...input },
      update: input,
    })
  }),
})
```

**Dependency:** TASK-030 requires TASK-006 (profile backend) to be done first.

---

## 4. Theme System Design

### 4.1 Three-Way Theme Selector

**Current:** Binary toggle between dark and light.  
**Target:** Light / Dark / System (follows OS `prefers-color-scheme`).

```typescript
// src/components/theme-provider.tsx — updated

type Theme = "dark" | "light" | "system"

function resolveTheme(preference: Theme): "dark" | "light" {
  if (preference === "system") {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
  }
  return preference
}

// Listen to OS preference changes:
window.matchMedia("(prefers-color-scheme: dark)")
  .addEventListener("change", (e) => {
    if (preference === "system") applyTheme(e.matches ? "dark" : "light")
  })
```

**Persistence:** `UserPreferences.theme` in DB (not just localStorage). Theme loaded server-side in `layout.tsx` to avoid flash of wrong theme.

### 4.2 Design Token Architecture

Existing tokens in `src/app/globals.css` (CSS custom properties on `:root` and `.dark`):

- Background: `--bg`, `--panel`, `--panel-2`
- Text: `--ink`, `--ink-2`, `--ink-3`
- Borders: `--line`, `--line-2`
- States: `--win`, `--win-soft`, `--loss`, `--loss-soft`, `--be`, `--be-soft`
- Accent: `--accent`, `--accent-soft`
- Charts: `--chart-1` through `--chart-5`

### 4.3 Token Extension for Customization

```css
/* Tokens added for user customization */
:root {
  /* User-overridable accent (OKLCH) */
  --accent-hue:    264;
  --accent-chroma: 0.16;
  --accent-l:      58%;
  --accent: oklch(var(--accent-l) var(--accent-chroma) var(--accent-hue));

  /* Win/loss recolorable for accessibility */
  --win-hue:  152;   /* default green */
  --loss-hue:  27;   /* default red */
}
```

To apply user's custom accent: inject `style="--accent-hue: 320"` on `<html>` element. Render server-side from `UserPreferences.accentHue` in `layout.tsx`.

---

## 5. Color Accent Customization

### 5.1 Accent Color Picker

Accent hue slider (0–360 on OKLCH wheel):

```
┌──────────────────────────────────────┐
│  Color de acento                      │
│                                       │
│  ████████████████████████████████    │  ← hue ring
│  ──────────────────────────O─────    │  ← hue slider
│                            264° (Azul)│
│                                       │
│  Presets: [■ Azul] [■ Verde] [■ Morado] [■ Cobre] [■ Rojo] │
│                                       │
│  [Vista previa] ← live CSS preview    │
└──────────────────────────────────────┘
```

**Persist:** `UserPreferences.accentHue` in DB.  
**Apply:** Server-side render `<style>` tag in `layout.tsx` with `--accent-hue: ${prefs.accentHue}`.

### 5.2 Colorblind Mode

| Mode | Win Color | Loss Color | Accent |
|---|---|---|---|
| Default | Green (`hue: 152`) | Red (`hue: 27`) | Blue (`hue: 264`) |
| Deuteranopia / Protanopia | Blue (`hue: 228`) | Orange (`hue: 45`) | Purple (`hue: 286`) |
| Monochrome | White | Dark gray | Gray |

Implementation — CSS class on `<html>`:
```css
.colorblind-deu {
  --win-hue:  228;
  --loss-hue:  45;
}
```

### 5.3 Chart Color Palettes

Four preset palettes for the 5 chart color tokens (`--chart-1` through `--chart-5`):

| Palette | Colors |
|---|---|
| Default (blue-green) | `#4f6ef7`, `#2d7a3a`, `#b87d2d`, `#b83232`, `#c4622d` |
| Warm (amber-red) | `#f59e0b`, `#ef4444`, `#f97316`, `#dc2626`, `#b45309` |
| Cool (indigo-teal) | `#6366f1`, `#14b8a6`, `#8b5cf6`, `#06b6d4`, `#a855f7` |
| Monochrome | `#94a3b8`, `#64748b`, `#475569`, `#334155`, `#1e293b` |

---

## 6. Dashboard Widget Configuration

### 6.1 Persistent Tab Selection

```typescript
// Implementation option 1: localStorage (quick win)
const [activeTab, setActiveTab] = useLocalStorage("tj-dashboard-tab", "portfolio")

// Implementation option 2: UserPreferences.defaultTab (requires TASK-030)
```

**TASK-047:** Persist last active tab and chart grain immediately (localStorage first, DB later).

### 6.2 KPI Card Ordering and Visibility

- KPI order stored as `UserPreferences.kpiOrder: String[]`
- Hidden KPIs stored as `UserPreferences.kpiHidden: String[]`
- Drag-and-drop via `@dnd-kit/sortable`
- "Personalizar vista" settings drawer on dashboard
- "Reset to default" option

### 6.3 Chart Grain Persistence

Persist daily/weekly/monthly chart grain selector to `localStorage("tj-chart-grain")` or `UserPreferences.defaultGrain`.

---

## 7. Psychology Templates

### 7.1 Pre-Session Ritual Templates

Rather than a bare 1–5 mood slider (current implementation in `TradingSessionLog`), offer structured templates:

**Template A — Quick Check (1 minute):**
- Estado emocional: [1–5 slider]
- Energía: [1–5 slider]
- ¿Revisé el plan del día? [sí/no]

**Template B — Full Check (3 minutes):**
- Estado emocional: [1–5]
- Energía: [1–5]
- Factores externos de estrés: [text]
- ¿Cuánto dormí? [hours]
- ¿Me siento capaz de seguir mis reglas hoy? [1–5]
- Intención del día: [text]

**Template C — Prop Firm Focus:**
- ¿Revisé mis límites de drawdown? [sí/no]
- ¿Revisé el calendario de noticias? [sí/no]
- Estado emocional: [1–5]
- Número máximo de trades que me permito hoy: [number]

Users select their default template in profile settings. Custom templates are a P3 feature.

### 7.2 Post-Trade Reflection Prompts

If a trade closed with loss > 1R, suggest a reflection prompt via AI coach:

```
"Acabas de cerrar un trade con resultado -2.1R.
¿Querés reflexionar sobre este trade?"
  → [Sí, reflexionar]  [Omitir]
```

Quick reflection form:
- ¿Seguiste el plan de entrada? [sí/no]
- ¿Cuál fue tu estado emocional al entrar? [text]
- ¿Hay algo que mejorarías? [text]

Stored in `Trade.notes` or a new `TradeReflection` table (P3).

### 7.3 Per-Trade Psychology Fields

**TASK-034** — add to `Trade` model:
```prisma
emotionBefore    String?  // "calm" | "anxious" | "excited" | "fearful" | "overconfident"
confidenceRating Int?     // 1–5
executionQuality Int?     // 1–5
fomoFlag         Boolean  @default(false)
revengeFlag      Boolean  @default(false)
```

Surface in register-trade-modal as collapsible "Psicología" section.

---

## 8. Goal Setting & Tracking

### 8.1 Goal Types

| Goal Type | Metric | Example |
|---|---|---|
| Weekly trades | Count | "Trade 5 days this week" |
| Weekly P&L | Dollar | "Target $500 net P&L" |
| Discipline score | 0–100 | "Maintain ≥ 80 discipline score" |
| Learning minutes | Time | "Study 300 minutes/week" |
| Review completion | Boolean | "Complete weekly review" |
| Drawdown limit | % | "Keep drawdown under 3%" |

### 8.2 Goal Dashboard Widget

```
┌─ Metas de la semana ─────────────────────────────────┐
│  ✅ 3 días con trades         3/5 días  ████████░░░  │
│  📚 Aprendizaje              220/300 min ██████░░░░  │
│  ⚠️  Disciplina                72/80     ██████████  │  ← at risk
│  ✅ Review semanal            completada             │
└──────────────────────────────────────────────────────┘
```

### 8.3 Schema Extension (TASK-050)

The `User` model already has `weeklyGoalMinutes: Int?`. Add to `User` model:
```prisma
weeklyTradesGoal    Int?     @map("weekly_trades_goal")
weeklyPnlGoal       Decimal? @map("weekly_pnl_goal") @db.Decimal(14, 2)
disciplineGoal      Int?     @map("discipline_goal")    // 0–100
```

---

## 9. Custom Tags Management

### 9.1 Current State
Tags are free-form `String[]` arrays on `Trade`. Users accumulate duplicates ("fomo", "FOMO", "Fear/FOMO"). No categories, no colors, no management UI.

### 9.2 Target: Tag Management Section in Profile

```
Categorías de tags
──────────────────
Calidad de ejecución:  [A+] [Plan] [Parcial] [+ Agregar]
Violaciones:           [Off-plan] [Impulsivo] [FOMO] [+ Agregar]
Setups propios:        [ICT-FVG] [SMT] [+ Agregar]
Mercados:              [ES] [NQ] [GC] [+ Agregar]
```

**Features:**
- Add / rename / delete custom tags
- Assign color to each tag
- Categorize: Calidad / Violación / Setup / Mercado / Custom
- Pin tags (always shown first in trade form)
- Merge duplicate tags

### 9.3 Tag Analytics (Unlocked by structured tags)

- Violation rate by tag type over time
- Win rate by execution quality tag
- Custom tag performance report in dashboard

**TASK-051:** Implement tags management section in profile page.

---

## 10. Notification Preferences

### 10.1 Current State
Three notification toggles exist in the profile UI but are never persisted or acted upon (TD-003).

### 10.2 Target Notification System

| Notification | Channel | Default | Configurable |
|---|---|---|---|
| Weekly review reminder | Email | On · Sunday 7pm | Day + Time picker |
| Rule violation alert | Email | On | Immediately / Daily digest |
| Daily plan reminder | Push / Email | Off | Time picker |
| Drawdown alert (% threshold) | Email | Off | % threshold picker |
| Prop firm health report | Email | On · Monday 8am | Day + Time picker |
| AI coaching insights | Email | Off | Weekly digest |
| Learning streak broken | Push / Email | Off | — |

### 10.3 Implementation Path
1. Persist notification preferences to `UserPreferences` table (new fields)
2. Edge function already reads `emailNotifications` from `User` — extend to read full preferences
3. Add in-app notification center (bell icon in top bar) for real-time alerts

---

## 11. Data Export / Import Preferences

### 11.1 Export Formats

| Format | Content | Status |
|---|---|---|
| CSV — Trades | All trade fields | Button exists, no handler (TASK-006) |
| CSV — Weekly Reviews | Review history | Not implemented |
| JSON — Full Data Export | All data for portability | Not implemented |
| PDF — Performance Report | Formatted analytics | Not implemented (Phase XIV) |

### 11.2 CSV Import Column Mapping

Allow users to configure column mapping for different brokers:
```typescript
type CsvColumnMapping = {
  symbol:     string   // column name in their CSV
  direction:  string
  entry:      string
  stop:       string
  closePrice: string
  pnl:        string
  date:       string
  time:       string
}
```

Store per-user mappings to make re-import frictionless (Phase XIV).

---

## 12. Implementation Phases

### Phase 1 — Foundation (Weeks 1–3)
**Prerequisite: Profile page backend (TASK-006) must be done first.**

| Item | Task | Effort |
|---|---|---|
| `UserPreferences` table + router | TASK-030 | M |
| Three-way theme toggle (+ system mode) | TASK-045 | S |
| Persistent dashboard tab | TASK-047 | XS |
| Chart grain persistence | TASK-047 | XS |
| Toast system (enables all UX feedback) | TASK-035 | M |

### Phase 2 — Customization Core (Weeks 4–8)

| Item | Task | Effort |
|---|---|---|
| Accent color picker | TASK-046 | M |
| Colorblind mode | TASK-046 | M |
| KPI card ordering / hide | Part of TASK-050 | M |
| Custom tags management | TASK-051 | M |
| Goal setting + dashboard widget | TASK-050 | M |

### Phase 3 — Psychology & Personalization (Weeks 9–14)

| Item | Task | Effort |
|---|---|---|
| Per-trade psychology fields | TASK-034 | M |
| Pre-session ritual templates | Future P2 | M |
| Post-trade reflection prompts | Future P2 | M |
| Notification system (full) | Future P1 | L |
| CSV import column mapping | Future P3 | M |

### Phase 4 — Advanced (Months 4–6)

| Item | Effort |
|---|---|
| Dashboard layout drag-and-drop | L |
| PDF performance report | L |
| Custom tag analytics | L |
| Chart palette selection | S |
| Table density toggle | S |
| In-app notification center | L |
