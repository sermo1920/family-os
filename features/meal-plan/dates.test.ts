import { describe, expect, it } from "vitest";
import { addDays, getWeekStart, toDateKey } from "@/features/meal-plan/dates";

describe("getWeekStart", () => {
  it("returns the same Monday when given a Monday", () => {
    // 2026-01-05 is a Monday.
    expect(toDateKey(getWeekStart(new Date("2026-01-05T15:00:00Z")))).toBe(
      "2026-01-05",
    );
  });

  it("returns the previous Monday for a mid-week date", () => {
    // 2026-01-08 is a Thursday.
    expect(toDateKey(getWeekStart(new Date("2026-01-08T00:00:00Z")))).toBe(
      "2026-01-05",
    );
  });

  it("treats Sunday as the last day of the previous week", () => {
    // 2026-01-11 is a Sunday.
    expect(toDateKey(getWeekStart(new Date("2026-01-11T23:00:00Z")))).toBe(
      "2026-01-05",
    );
  });
});

describe("addDays", () => {
  it("adds days across a month boundary", () => {
    expect(toDateKey(addDays(new Date("2026-01-30T00:00:00Z"), 3))).toBe(
      "2026-02-02",
    );
  });
});
