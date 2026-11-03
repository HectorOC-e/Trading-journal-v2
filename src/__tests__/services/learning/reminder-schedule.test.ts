import { expect, it } from "vitest";
import {
  isLearningReminderDue,
  learningReminderInstant,
} from "@/domains/learning/services/reminder-schedule";
it.each([
  ["2026-11-04T01:25:00Z", "America/Tegucigalpa", "19:25", true],
  ["2026-11-04T01:30:00Z", "America/Tegucigalpa", "19:25", false],
  ["2026-11-03T18:15:00Z", "Asia/Kathmandu", "00:00", true],
  ["2026-11-03T13:40:00Z", "Asia/Kolkata", "19:10", true],
  ["2026-01-03T18:30:00Z", "Europe/Madrid", "19:30", true],
  ["2026-07-03T17:30:00Z", "Europe/Madrid", "19:30", true],
  ["2026-11-03T23:59:00Z", "UTC", "23:59", true],
  ["2026-11-03T19:00:00Z", "Invalid/Legacy", undefined, true],
])(
  "matches only the configured local minute: %s %s %s",
  (instant, zone, time, expected) => {
    expect(isLearningReminderDue(new Date(instant), zone, time)).toBe(expected);
  },
);

it("tolerates a delayed tick crossing local midnight while preserving its intended day", () => {
  expect(
    learningReminderInstant(
      new Date("2026-11-04T06:02:12Z"),
      "America/Tegucigalpa",
      "23:59",
    )?.toISOString(),
  ).toBe("2026-11-04T05:59:00.000Z");
});
it("skips a nonexistent DST time and resolves both repeated occurrences to the same local day", () => {
  expect(
    isLearningReminderDue(
      new Date("2026-03-08T07:31:00Z"),
      "America/New_York",
      "02:30",
    ),
  ).toBe(false);
  expect(
    isLearningReminderDue(
      new Date("2026-11-01T05:32:00Z"),
      "America/New_York",
      "01:30",
    ),
  ).toBe(true);
  expect(
    isLearningReminderDue(
      new Date("2026-11-01T06:32:00Z"),
      "America/New_York",
      "01:30",
    ),
  ).toBe(true);
});
