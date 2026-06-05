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
import { tradingSessionsRouter }    from "./routers/trading-sessions"
import { profileRouter }            from "./routers/profile"
import { preferencesRouter }        from "./routers/preferences"
import { goalsRouter }              from "./routers/goals"
import { aiConfigRouter }           from "./routers/ai-config"
import { aiSettingsRouter }         from "./routers/ai-settings"
import { tradeTagsRouter }          from "./routers/trade-tags"
import { monthlyReviewsRouter }     from "./routers/monthly-reviews"

export const appRouter = router({
  trades:           tradesRouter,
  accounts:         accountsRouter,
  withdrawals:      withdrawalsRouter,
  accountLogs:      accountLogsRouter,
  markets:          marketsRouter,
  setups:           setupsRouter,
  rules:            rulesRouter,
  weeklyReviews:    weeklyReviewsRouter,
  monthlyReviews:   monthlyReviewsRouter,
  learningResources: learningResourcesRouter,
  tradingSessions:   tradingSessionsRouter,
  profile:           profileRouter,
  preferences:       preferencesRouter,
  goals:             goalsRouter,
  aiConfig:          aiConfigRouter,
  aiSettings:        aiSettingsRouter,
  tradeTags:         tradeTagsRouter,
})

export type AppRouter     = typeof appRouter
export type RouterOutputs = inferRouterOutputs<AppRouter>
export type RouterInputs  = inferRouterInputs<AppRouter>
