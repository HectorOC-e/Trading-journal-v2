import { safeTimeZone } from "@/lib/datetime/local";

export const DEFAULT_LEARNING_REMINDER_TIME = "19:00";
const GRACE_MINUTES = 5;

/** Find the intended instant, tolerating four minutes of queue/network delay. */
export function learningReminderInstant(
  now: Date,
  timezone: string,
  time = DEFAULT_LEARNING_REMINDER_TIME,
): Date | null {
  const format = new Intl.DateTimeFormat("en-GB", {
    timeZone: safeTimeZone(timezone),
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
  const currentMinute = Math.floor(now.getTime() / 60000) * 60000;
  for (let offset = 0; offset < GRACE_MINUTES; offset++) {
    const instant = new Date(currentMinute - offset * 60000);
    const parts = format.formatToParts(instant);
    const hour = parts.find((p) => p.type === "hour")?.value;
    const minute = parts.find((p) => p.type === "minute")?.value;
    if (`${hour}:${minute}` === time) return instant;
  }
  return null;
}
export function isLearningReminderDue(
  now: Date,
  timezone: string,
  time = DEFAULT_LEARNING_REMINDER_TIME,
): boolean {
  return learningReminderInstant(now, timezone, time) !== null;
}
