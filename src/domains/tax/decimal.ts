import { Prisma } from '../../lib/generated/prisma/client';
// Clone isolates fiscal arithmetic from global Decimal precision changes.
export const TaxDecimal = Prisma.Decimal.clone({ precision: 100, rounding: Prisma.Decimal.ROUND_HALF_UP });
export function decimal(value: string, precision = 38, scale = 18): Prisma.Decimal {
  if (typeof value !== 'string' || !/^-?(0|[1-9]\d*)(\.\d+)?$/.test(value)) throw new Error('Invalid decimal string');
  const [integer, fraction = ''] = value.replace(/^-/, '').split('.');
  if (integer.length > precision - scale || fraction.length > scale) throw new Error('Decimal exceeds persistence precision/scale');
  return new TaxDecimal(value);
}
export function hnl(value: string): Prisma.Decimal { return decimal(value, 20, 2); }
export function money(value: Prisma.Decimal): string {
  const rounded = value.toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
  const [whole, fraction = ''] = rounded.toString().split('.');
  const result = `${whole}.${fraction.padEnd(2, '0')}`;
  hnl(result);
  return result;
}
