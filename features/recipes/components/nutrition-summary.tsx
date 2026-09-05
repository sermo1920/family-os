import type { RecipeNutrition } from "@/features/recipes/calculations";

export function NutritionSummary({
  perPortion,
  servings,
}: {
  perPortion: RecipeNutrition;
  servings: number;
}) {
  return (
    <dl className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
      <div>
        <dt className="text-muted-foreground">Par portion ({servings})</dt>
        <dd className="font-medium">{perPortion.calories} kcal</dd>
      </div>
      <div>
        <dt className="text-muted-foreground">Protéines</dt>
        <dd className="font-medium">{perPortion.proteinG} g</dd>
      </div>
      <div>
        <dt className="text-muted-foreground">Glucides</dt>
        <dd className="font-medium">{perPortion.carbsG} g</dd>
      </div>
      <div>
        <dt className="text-muted-foreground">Lipides</dt>
        <dd className="font-medium">{perPortion.fatG} g</dd>
      </div>
    </dl>
  );
}
