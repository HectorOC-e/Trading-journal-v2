import { router } from "./init"
import { tradesRouter }      from "./routers/trades"
import { accountsRouter }    from "./routers/accounts"
import { withdrawalsRouter } from "./routers/withdrawals"
import { accountLogsRouter } from "./routers/account-logs"
import { marketsRouter }     from "./routers/markets"

export const appRouter = router({
  trades:      tradesRouter,
  accounts:    accountsRouter,
  withdrawals: withdrawalsRouter,
  accountLogs: accountLogsRouter,
  markets:     marketsRouter,
})

export type AppRouter = typeof appRouter
