# Personalization Roadmap — Trading Journal v2

> **Date:** 2026-05-31  
> **Scope:** Theme system, color customization, dashboard layout, psychology templates, goals, tags, notifications, data preferences — phased implementation

---

## 1. Current Personalization State

| Feature | Status | Notes |
|---|---|---|
| Dark / Light toggle | Implemented | `ThemeProvider`, localStorage persistence |
| System theme (OS preference) | Missing | Not implemented |
| Custom accent color | Missing | Hardcoded to `oklch(58% 0.16 264)` |
| Colorblind mode | Missing | Only green/red scheme available |
| Font size / density | Missing | — |
| Dashboard tab persistence | Missing | Tab selection resets on page reload |
| KPI card ordering | Missing | Fixed layout |
| Session time customization | Display only | Not editable, not persisted |
| Risk defaults | UI present but not saved | Profile page disconnected |
| Custom tags | Free-form strings | No management UI |
| Notification preferences | Toggle UI exists but not persisted | Profile page disconnected |
| Language | Toggle UI exists but not persisted | Only "es" / "English" option |

---

## 2. Theme System

### 2.1 Three-Way Theme Selector

**Current:** Binary toggle between dark and light.  
**Target:** Light / Dark / System (follows OS `prefers-color-scheme`).

Implementation in `src/components/theme-provider.tsx`:

```typescript
type Theme = "dark" | "light" | "system"

function resolveTheme(preference: Theme): "dark" | "light" {
  if (preference === "system") {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
  }
  return preference
}
```

Listen to `prefers-color-scheme` media query change events to update automatically.

### 2.2 Design Token Architecture

The existing token set in `src/app/globals.css` is well-structured for customization. All semantic colors use CSS custom properties on `:root` and `.dark`:

**Current tokens:**
- Background: `--bg`, `--panel`, `--panel-2`
- Text: `--ink`, `--ink-2`, `--ink-3`
- Borders: `--line`, `--line-2`
- States: `--win`, `--win-soft`, `--loss`, `--loss-soft`, `--be`, `--be-soft`
- Accent: `--accent`, `--accent-soft`
- Chart: `--chart-1` through `--chart-5`

**Token extension plan:**

```css
/* Tokens added for customization */
:root {
  /* User-overridable accent (OKLCH) */
  --accent-hue:   264;
  --accent-chroma: 0.16;
  --accent-l:      58%;
  --accent:  oklch(var(--accent-l) var(--accent-chroma) var(--accent-hue));

  /* Win/loss can be recolored for accessibility */
  --win-hue:    152;
  --loss-hue:   27;
}
```

To apply a user's custom accent, inject `style="--accent-hue: 320"` on the `<html>` element.

### 2.3 Colorblind Mode

| Mode | Win Color | Loss Color | Accent |
|---|---|---|---|
| Default | Green (`hue: 152`) | Red (`hue: 27`) | Blue (`hue: 264`) |
| Deuteranopia / Protanopia | Blue (`hue: 228`) | Orange (`hue: 45`) | Purple (`hue: 286`) |
| Monochrome | White | Dark gray | Gray |

**Implementation:** Add a `colorScheme` option to `UserPreferences` stored in DB. Apply via CSS class on `<html>`:

```css
.colorblind-deu {
  --win-hue:  228;
  --loss-hue: 45;
}
```

---

## 3. Color Tokens and User Customization

### 3.1 Accent Color Picker

Allow users to select a custom accent hue (0–360 on the OKLCH wheel).

**UI Component:**

```
┌──────────────────────────────────────┐
│  Color de acento                      │
│                                       │
│  ████████████████████████████████    │ ← hue ring (SVG or canvas)
│  ──────────────────────────O─────    │ ← hue slider
│                            ↑          │
│                          264° (Azul) │
│                                       │
│  Presets: [■ Azul] [■ Verde] [■ Morado] [■ Cobre] [■ Rojo]  │
│                                       │
│  [Vista previa] ← live updates        │
└──────────────────────────────────────┘
```

**Persist:** `UserPreferences.accentHue: Int?` in DB.  
**Apply:** Server-side render a `<style>` tag in `layout.tsx` with `--accent-hue: ${user.accentHue}` if configured.

### 3.2 Chart Color Scheme

The 5 chart colors (`--chart-1` through `--chart-5`) are currently hardcoded. Allow users to select from 4 predefined palettes:

| Palette | Colors |
|---|---|
| Default (blue-green) | `#4f6ef7`, `#2d7a3a`, `#b87d2d`, `#b83232`, `#c4622d` |
| Warm (amber-red) | `#f59e0b`, `#ef4444`, `#f97316`, `#dc2626`, `#b45309` |
| Cool (indigo-teal) | `#6366f1`, `#14b8a6`, `#8b5cf6`, `#06b6d4`, `#a855f7` |
| Monochrome | `#94a3b8`, `#64748b`, `#475569`, `#334155`, `#1e293b` |

---

