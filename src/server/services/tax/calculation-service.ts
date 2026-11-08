import { z } from 'zod';
import type { Prisma, PrismaClient, TaxIncome, TaxDeduction, TaxCredit, TaxPeriod, TaxEvidence, TaxRuleSet, TaxImportCandidate } from '@/lib/generated/prisma/client';
import { calculateTax } from '@/domains/tax/calculation';
import { HN_ISR_2026 } from '@/domains/tax/rules/hn/2026';
import { decimal, money } from '@/domains/tax/decimal';
import { hnlSchema } from '@/domains/tax/validation';
import type { TaxItem } from '@/domains/tax/types';
import { dto, ownedPeriod, fail } from './profile-service';
import { taxHash } from './serializers';
export const MAPPING_VERSION = 'HN-102-manual-labels-v1';
const nonnegativeHnlSchema = hnlSchema.refine(value => decimal(value).gte(0), 'El importe debe ser no negativo.');
const labelSchema = z.enum([
    'Sueldos', 'Otros ingresos gravables', 'Honorarios', 'Gastos', 'Deducciones', 'Retenciones salariales/art.50', 'Pagos a cuenta', 'Pagos del período', 'Excedente anterior'
]);
const reviewSchema = z.object({
    recordId: z.string().uuid(), kind: z.enum([
        'income', 'deduction', 'credit', 'reversal'
    ]),
    legalBasis: z.string().trim().min(1).max(4000), reason: z.string().trim().min(1).max(4000),
    evidenceId: z.string().uuid(), mappingLabel: labelSchema.optional(),
    eligibilityConfirmed: z.boolean().default(false), capReviewed: z.boolean().default(false),
}).strict();
export const informationSchema = z.object({
    sectionB: z.object({
        complete: z.boolean(), nonTaxable: nonnegativeHnlSchema, nonDeductible: nonnegativeHnlSchema, relatedParties: z.string().trim().min(1).max(4000), otherInformation: z.string().max(8000).default('')
    }).strict(),
    accountant: z.object({
        name: z.string().trim().min(1).max(200), rtn: z.string().regex(/^\d{14}$/), registration: z.string().trim().min(1).max(200)
    }).strict().optional(),
    priorFinancialEvidenceId: z.string().uuid().optional(),
    roundingEvidenceId: z.string().uuid().optional(), roundingReason: z.string().trim().max(4000).default(''),
    reviews: z.array(reviewSchema).max(1000).default([]),
}).strict().superRefine((v, ctx) => {
    const keys = v.reviews.map(r => `${r.kind}:${r.recordId}`);
    if (new Set(keys).size !== keys.length)
        ctx.addIssue({ code: 'custom', message: 'Revisión duplicada.' });
});
export type PeriodInformation = z.infer<typeof informationSchema>;
type Linked = {
    evidenceLinks: {
        evidence: TaxEvidence;
    }[];
};
export interface CalculationData {
    period: TaxPeriod;
    incomes: (TaxIncome & Linked)[];
    deductions: (TaxDeduction & Linked)[];
    credits: (TaxCredit & Linked)[];
    evidences: TaxEvidence[];
    reversalReviewIncomeIds: string[];
    rule: TaxRuleSet | null;
    candidates?: TaxImportCandidate[];
    reconciliations?: Prisma.TaxReconciliationGetPayload<{
        include: {
            transaction: {
                select: {
                    id: true;
                    status: true;
                    revision: true;
                    date: true;
                };
            };
        };
    }>[];
}
export type TaxSource = {id:string;amountHnl:string|null;[key:string]:unknown};
type PreparationSources = {incomes:TaxSource[];deductions:TaxSource[];credits:TaxSource[];reversalReviewIncomeIds:string[];candidates:unknown[];reconciliations:unknown[]};
type Reader = PrismaClient | Prisma.TransactionClient;
export const previewSchema = z.object({ periodId: z.string().uuid(), simulation: z.object({ additionalIncomeHnl: nonnegativeHnlSchema }).strict().optional() }).strict();
export async function loadCalculationData(db: Reader, userId: string, periodId: string): Promise<CalculationData> {
    const period = await ownedPeriod(db as Prisma.TransactionClient, userId, periodId);
    const where = { userId, periodId };
    const take = 5001;
    const [incomes, deductions, credits, evidences, reversals, rule, candidates, reconciliations] = await Promise.all([
        db.taxIncome.findMany({
            where, take, include: { evidenceLinks: { include: { evidence: true } } }, orderBy: { id: 'asc' }
        }),
        db.taxDeduction.findMany({
            where, take, include: { evidenceLinks: { include: { evidence: true } } }, orderBy: { id: 'asc' }
        }),
        db.taxCredit.findMany({
            where, take, include: { evidenceLinks: { include: { evidence: true } } }, orderBy: { id: 'asc' }
        }),
        db.taxEvidence.findMany({
            where, take, orderBy: { id: 'asc' }
        }),
        db.taxReconciliation.findMany({
            where: {
                userId, income: { periodId, userId }, transaction: { status: 'REVERSED' }
            }, select: { incomeId: true }, take
        }),
        db.taxRuleSet.findFirst({ where: {
                country: 'HN', year: period.year, regime: period.regime, version: HN_ISR_2026.version, published: true
            } }),
        db.taxImportCandidate.findMany({
            where, take, orderBy: { id: 'asc' }
        }),
        db.taxReconciliation.findMany({
            where: { userId, OR: [{ periodId }, { income: { periodId, userId } }] }, take, include: { transaction: { select: {
                        id: true, status: true, revision: true, date: true
                    } } }, orderBy: { id: 'asc' }
        }),
    ]);
    if ([
        incomes, deductions, credits, evidences, reversals, candidates, reconciliations
    ].some(rows => rows.length > 5000))
        fail('El ejercicio supera el límite de preparación de 5000 registros por tipo.');
    return {
        period, incomes, deductions, credits, evidences, candidates, reconciliations, reversalReviewIncomeIds: [...new Set(reversals.map(r => r.incomeId))].sort(), rule
    };
}
function rulePayload() { const { checksum, ...payload } = HN_ISR_2026; void checksum; return payload; }
function valuationEvidenceIds(value: unknown): string[] {
    if (Array.isArray(value))
        return value.flatMap(valuationEvidenceIds);
    if (!value || typeof value !== 'object')
        return [];
    return Object.entries(value).flatMap(([key, item]) => key === 'evidenceId' && typeof item === 'string' ? [item] : valuationEvidenceIds(item));
}
function sourceRecord<T extends Linked>(row: T) {
    const { evidenceLinks, ...record } = row;
    return { ...record, evidenceIds: evidenceLinks.map(link => link.evidence.id).sort() };
}
function mappedFields(items: TaxItem[], labels: Record<string, string>, calculation: ReturnType<typeof calculateTax> | null, info: PeriodInformation | null) {
    const groups = [
        [
            'salary', 'Sueldos', 'A', '14–20'
        ], [
            'otherTaxable', 'Otros ingresos gravables', 'A', '14–20'
        ], [
            'fees', 'Honorarios', 'A', '14–20'
        ],
        [
            'expenses', 'Gastos', 'A', '14–20'
        ], [
            'deductions', 'Deducciones', 'A', '14–20'
        ],
        [
            'salaryWithholding', 'Retenciones salariales/art.50', 'C', '50–54'
        ], [
            'prepayments', 'Pagos a cuenta', 'C', '50–54'
        ],
        [
            'periodPayments', 'Pagos del período', 'C', '50–54'
        ], [
            'priorExcess', 'Excedente anterior', 'C', '50–54'
        ],
    ];
    const fields = groups.map(([key, label, section, pages]) => {
        const sources = items.filter(item => labels[item.id] === label);
        const admitted = sources.filter(item => item.treatment === 'ADMITTED' && item.amountHnl !== undefined);
        const total = admitted.reduce((sum, item) => sum.plus(item.amountHnl!), decimal('0'));
        return {
            key, label, section, manualVersion: MAPPING_VERSION, pages, aggregation: 'SUM_ADMITTED_SOURCE_AMOUNTS', sourceIds: sources.map(item => item.id), amountHnl: money(total), partial: sources.some(item => item.treatment === 'PENDING')
        };
    });
    const derived = [
        [
            'netTaxableIncome', 'RNG', 'A', '14–20', calculation?.base
        ], [
            'isr', 'ISR', 'D', '56–57', calculation?.tax
        ], [
            'credits', 'Créditos', 'D', '56–57', calculation?.credits
        ], [
            'balanceDue', 'Impuesto a pagar', 'D', '56–57', calculation?.balanceDue
        ], [
            'nonTaxable', 'No gravables', 'B', '32', info?.sectionB.nonTaxable
        ], [
            'nonDeductible', 'No deducibles', 'B', '32', info?.sectionB.nonDeductible
        ]
    ];
    return [...fields, ...derived.map(([key, label, section, pages, amountHnl]) => ({
            key, label, section, pages, manualVersion: MAPPING_VERSION, aggregation: section === 'B' ? 'MANUAL_INFORMATION' : 'CALCULATION_RESULT', sourceIds: [] as string[], amountHnl: amountHnl ?? null, partial: !amountHnl
        }))];
}
/** Only explicit documentary reviews admit amounts; this is not a legal certification. */
export function buildPreparation(data: CalculationData) {
    const { period } = data;
    const pending: string[] = [];
    for (const candidate of data.candidates ?? [])
        if (candidate.status !== 'DISMISSED' && candidate.status !== 'RECONCILED')
            pending.push(`${candidate.id}:SOURCE_RECONCILIATION_PENDING`);
    const information = informationSchema.safeParse(period.information);
    const info = information.success ? information.data : null;
    const profile = z.object({
        rtn: z.string().regex(/^\d{14}$/), domiciled: z.literal(true), individualMerchant: z.boolean()
    }).passthrough().safeParse(period.profileSnapshot);
    if (!profile.success)
        pending.push('PROFILE_INCOMPLETE');
    if (!info?.sectionB.complete)
        pending.push('SECTION_B_INCOMPLETE');
    const valid = (e: TaxEvidence) => e.userId === period.userId && e.periodId === period.id && e.status === 'AVAILABLE' && /^[a-f0-9]{64}$/i.test(e.sha256);
    const evidence = new Map(data.evidences.filter(valid).map(e => [e.id, e]));
    const used = new Set<string>();
    const use = (id?: string) => { if (!id || !evidence.has(id))
        return false; used.add(id); return true; };
    const rounding = !!(period.roundingConfirmed && period.roundingReason.trim() && info?.roundingReason === period.roundingReason && use(info.roundingEvidenceId));
    if (!rounding)
        pending.push('ROUNDING_REVIEW_REQUIRED');
    if (profile.success && profile.data.individualMerchant && (!info?.accountant || !use(info.priorFinancialEvidenceId)))
        pending.push('MERCHANT_ACCOUNTANT_OR_PRIOR_FINANCIAL_REQUIRED');
    const review = (kind: z.infer<typeof reviewSchema>['kind'], id: string) => info?.reviews.find(r => r.kind === kind && r.recordId === id && use(r.evidenceId));
    const labels: Record<string, string> = {};
    const supportedIncome: Record<string, z.infer<typeof labelSchema>> = {
        SALARY: 'Sueldos', SUELDOS: 'Sueldos', HONORARIOS: 'Honorarios', OTHER_TAXABLE: 'Otros ingresos gravables'
    };
    const mapItem = (row: TaxIncome & Linked | TaxDeduction & Linked | TaxCredit & Linked, kind: 'income' | 'deduction' | 'credit'): TaxItem => {
        const r = review(kind, row.id);
        let complete = true;
        const mark = (code: string) => { pending.push(`${row.id}:${code}`); complete = false; };
        if (row.userId !== period.userId || row.periodId !== period.id)
            mark('SCOPE_MISMATCH');
        if (!row.legalReference.trim() || !row.treatmentReason.trim() || !['ADMITTED', 'EXEMPT', 'NOT_APPLICABLE'].includes(row.treatment))
            mark('TREATMENT_PENDING');
        const linkedAvailable = row.evidenceLinks.filter(link => valid(link.evidence));
        for (const link of linkedAvailable) use(link.evidence.id);
        if (!linkedAvailable.length)
            mark('EVIDENCE_REQUIRED');
        let amount = row.amountHnl?.toString();
        let label: string | undefined;
        if (kind === 'income') {
            const income = row as TaxIncome & Linked;
            if (income.recognitionStatus !== 'REVIEWED' || !income.recognitionCriterion.trim() || !income.recognitionLegalBasis.trim())
                mark('RECOGNITION_PENDING');
            if (income.recognitionDate.getUTCFullYear() !== period.year)
                mark('RECOGNITION_YEAR_MISMATCH');
            label = supportedIncome[income.category];
            const natureReviewRequired = income.assetKind === 'TOKEN' || /FTMO|CRYPTO|CRIPTO|PAYOUT|PROP_FIRM/i.test(income.category) || /FTMO/i.test(income.payer);
            if (!label || natureReviewRequired) {
                if (!r || !r.mappingLabel || !['Sueldos', 'Otros ingresos gravables', 'Honorarios'].includes(r.mappingLabel))
                    mark('TREATMENT_AND_MAPPING_REVIEW_REQUIRED');
                else
                    label = r.mappingLabel;
            }
            if (data.reversalReviewIncomeIds.includes(row.id) && !review('reversal', row.id))
                mark('REVERSAL_REVIEW');
        }
        else {
            const proposed = row as TaxDeduction | TaxCredit;
            amount = proposed.admittedHnl?.toString();
            const allowed = kind === 'deduction' ? ['Gastos', 'Deducciones'] : [
                'Retenciones salariales/art.50', 'Pagos a cuenta', 'Pagos del período', 'Excedente anterior'
            ];
            if (!r?.eligibilityConfirmed || !r.capReviewed || !r.mappingLabel || !allowed.includes(r.mappingLabel))
                mark('ELIGIBILITY_CAP_MAPPING_REVIEW_REQUIRED');
            else
                label = r.mappingLabel;
            if (proposed.admittedHnl === null)
                mark('ADMITTED_AMOUNT_MISSING');
        }
        if (row.amountHnl === null)
            mark('VALUATION_MISSING');
        const valuationIds = valuationEvidenceIds('valuation' in row ? row.valuation : null);
        for (const id of valuationIds)
            if (!use(id))
                mark('VALUATION_EVIDENCE_UNAVAILABLE');
        if (kind !== 'income') {
            const proposed = row as TaxDeduction | TaxCredit;
            if (proposed.date.getUTCFullYear() !== period.year)
                mark('APPLICATION_YEAR_MISMATCH');
            if (proposed.admittedHnl !== null && proposed.amountHnl !== null) {
                const available = kind === 'credit' ? decimal(proposed.amountHnl.toString()).minus((proposed as TaxCredit).previouslyAppliedHnl.toString()) : decimal(proposed.amountHnl.toString());
                if (decimal(proposed.admittedHnl.toString()).lt(0) || decimal(proposed.admittedHnl.toString()).gt(available))
                    mark('ECONOMIC_CAP_EXCEEDED');
            }
        }
        if (label)
            labels[row.id] = label;
        return {
            id: row.id, componentId: kind === 'income' ? `income:${row.id}` : (row as TaxDeduction | TaxCredit).componentKey, amountHnl: amount, treatment: complete ? row.treatment as TaxItem['treatment'] : 'PENDING', legalBasis: row.legalReference
        };
    };
    const incomes = data.incomes.map(r => mapItem(r, 'income'));
    const deductions = data.deductions.map(r => mapItem(r, 'deduction'));
    const credits = data.credits.map(r => mapItem(r, 'credit'));
    const components = [...incomes, ...deductions, ...credits].map(r => r.componentId);
    const duplicate = new Set(components).size !== components.length;
    if (duplicate)
        pending.push('DUPLICATE_ECONOMIC_COMPONENT');
    const rulesAvailable = period.year === 2026 && period.regime === 'NATURAL_ORDINARY' && data.rule?.published === true && data.rule.version === HN_ISR_2026.version && data.rule.checksum === HN_ISR_2026.checksum && taxHash(data.rule.payload) === taxHash(rulePayload());
    if (!rulesAvailable)
        pending.push('RULES_UNAVAILABLE');
    const calculation = rulesAvailable && !duplicate ? calculateTax({
        country: 'HN', year: 2026, regime: period.regime, ruleSetVersion: HN_ISR_2026.version, incomes, deductions, credits, roundingConfirmed: rounding, roundingReason: period.roundingReason
    }) : null;
    if (calculation)
        pending.push(...calculation.pending);
    const manifest = [...used].sort().map(id => { const e = evidence.get(id)!; return {
        id: e.id, name: e.name, mime: e.mime, size: e.size, sha256: e.sha256
    }; });
    const sources: PreparationSources = dto({
        incomes: data.incomes.map(sourceRecord), deductions: data.deductions.map(sourceRecord), credits: data.credits.map(sourceRecord), reversalReviewIncomeIds: data.reversalReviewIncomeIds, candidates: data.candidates ?? [], reconciliations: data.reconciliations ?? []
    });
    // Lifecycle revision/status are deliberately excluded; every economic input is frozen.
    const inputs: unknown = dto({
        year: period.year, regime: period.regime, profile: period.profileSnapshot, information: period.information, roundingConfirmed: period.roundingConfirmed, roundingReason: period.roundingReason, sources, manifest, rule: rulesAvailable ? HN_ISR_2026 : null, mappingVersion: MAPPING_VERSION
    });
    const issues = [...new Set(pending)];
    return {
        status: issues.length === 0 ? 'READY' as const : calculation ? 'IN_REVIEW' as const : 'DRAFT' as const, inputHash: taxHash(inputs), inputs, sources, calculation, coverage: {complete: issues.length === 0, includedIds: calculation?.coverage.includedIds ?? [], excludedIds: calculation?.coverage.excludedIds ?? [...incomes,...deductions,...credits].map(item=>item.id)}, pending: issues, manifest, ruleVersion: rulesAvailable ? HN_ISR_2026.version : 'UNAVAILABLE', mappingVersion: MAPPING_VERSION, form: {
            fields: mappedFields([...incomes, ...deductions, ...credits], labels, calculation, info), A: {
                labels, admittedIncome: calculation?.admittedIncome ?? null, deductions: calculation?.deductions ?? null, base: calculation?.base ?? null
            }, B: info?.sectionB ?? null, C: { credits: calculation?.credits ?? null }, D: {
                tax: calculation?.tax ?? null, balanceDue: calculation?.balanceDue ?? null, excessCredit: calculation?.excessCredit ?? null
            }
        }, notice: 'Borrador / no presentado. Revisiones declaradas por el usuario; sin validación oficial SAR.'
    };
}
export async function previewCalculation(db: PrismaClient, userId: string, raw: z.input<typeof previewSchema>) {
    const input = previewSchema.parse(raw);
    const data = await loadCalculationData(db, userId, input.periodId);
    const preparation = buildPreparation(data);
    if (!input.simulation)
        return {...preparation,simulation:null};
    // Read-only scenario, isolated from preparation and all persisted records.
    const calculation = preparation.calculation;
    return {
        ...preparation, status: 'IN_REVIEW' as const, coverage: {...preparation.coverage,complete:false}, pending:[...preparation.pending,'SIMULATION_ONLY'], simulation: { additionalIncomeHnl: input.simulation.additionalIncomeHnl, calculation: calculation ? calculateTax({
                country: 'HN', year: 2026, regime: 'NATURAL_ORDINARY', ruleSetVersion: HN_ISR_2026.version, incomes: [{
                        id: 'simulation-base', componentId: 'simulation-base', amountHnl: calculation.admittedIncome, treatment: 'ADMITTED', legalBasis: 'Simulación'
                    }, {
                        id: 'simulation-extra', componentId: 'simulation-extra', amountHnl: input.simulation.additionalIncomeHnl, treatment: 'ADMITTED', legalBasis: 'Simulación'
                    }], deductions: [{
                        id: 'simulation-deductions', componentId: 'simulation-deductions', amountHnl: calculation.deductions, treatment: 'ADMITTED', legalBasis: 'Simulación'
                    }], credits: [{
                        id: 'simulation-credits', componentId: 'simulation-credits', amountHnl: calculation.credits, treatment: 'ADMITTED', legalBasis: 'Simulación'
                    }], roundingConfirmed: false
            }) : null }, notice: 'Simulación de solo lectura / no presentada; no modifica ingresos ni demuestra cobertura.'
    };
}
