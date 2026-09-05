import { notFound } from "next/navigation";
import { assertHouseholdAccess } from "@/lib/auth";
import { getRecipeWithIngredients } from "@/features/recipes/queries";
import {
  computeNutritionPerPortion,
  computeRecipeNutritionTotal,
} from "@/features/recipes/calculations";
import { NutritionSummary } from "@/features/recipes/components/nutrition-summary";
import { DeleteRecipeButton } from "@/features/recipes/components/delete-recipe-button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const shortUnitLabels = { GRAM: "g", MILLILITER: "ml" } as const;

export default async function RecipePage({
  params,
}: PageProps<"/recipes/[recipeId]">) {
  const { recipeId } = await params;

  const recipe = await getRecipeWithIngredients(recipeId);
  if (!recipe) notFound();

  await assertHouseholdAccess(recipe.householdId);

  const total = computeRecipeNutritionTotal(
    recipe.ingredients.map((ri) => ({
      quantity: ri.quantity,
      caloriesPer100: ri.ingredient.caloriesPer100,
      proteinPer100: ri.ingredient.proteinPer100,
      carbsPer100: ri.ingredient.carbsPer100,
      fatPer100: ri.ingredient.fatPer100,
    })),
  );
  const perPortion = computeNutritionPerPortion(total, recipe.servings);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{recipe.name}</h1>
        <DeleteRecipeButton recipeId={recipe.id} redirectTo="/recipes" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Nutrition par portion</CardTitle>
        </CardHeader>
        <CardContent>
          <NutritionSummary
            perPortion={perPortion}
            servings={recipe.servings}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Ingrédients</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="flex flex-col gap-1 text-sm">
            {recipe.ingredients.map((ri) => (
              <li key={ri.id} className="flex justify-between">
                <span>{ri.ingredient.name}</span>
                <span className="text-muted-foreground">
                  {ri.quantity} {shortUnitLabels[ri.ingredient.baseUnit]}
                </span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {recipe.instructions && (
        <Card>
          <CardHeader>
            <CardTitle>Instructions</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">{recipe.instructions}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
