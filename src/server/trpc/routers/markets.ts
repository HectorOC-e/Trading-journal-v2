import { z } from "zod"
import { router, protectedProcedure } from "../init"

const MarketInput = z.object({
  symbol:        z.string().min(1),
  name:          z.string().min(1),
  category:      z.enum(["FUTUROS", "FX", "CRIPTO", "EQUITIES"]),
  exchange:      z.string().default(""),
  tickSize:      z.string().default(""),
  pointValue:    z.string().default(""),
  currency:      z.string().default("USD"),
  sessions:      z.array(z.string()).default([]),
  description:   z.string().default(""),
  isWatchlisted: z.boolean().default(false),
})

export const marketsRouter = router({
  list: protectedProcedure
    .input(z.object({
      category:      z.enum(["FUTUROS", "FX", "CRIPTO", "EQUITIES"]).optional(),
      watchlistOnly: z.boolean().default(false),
    }).optional())
    .query(({ ctx, input }) =>
      ctx.prisma.market.findMany({
        where: {
          userId: ctx.userId,
          ...(input?.category      ? { category: input.category }      : {}),
          ...(input?.watchlistOnly ? { isWatchlisted: true }           : {}),
        },
        orderBy: [{ category: "asc" }, { symbol: "asc" }],
      })
    ),

  create: protectedProcedure
    .input(MarketInput)
    .mutation(({ ctx, input }) =>
      ctx.prisma.market.create({
        data: { ...input, userId: ctx.userId },
      })
    ),

  update: protectedProcedure
    .input(z.object({ id: z.string().uuid() }).merge(MarketInput.partial()))
    .mutation(({ ctx, input }) => {
      const { id, ...data } = input
      return ctx.prisma.market.update({
        where: { id, userId: ctx.userId },
        data,
      })
    }),

  toggleWatch: protectedProcedure
    .input(z.object({ id: z.string().uuid(), isWatchlisted: z.boolean() }))
    .mutation(({ ctx, input }) =>
      ctx.prisma.market.update({
        where: { id: input.id, userId: ctx.userId },
        data:  { isWatchlisted: input.isWatchlisted },
      })
    ),

  delete: protectedProcedure
    .input(z.string().uuid())
    .mutation(({ ctx, input }) =>
      ctx.prisma.market.delete({ where: { id: input, userId: ctx.userId } })
    ),

  // Seed default instruments for a new user (called once on first visit)
  seedDefaults: protectedProcedure
    .mutation(async ({ ctx }) => {
      const existing = await ctx.prisma.market.count({ where: { userId: ctx.userId } })
      if (existing > 0) return { seeded: false }

      const defaults = [
        { symbol: "NQ",     name: "Nasdaq-100 E-mini",    category: "FUTUROS",  exchange: "CME",           tickSize: "0.25",    pointValue: "$20",          currency: "USD", sessions: ["NY AM", "NY PM"], isWatchlisted: true,  description: "Índice tecnológico de mayor volatilidad. Principal instrumento de trading." },
        { symbol: "ES",     name: "S&P 500 E-mini",       category: "FUTUROS",  exchange: "CME",           tickSize: "0.25",    pointValue: "$50",          currency: "USD", sessions: ["NY AM", "NY PM"], isWatchlisted: true,  description: "Índice más líquido del mundo. Spreads mínimos, alta correlación con macro." },
        { symbol: "MNQ",    name: "Micro Nasdaq-100",      category: "FUTUROS",  exchange: "CME",           tickSize: "0.25",    pointValue: "$2",           currency: "USD", sessions: ["NY AM", "NY PM"], isWatchlisted: true,  description: "Versión micro del NQ. Ideal para sizing reducido o cuentas prop firma." },
        { symbol: "MES",    name: "Micro S&P 500",         category: "FUTUROS",  exchange: "CME",           tickSize: "0.25",    pointValue: "$5",           currency: "USD", sessions: ["NY AM", "NY PM"], isWatchlisted: false, description: "Versión micro del ES." },
        { symbol: "GC",     name: "Gold",                  category: "FUTUROS",  exchange: "COMEX",         tickSize: "0.10",    pointValue: "$100",         currency: "USD", sessions: ["London", "NY AM"], isWatchlisted: true,  description: "Oro al contado (futuros). Alta reacción a eventos macro y noticias Fed." },
        { symbol: "CL",     name: "Crude Oil WTI",         category: "FUTUROS",  exchange: "NYMEX",         tickSize: "0.01",    pointValue: "$1,000",       currency: "USD", sessions: ["London", "NY AM"], isWatchlisted: false, description: "Petróleo crudo. Muy sensible a inventarios semanales EIA." },
        { symbol: "RTY",    name: "Russell 2000 E-mini",   category: "FUTUROS",  exchange: "CME",           tickSize: "0.10",    pointValue: "$50",          currency: "USD", sessions: ["NY AM", "NY PM"], isWatchlisted: false, description: "Small caps. Más volátil que ES, menor liquidez." },
        { symbol: "EURUSD", name: "Euro / US Dollar",      category: "FX",       exchange: "OTC",           tickSize: "0.00001", pointValue: "$10 / lot",    currency: "USD", sessions: ["London", "NY AM"], isWatchlisted: true,  description: "Par más líquido del mundo. Killzone London 02:00–05:00 ET." },
        { symbol: "GBPUSD", name: "Pound / US Dollar",     category: "FX",       exchange: "OTC",           tickSize: "0.00001", pointValue: "$10 / lot",    currency: "USD", sessions: ["London", "NY AM"], isWatchlisted: true,  description: "Cable. Alta volatilidad en noticias UK y Fed." },
        { symbol: "USDJPY", name: "US Dollar / Yen",       category: "FX",       exchange: "OTC",           tickSize: "0.001",   pointValue: "$9.1 / lot",   currency: "USD", sessions: ["Asia", "London"],  isWatchlisted: false, description: "Par de carry trade. Muy activo en sesión Asia." },
        { symbol: "XAUUSD", name: "Gold Spot FX",          category: "FX",       exchange: "OTC",           tickSize: "0.01",    pointValue: "$100 / lot",   currency: "USD", sessions: ["London", "NY AM"], isWatchlisted: false, description: "Oro spot en mercado FX. Correlacionado con DXY." },
        { symbol: "BTCUSD", name: "Bitcoin / US Dollar",   category: "CRIPTO",   exchange: "Binance / CME", tickSize: "1.00",    pointValue: "1 BTC",        currency: "USD", sessions: ["24h"],             isWatchlisted: true,  description: "Activo digital de mayor capitalización. Alta volatilidad, spreads variables." },
        { symbol: "ETHUSD", name: "Ethereum / US Dollar",  category: "CRIPTO",   exchange: "Binance / CME", tickSize: "0.01",    pointValue: "1 ETH",        currency: "USD", sessions: ["24h"],             isWatchlisted: false, description: "Segunda criptomoneda por capitalización. Correlación alta con BTC." },
        { symbol: "SOLUSD", name: "Solana / US Dollar",    category: "CRIPTO",   exchange: "Binance",       tickSize: "0.01",    pointValue: "1 SOL",        currency: "USD", sessions: ["24h"],             isWatchlisted: false, description: "L1 de alta velocidad. Más volátil que ETH." },
        { symbol: "AAPL",   name: "Apple Inc.",             category: "EQUITIES", exchange: "NASDAQ",        tickSize: "0.01",    pointValue: "$1 / acción",  currency: "USD", sessions: ["NY AM", "NY PM"], isWatchlisted: false, description: "Mayor capitalización del mercado. Muy seguido en earnings." },
        { symbol: "NVDA",   name: "NVIDIA Corp.",           category: "EQUITIES", exchange: "NASDAQ",        tickSize: "0.01",    pointValue: "$1 / acción",  currency: "USD", sessions: ["NY AM", "NY PM"], isWatchlisted: true,  description: "Líder en GPUs y AI. Alta volatilidad, mueve el NQ." },
        { symbol: "TSLA",   name: "Tesla Inc.",             category: "EQUITIES", exchange: "NASDAQ",        tickSize: "0.01",    pointValue: "$1 / acción",  currency: "USD", sessions: ["NY AM", "NY PM"], isWatchlisted: false, description: "Alta volatilidad individual. Reacciona fuerte a noticias del CEO." },
        { symbol: "SPY",    name: "SPDR S&P 500 ETF",      category: "EQUITIES", exchange: "NYSE",          tickSize: "0.01",    pointValue: "$1 / acción",  currency: "USD", sessions: ["NY AM", "NY PM"], isWatchlisted: false, description: "ETF del S&P 500. Alternativa a ES para accounts sin futuros." },
      ] as const

      await ctx.prisma.market.createMany({
        data: defaults.map(d => ({ ...d, sessions: [...d.sessions], userId: ctx.userId })),
        skipDuplicates: true,
      })
      return { seeded: true }
    }),
})
