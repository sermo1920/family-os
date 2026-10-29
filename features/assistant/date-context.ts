import { addDays, getWeekStart, toDateKey } from "@/features/meal-plan/dates";

// Same simplification as features/household/calendar.ts: no per-household
// time zone yet, the household lives in Suisse romande.
const HOUSEHOLD_TIMEZONE = "Europe/Zurich";

const weekdayFormatter = new Intl.DateTimeFormat("fr-CH", {
  weekday: "long",
  timeZone: "UTC",
});

/** "YYYY-MM-DD" of `now` as seen in the household's time zone. */
export function householdTodayKey(now: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: HOUSEHOLD_TIMEZONE,
  }).format(now);
}

function describeWeek(weekStart: Date): string {
  return Array.from({ length: 7 }, (_, i) => {
    const day = addDays(weekStart, i);
    return `${weekdayFormatter.format(day)} ${toDateKey(day)}`;
  }).join(", ");
}

/**
 * Calendar given to the agents with each request, so that "mardi" or
 * "demain midi" are resolved against real dates computed by code rather
 * than guessed by the model.
 */
export function buildDateContext(now: Date): string {
  const todayKey = householdTodayKey(now);
  const today = new Date(`${todayKey}T00:00:00.000Z`);
  const weekStart = getWeekStart(today);
  return [
    `Aujourd'hui : ${weekdayFormatter.format(today)} ${todayKey}.`,
    `Semaine en cours : ${describeWeek(weekStart)}.`,
    `Semaine prochaine : ${describeWeek(addDays(weekStart, 7))}.`,
  ].join("\n");
}
