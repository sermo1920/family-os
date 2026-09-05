import { describe, expect, it } from "vitest";
import {
  calculateAge,
  calculateBmr,
  calculateMacros,
  calculateTdee,
  computeNutritionGoal,
} from "@/features/nutrition-goals/calculations";

describe("calculateAge", () => {
  it("counts the birthday as already passed on the exact day", () => {
    expect(calculateAge(new Date("2000-01-01"), new Date("2026-01-01"))).toBe(
      26,
    );
  });

  it("has not had the birthday yet this year", () => {
    // Anniversaire en juin, référence en janvier de la même année.
    expect(calculateAge(new Date("2000-06-15"), new Date("2026-01-01"))).toBe(
      25,
    );
  });

  it("has already had the birthday this year", () => {
    expect(calculateAge(new Date("2000-06-15"), new Date("2026-07-01"))).toBe(
      26,
    );
  });
});

describe("calculateBmr (Mifflin-St Jeor)", () => {
  it("matches a hand-computed value for a man", () => {
    // 10*80 + 6.25*180 - 5*30 + 5 = 800 + 1125 - 150 + 5 = 1780
    expect(
      calculateBmr({ weightKg: 80, heightCm: 180, age: 30, sex: "MALE" }),
    ).toBe(1780);
  });

  it("matches a hand-computed value for a woman", () => {
    // 10*60 + 6.25*165 - 5*25 - 161 = 600 + 1031.25 - 125 - 161 = 1345.25
    expect(
      calculateBmr({ weightKg: 60, heightCm: 165, age: 25, sex: "FEMALE" }),
    ).toBeCloseTo(1345.25);
  });
});

describe("calculateTdee", () => {
  it("applies the sedentary multiplier (1.2)", () => {
    expect(calculateTdee(1345.25, "SEDENTARY")).toBeCloseTo(1614.3);
  });

  it("applies the moderate multiplier (1.55)", () => {
    expect(calculateTdee(1780, "MODERATE")).toBeCloseTo(2759);
  });
});

describe("calculateMacros", () => {
  it("splits 2000 kcal into 30/40/30", () => {
    // protein: 2000*0.3/4 = 150, carbs: 2000*0.4/4 = 200, fat: 2000*0.3/9 = 66.67 -> 67
    expect(calculateMacros(2000)).toEqual({
      proteinG: 150,
      carbsG: 200,
      fatG: 67,
    });
  });
});

describe("computeNutritionGoal", () => {
  it("produces a consistent result for a 30-year-old man, moderately active", () => {
    const result = computeNutritionGoal({
      weightKg: 80,
      heightCm: 180,
      dateOfBirth: new Date("1996-01-01"),
      sex: "MALE",
      activityLevel: "MODERATE",
      referenceDate: new Date("2026-01-01"),
    });

    // BMR = 1780, TDEE = 1780 * 1.55 = 2759
    expect(result.bmr).toBe(1780);
    expect(result.tdee).toBe(2759);
    expect(result.calorieTarget).toBe(2759);
    // protein: 2759*0.3/4 = 206.925 -> 207, carbs: 2759*0.4/4 = 275.9 -> 276
    // fat: 2759*0.3/9 = 91.966... -> 92
    expect(result.proteinG).toBe(207);
    expect(result.carbsG).toBe(276);
    expect(result.fatG).toBe(92);
  });
});