## 4. Dashboard Layout Customization

### 4.1 Persistent Tab Selection

**Current:** Dashboard opens on "Portfolio" tab every time.  
**Target:** Remember last active tab across sessions.

```typescript
// In dashboard page or store
const [activeTab, setActiveTab] = useLocalStorage("tj-dashboard-tab", "portfolio")
```

Optionally persist to `UserPreferences.defaultDashboardTab`.

### 4.2 KPI Card Ordering and Visibility

Allow users to drag-and-drop KPI cards and hide ones they don't use.

**Implementation:**
- KPI card list stored as ordered array in `UserPreferences.kpiOrder: String[]`
- Hidden cards stored in `UserPreferences.kpiHidden: String[]`
- Drag-and-drop via `@dnd-kit/sortable`

**User-facing:** Settings drawer on dashboard ("Personalizar vista") with card toggles.

### 4.3 Chart Grain Persistence

The P&L chart grain (daily/weekly/monthly) resets on page reload. Persist to `localStorage("tj-chart-grain")`.

### 4.4 Proposed `UserPreferences` Schema

```prisma
model UserPreferences {
  userId            String   @id @map("user_id") @db.Uuid
  
  // Theme
  theme             String   @default("system")  // "light" | "dark" | "system"
  accentHue         Int?     @map("accent_hue")  // 0–360 OKLCH hue
  colorScheme       String   @default("default") @map("color_scheme") // "default" | "deuteranopia" | "mono"
  
  // Dashboard
  defaultTab        String   @default("portfolio") @map("default_tab")
  kpiOrder          String[] @default([]) @map("kpi_order")
  kpiHidden         String[] @default([]) @map("kpi_hidden")
  defaultGrain      String   @default("daily") @map("default_grain")
  
  // Density
  tableDensity      String   @default("comfortable") @map("table_density") // "compact" | "comfortable"
  
  // Date/number format
  dateFormat        String   @default("DD/MM/YYYY") @map("date_format")
  numberLocale      String   @default("es-HN") @map("number_locale")

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("user_preferences")
}
```

---

## 5. Trading Psychology Templates

### 5.1 Pre-Session Ritual Templates

Rather than logging preMood 1–5 (current implementation in `TradingSessionLog`), offer structured pre-session templates:

**Template A — Quick Check (1 minute):**
```
• Estado emocional: [1-5 slider]
• Energía: [1-5 slider]
• ¿Revisé el plan del día? [sí/no]
```

**Template B — Full Check (3 minutes):**
```
• Estado emocional: [1-5]
• Energía: [1-5]
• Factores externos de estrés: [texto libre]
• ¿Cuánto dormí? [horas]
• ¿Me siento capaz de seguir mis reglas hoy? [1-5]
• Intención del día: [texto libre]
```

**Template C — Prop Firm Focus:**
```
• ¿Revisé mis límites de drawdown? [sí/no]
• ¿Revisé el calendario de noticias? [sí/no]
• Estado emocional: [1-5]
• Número máximo de trades que me permito hoy: [número]
```

Allow users to select their default template in profile settings. Custom templates (add/remove fields) are a P3 feature.

### 5.2 Post-Trade Reflection Prompts

If a trade had a loss > 1R, automatically suggest a reflection prompt in the AI coach:

```
"Acabas de cerrar un trade con resultado -2.1R.
¿Querés reflexionar sobre este trade?"
  → [Sí, reflexionar]  [Omitir]
```

Clicking "Sí" opens a quick reflection form:
- ¿Seguiste el plan de entrada? [sí/no]
- ¿Cuál fue tu estado emocional al entrar? [texto libre]
- ¿Hay algo que mejorarías? [texto libre]

These responses are stored in `Trade.notes` or a new `TradeReflection` table.

### 5.3 Violation Tag Templates

Rather than free-form tags, provide categorized psychology tags:

| Category | Tags |
|---|---|
| Behavioral violations | Off-plan, Impulsivo, FOMO, Revenge, Overtrading |
| Execution quality | A+, Plan, Parcial, Oversized |
| Market conditions | News, High-volatility, Low-liquidity |
| Outcome quality | Stopped-out, Target-hit, Manually-closed |

The current `VIOLATION_TAGS` constant at `src/types/index.ts` can be extended with categories.

---

## 6. Goal Setting and Tracking

### 6.1 Goal Types

| Goal Type | Metric | Example |
|---|---|---|
| Weekly trades | Count | "Trade 5 days this week" |
| Weekly P&L | Dollar | "Target $500 net P&L" |
| Discipline score | 0–100 | "Maintain ≥ 80 discipline score" |
| Learning minutes | Time | "Study 300 minutes/week" |
| Review completion | Boolean | "Complete weekly review" |
| Drawdown limit | % | "Keep drawdown under 3%" |

### 6.2 Goal Dashboard Widget

Add a "Mis metas" widget to the dashboard that shows current-week progress:

