import { describe, expect, it } from "vitest";
import { parseProfileNumber, readProfileDraft } from "./profile-form";
describe("profile numeric drafts", () => {
  it("accepts fractions, commas, zero and cleared values", () => {
    expect(parseProfileNumber("0.5", { min: 0 })).toBe(0.5);
    expect(parseProfileNumber("0,05", { min: 0 })).toBe(0.05);
    expect(parseProfileNumber("0", { min: 0 })).toBe(0);
    expect(parseProfileNumber("", { min: 0 })).toBeNull();
  });
  it("rejects malformed, out of range and fractional integer drafts", () => {
    for (const draft of ["1foo", "NaN", "1.2.3", "-1", "1e3", ".", "1,000.1"]) {
      expect(() => parseProfileNumber(draft, { min: 0, max: 100 })).toThrow();
    }
    expect(() => parseProfileNumber("1.5", { integer: true })).toThrow();
    expect(() => parseProfileNumber("101", { max: 100 })).toThrow();
  });
});

it("restores only expected manual fields and ignores extra secrets", () => {
  expect(readProfileDraft("not-json")).toBeNull();
  expect(
    readProfileDraft(
      JSON.stringify({
        personal: {
          name: "Name",
          timezone: "UTC",
          language: "es",
          baseCurrency: "USD",
          fxRates: { EUR: "0,5" },
          apiKey: "secret",
        },
      }),
    )?.personal,
  ).not.toHaveProperty("apiKey");
  expect(
    readProfileDraft(JSON.stringify({ personal: { name: 1 } })),
  ).toBeNull();
  expect(
    readProfileDraft(
      JSON.stringify({
        goals: {
          disciplineGoal: "80",
          weeklyTradesGoal: "0",
          weeklyPnlGoal: "0.5",
          weeklyGoalMinutesG: "300",
          password: "secret",
        },
      }),
    )?.goals,
  ).not.toHaveProperty("password");
});
