import { describe, it, expect } from "vitest";
import { HN_ISR_2026 } from "@/domains/tax/rules/hn/2026";
import { createHnRuleSet } from "@/domains/tax/rules/rule-set";
import {
  decideRulePublication,
  summarizeRuleChanges,
} from "@/server/services/tax/rules/publication-policy";
const { checksum: _, ...payload } = HN_ISR_2026;
const increased = payload.brackets.map((b) => ({
  ...b,
  upper:
    b.upper === null
      ? null
      : ({
          "228324.32": "240000.00",
          "348154.10": "360000.00",
          "809660.75": "840000.00",
        }[b.upper] ?? b.upper),
}));
const updated = (year = 2027, number = "01") =>
  createHnRuleSet({
    ...payload,
    year,
    version: `HN-ISR-${year}-v2`,
    brackets: increased,
    references: [
      {
        id: `SAR-${number}-${year}`,
        url: `https://www.sar.gob.hn/download/acuerdo-sar-${number}-${year}/`,
      },
    ],
  });
describe("conservative automatic publication policy", () => {
  it("does not notify an existing baseline again on the first source check", () =>
    expect(decideRulePublication(HN_ISR_2026, HN_ISR_2026).status).toBe(
      "unchanged",
    ));
  it("accepts a compatible new annual package using the previous-year baseline", () =>
    expect(decideRulePublication(updated(), HN_ISR_2026).status).toBe(
      "publish",
    ));
  it("requires review when an already-published agreement changes in place", () =>
    expect(decideRulePublication(updated(2026), HN_ISR_2026)).toMatchObject({
      status: "review_required",
      reasonCode: "PUBLISHED_AGREEMENT_CHANGED",
    }));
  it("never switches back to an older agreement with previous thresholds", () =>
    expect(
      decideRulePublication(HN_ISR_2026, updated(2026, "02")),
    ).toMatchObject({ status: "review_required" }));
  it("does not bootstrap an arbitrary new rule without a known baseline", () =>
    expect(decideRulePublication(updated(), null)).toMatchObject({
      status: "review_required",
      reasonCode: "BASELINE_REQUIRED",
    }));
  it("describes changes without exposing any user financial information", () => {
    const changes = summarizeRuleChanges(HN_ISR_2026, updated());
    expect(changes).toHaveLength(3);
    expect(changes[0]).toMatchObject({
      before: "228324.32",
      after: "240000.00",
    });
  });
});
