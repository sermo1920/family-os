// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { NutritionSummary } from "@/features/recipes/components/nutrition-summary";

describe("NutritionSummary", () => {
  it("renders calories, protein, carbs and fat per portion", () => {
    render(
      <NutritionSummary
        perPortion={{ calories: 138, proteinG: 6, carbsG: 18, fatG: 5 }}
        servings={4}
      />,
    );

    expect(screen.getByText("138 kcal")).toBeInTheDocument();
    expect(screen.getByText("6 g")).toBeInTheDocument();
    expect(screen.getByText("18 g")).toBeInTheDocument();
    expect(screen.getByText("5 g")).toBeInTheDocument();
    expect(screen.getByText("Par portion (4)")).toBeInTheDocument();
  });
});