```
┌─ Metas de la semana ────────────────────────────┐
│  ✅ 3 días con trades        3/5 días ████████░░ │
│  📚 Aprendizaje             220/300 min ██████░░░ │
│  ⚠️  Disciplina               72/80    ██████████ │ ← at risk
│  ✅  Review semanal          completada           │
└─────────────────────────────────────────────────┘
```

### 6.3 Schema Extension

The `User` model already has `weeklyGoalMinutes: Int?`. Extend with:

```prisma
// Add to User model:
weeklyTradesGoal    Int?    @map("weekly_trades_goal")
weeklyPnlGoal       Decimal? @map("weekly_pnl_goal") @db.Decimal(14, 2)
disciplineGoal      Int?    @map("discipline_goal")    // 0–100
```

---

## 7. Custom Tags and Categories

### 7.1 Tag Management UI

Create a "Mis tags" section in profile settings:

```
Categorías de tags
──────────────────
Calidad de ejecución:  [A+] [Plan] [Parcial] [+ Agregar]
Violaciones:           [Off-plan] [Impulsivo] [FOMO] [+ Agregar]
Setups propios:        [ICT-FVG] [SMT] [+ Agregar]
Mercados:              [ES] [NQ] [GC] [+ Agregar]
```

Features:
- Add / rename / delete custom tags
- Assign a color to each tag
- Categorize tags (Calidad / Violación / Setup / Mercado / Custom)
- Set tags as "pinned" (always shown first in trade form)

### 7.2 Tag Analytics

With structured tag categories, enable new analytics:
- "Violation rate by tag type over time"
- "Win rate by execution quality tag"
- Custom tag performance report in dashboard

---

## 8. Notification Preferences

### 8.1 Current State

Three notification toggles exist in the profile UI but are never persisted or acted upon.

### 8.2 Target Notification System

| Notification | Channel | Default | Configurable Timing |
|---|---|---|---|
| Weekly review reminder | Email | On · Sunday 7pm | Day + Time picker |
| Rule violation alert | Email | On | Immediately / Daily digest |
| Daily plan reminder | Push / Email | Off | Time picker |
| Drawdown alert (% threshold) | Email | Off | % threshold picker |
| Prop firm health report | Email | On · Monday 8am | Day + Time picker |
| AI coaching insights | Email | Off | Weekly digest |
| Learning streak broken | Push / Email | Off | — |

Implementation path:
1. Persist preferences to `UserPreferences` table
2. Supabase edge function already reads `emailNotifications` from User — extend to read full preferences
3. Add in-app notification center (bell icon in top bar) for real-time alerts

---

## 9. Data Export / Import Preferences

### 9.1 Export Formats

Add export settings section in profile:

| Format | Content | Status |
|---|---|---|
| CSV — Trades | All trade fields | Button exists, no handler |
| CSV — Weekly Reviews | Review history | Not implemented |
| JSON — Full Data Export | All data for portability | Not implemented |
| PDF — Performance Report | Formatted analytics report | Not implemented |

### 9.2 CSV Import Preferences

Allow users to configure CSV column mapping for different brokers (not just MT4):

```typescript
type CsvColumnMapping = {
  symbol:     string  // column name in their CSV
  direction:  string
  entry:      string
  stop:       string
  closePrice: string
  pnl:        string
  date:       string
  time:       string
}
```

Store per-user mappings to make re-import frictionless.

---

## 10. Phased Implementation Plan

### Phase 1 — Foundation (Weeks 1–3)

**Prerequisite: Profile page backend (F-P0-001) must be done first.**

| Item | Effort | Value |
|---|---|---|
| `UserPreferences` table + router | S | Enables all personalization storage |
| Three-way theme toggle (+ system mode) | S | High visibility improvement |
| Persistent dashboard tab | S | Quick win, zero risk |
| Chart grain persistence | S | Quick win |
| Toast system | M | Enables all UX feedback below |

### Phase 2 — Customization Core (Weeks 4–8)

| Item | Effort | Value |
|---|---|---|
| Accent color picker | M | High delight |
| Colorblind mode | M | Accessibility requirement |
| KPI card ordering / hide | M | Power user feature |
| Custom tags management | M | Improves analytics quality |
| Goal setting + dashboard widget | M | Retention driver |

### Phase 3 — Psychology & Personalization (Weeks 9–14)

| Item | Effort | Value |
|---|---|---|
| Per-trade psychology fields | M | Core differentiator |
| Pre-session ritual templates | M | Psychology coaching |
| Post-trade reflection prompts | M | Behavior change |
| Notification system (full) | L | Engagement driver |
| CSV import column mapping | M | Reduces onboarding friction |

### Phase 4 — Advanced (Months 4–6)

| Item | Effort | Value |
|---|---|---|
| Dashboard layout drag-and-drop | L | Power user delight |
| PDF performance report | L | Sharing / accountability |
| Custom tag analytics | L | Analytics quality |
| Chart palette selection | S | Cosmetic personalization |
| Table density toggle | S | Power user UX |
