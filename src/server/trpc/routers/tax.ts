import { z } from 'zod';
import { router, protectedProcedure } from '../init';
import * as profile from '@/server/services/tax/profile-service';
import * as ledger from '@/server/services/tax/ledger-service';
import * as records from '@/server/services/tax/record-service';
import * as imports from '@/server/services/tax/reconciliation-service';
export const taxRouter = router({
    profile: router({ get: protectedProcedure.query(({ ctx }) => profile.getProfile(ctx.prisma, ctx.userId)), save: protectedProcedure.input(profile.profileSchema).mutation(({ ctx, input }) => profile.saveProfile(ctx.prisma, ctx.userId, input)) }),
    periods: router({ list: protectedProcedure.input(profile.pageSchema.strict()).query(({ ctx, input }) => profile.listPeriods(ctx.prisma, ctx.userId, input)), create: protectedProcedure.input(profile.periodCreateSchema).mutation(({ ctx, input }) => profile.createPeriod(ctx.prisma, ctx.userId, input)) }),
    accounts: router({ list: protectedProcedure.input(profile.pageSchema.strict()).query(({ ctx, input }) => profile.listAccounts(ctx.prisma, ctx.userId, input)), save: protectedProcedure.input(profile.accountSchema).mutation(({ ctx, input }) => profile.saveAccount(ctx.prisma, ctx.userId, input)) }),
    transactions: router({ list: protectedProcedure.input(profile.periodPageSchema).query(({ ctx, input }) => ledger.listTransactions(ctx.prisma, ctx.userId, input)), save: protectedProcedure.input(ledger.transactionInputSchema).mutation(({ ctx, input }) => ledger.saveTransaction(ctx.prisma, ctx.userId, input)), post: protectedProcedure.input(ledger.postSchema).mutation(({ ctx, input }) => ledger.postTransaction(ctx.prisma, ctx.userId, input)), reverse: protectedProcedure.input(ledger.reverseSchema).mutation(({ ctx, input }) => ledger.reverseTransaction(ctx.prisma, ctx.userId, input)) }),
    incomes: router({ list: protectedProcedure.input(profile.periodPageSchema).query(({ ctx, input }) => records.listIncomes(ctx.prisma, ctx.userId, input)), save: protectedProcedure.input(records.incomeSchema).mutation(({ ctx, input }) => records.saveIncome(ctx.prisma, ctx.userId, input)) }),
    deductions: router({ list: protectedProcedure.input(profile.periodPageSchema).query(({ ctx, input }) => records.listDeductions(ctx.prisma, ctx.userId, input)), save: protectedProcedure.input(records.deductionSchema).mutation(({ ctx, input }) => records.saveDeduction(ctx.prisma, ctx.userId, input)) }),
    credits: router({ list: protectedProcedure.input(profile.periodPageSchema).query(({ ctx, input }) => records.listCredits(ctx.prisma, ctx.userId, input)), save: protectedProcedure.input(records.creditSchema).mutation(({ ctx, input }) => records.saveCredit(ctx.prisma, ctx.userId, input)) }),
    imports: router({ candidates: protectedProcedure.input(imports.candidatesSchema).query(({ ctx, input }) => imports.candidates(ctx.prisma, ctx.userId, input)), reconcile: protectedProcedure.input(imports.reconcileSchema).mutation(({ ctx, input }) => imports.reconcile(ctx.prisma, ctx.userId, input)), dismiss: protectedProcedure.input(imports.dismissSchema).mutation(({ ctx, input }) => imports.dismiss(ctx.prisma, ctx.userId, input)) }),
    overview: protectedProcedure.input(z.object({ periodId: z.string().uuid() }).strict()).query(({ ctx, input }) => ledger.overview(ctx.prisma, ctx.userId, input)),
});
