import { router } from "./init"
import { tradesRouter }   from "./routers/trades"
import { accountsRouter } from "./routers/accounts"

export const appRouter = router({
  trades:   tradesRouter,
  accounts: accountsRouter,
})

export type AppRouter = typeof appRouter
