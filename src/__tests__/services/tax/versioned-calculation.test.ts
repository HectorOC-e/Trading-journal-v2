import { describe, it, expect } from "vitest";
import { HN_ISR_2026 } from "@/domains/tax/rules/hn/2026";
import { createHnRuleSet } from "@/domains/tax/rules/rule-set";
import {
  calculateHnIsr,
  calculateHnIsr2026,
  calculateTax,
} from "@/domains/tax/calculation";
import { buildPreparation } from "@/server/services/tax/calculation-service";
import { fixture } from "./return-fixtures";

// Synthetic local example, not an assertion about any future SAR publication.
const { checksum: _, ...baseline } = HN_ISR_2026;
const rule = createHnRuleSet({
  ...baseline,
  year: 2027,
  version: "HN-ISR-2027-v1",
  brackets: [
    { upper: "240000.00", rate: "0" },
    { upper: "360000.00", rate: "0.15" },
    { upper: "840000.00", rate: "0.20" },
    { upper: null, rate: "0.25" },
  ],
});
describe("calculation with the year-specific verified rule package", () => {
  it("calculates a different year from its own brackets and preserves the legacy wrapper", () => {
    expect(calculateHnIsr("400000", rule).tax).toBe("26000.00");
    expect(calculateHnIsr2026("400000").tax).toBe("28343.65");
  });
  it("rejects a package from another input year", () => {
    const input = {
      country: "HN",
      year: 2026,
      regime: "NATURAL_ORDINARY",
      ruleSetVersion: rule.version,
      incomes: [],
      deductions: [],
      credits: [],
    };
    expect(() => calculateTax(input, rule)).toThrow();
  });
  it("calculates a new-year preparation only from its published matching payload", () => {
    const f = fixture();
    f.period.year = 2027;
    f.incomes[0].amountHnl = "400000.00";
    f.incomes[0].grossAmount = "400000";
    f.incomes[0].recognitionDate = new Date("2027-01-01");
    const { checksum, ...payload } = rule;
    f.rule = {
      published: true,
      version: rule.version,
      checksum,
      payload,
    } as never;
    const result = buildPreparation(f as never);
    expect(result.calculation?.tax).toBe("26000.00");
    expect(result.ruleVersion).toBe(rule.version);
    expect(result.status).toBe("READY");
  });
  it("refuses a matching-year payload with the wrong checksum", () => {
    const f = fixture();
    f.rule.checksum = "0".repeat(64);
    expect(buildPreparation(f as never).pending).toContain("RULES_UNAVAILABLE");
    expect(buildPreparation(f as never).calculation).toBeNull();
  });
  it("changes the preparation fingerprint after a published rule changes", () => {
    const f = fixture(),
      before = buildPreparation(f as never);
    const updated = createHnRuleSet({
      ...baseline,
      version: "HN-ISR-2026-v2",
      brackets: rule.brackets,
    });
    const { checksum, ...payload } = updated;
    f.rule = {
      published: true,
      version: updated.version,
      checksum,
      payload,
    } as never;
    const after = buildPreparation(f as never);
    expect(after.inputHash).not.toBe(before.inputHash);
    expect(after.ruleVersion).toBe(updated.version);
  });
});
