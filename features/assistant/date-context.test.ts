import { describe, expect, it } from "vitest";
import {
  buildDateContext,
  householdTodayKey,
} from "@/features/assistant/date-context";

describe("householdTodayKey", () => {
  it("uses the Zurich day, not the UTC day", () => {
    // 23:30 UTC on Oct 29 is already Oct 30 in Zurich (UTC+1 in winter).
    expect(householdTodayKey(new Date("2026-10-29T23:30:00Z"))).toBe(
      "2026-10-30",
    );
  });
});

describe("buildDateContext", () => {
  it("lists the current and next week with real dates", () => {
    const context = buildDateContext(new Date("2026-10-29T10:00:00Z"));
    expect(context).toContain("Aujourd'hui : jeudi 2026-10-29.");
    expect(context).toContain("Semaine en cours : lundi 2026-10-26");
    expect(context).toContain("dimanche 2026-11-01");
    expect(context).toContain("Semaine prochaine : lundi 2026-11-02");
  });
});
