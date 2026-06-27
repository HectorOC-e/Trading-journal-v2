import type { inferRouterInputs, inferRouterOutputs } from "@trpc/server"
import { router } from "./init"
import { tradesRouter }           from "./routers/trades"
import { accountsRouter }         from "./routers/accounts"
import { withdrawalsRouter }      from "./routers/withdrawals"
import { accountLogsRouter }      from "./routers/account-logs"
import { marketsRouter }          from "./routers/markets"
import { setupsRouter }           from "./routers/setups"
import { rulesRouter }            from "./routers/rules"
import { weeklyReviewsRouter }    from "./routers/weekly-reviews"
import { learningResourcesRouter }  from "./routers/learning-resources"
import { studySessionsRouter }      from "./routers/study-sessions"
import { tradingSessionsRouter }    from "./routers/trading-sessions"
import { profileRouter }            from "./routers/profile"
import { preferencesRouter }        from "./routers/preferences"
import { goalsRouter }              from "./routers/goals"
import { aiConfigRouter }           from "./routers/ai-config"
import { aiSettingsRouter }         from "./routers/ai-settings"
import { monthlyReviewsRouter }     from "./routers/monthly-reviews"
import { monthlyGoalsRouter }       from "./routers/monthly-goals"
import { analyticsRouter }          from "./routers/analytics"
import { notificationsRouter }      from "./routers/notifications"
import { tagsRouter }               from "./routers/tags"
import { automationsRouter }        from "./routers/automations"
import { customPalettesRouter }     from "./routers/custom-palettes"
import { behaviorRouter }           from "./routers/behavior"
import { coachRouter }              from "./routers/coach"
import { interventionRouter }       from "./routers/intervention"
import { playbookRouter }           from "./routers/playbook"
import { psychologyRouter }         from "./routers/psychology"
import { riskRouter }               from "./routers/risk"

export const appRouter = router({
  trades:           tradesRouter,
  analytics:        analyticsRouter,
  accounts:         accountsRouter,
  withdrawals:      withdrawalsRouter,
  accountLogs:      accountLogsRouter,
  markets:          marketsRouter,
  setups:           setupsRouter,
  rules:            rulesRouter,
  weeklyReviews:    weeklyReviewsRouter,
  monthlyReviews:   monthlyReviewsRouter,
  monthlyGoals:     monthlyGoalsRouter,
  learningResources: learningResourcesRouter,
  studySessions:     studySessionsRouter,
  tradingSessions:   tradingSessionsRouter,
  profile:           profileRouter,
  preferences:       preferencesRouter,
  goals:             goalsRouter,
  aiConfig:          aiConfigRouter,
  aiSettings:        aiSettingsRouter,
  notifications:     notificationsRouter,
  tags:              tagsRouter,
  automations:       automationsRouter,
  customPalettes:    customPalettesRouter,
  behavior:          behaviorRouter,
  coach:             coachRouter,
  intervention:      interventionRouter,
  playbook:          playbookRouter,
  psychology:        psychologyRouter,
  risk:              riskRouter,
})

export type AppRouter     = typeof appRouter
export type RouterOutputs = inferRouterOutputs<AppRouter>
export type RouterInputs  = inferRouterInputs<AppRouter>
