import type { z } from 'zod';
import type { assetSchema, valuationSchema, treatmentSchema, recognitionSchema, postingSchema, transactionSchema, taxItemSchema, calculationInputSchema } from './validation';
export type TaxAsset = z.infer<typeof assetSchema>;
export type TaxValuation = z.infer<typeof valuationSchema>;
export type TaxTreatment = z.infer<typeof treatmentSchema>;
export type TaxRecognition = z.infer<typeof recognitionSchema>;
export type TaxPosting = z.infer<typeof postingSchema>;
export type TaxTransaction = z.infer<typeof transactionSchema>;
export type TaxItem = z.infer<typeof taxItemSchema>;
export type TaxCalculationInput = z.infer<typeof calculationInputSchema>;
export interface TaxBracket { lower: string; upper: string | null; rate: string; portion: string; tax: string }
export interface IsrResult { base: string; tax: string; brackets: TaxBracket[]; roundingAdjustment: string; ruleVersion: string }
export interface TaxCalculationResult extends IsrResult { admittedIncome: string; deductions: string; credits: string; balanceDue: string; excessCredit: string; pending: string[]; coverage: { complete: boolean; includedIds: string[]; excludedIds: string[] }; sourceIds: string[] }
