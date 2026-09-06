import { getOrCreateCurrentMember } from "@/lib/auth";
import { listIngredients } from "@/features/ingredients/queries";
import { listRecipesWithIngredients } from "@/features/recipes/queries";
import {
  computeNutritionPerPortion,
  computeRecipeNutritionTotal,
} from "@/features/recipes/calculations";
import { categoryLabels, unitLabels } from "@/features/ingredients/schema";
import { AddIngredientDialog } from "@/features/ingredients/components/add-ingredient-dialog";
import { EditIngredientDialog } from "@/features/ingredients/components/edit-ingredient-dialog";
import { DeleteIngredientButton } from "@/features/ingredients/components/delete-ingredient-button";
import { NewRecipeDialog } from "@/features/recipes/components/new-recipe-dialog";
import { RecipeViewDialog } from "@/features/recipes/components/recipe-view-dialog";
import { EditRecipeDialog } from "@/features/recipes/components/edit-recipe-dialog";
import { DeleteRecipeButton } from "@/features/recipes/components/delete-recipe-button";

export default async function IngredientsPage() {
  const member = await getOrCreateCurrentMember();
  const [ingredients, recipes] = await Promise.all([
    listIngredients(member.householdId),
    listRecipesWithIngredients(member.householdId),
  ]);

  const ingredientOptions = ingredients.map((i) => ({
    id: i.id,
    name: i.name,
  }));

  const categories = Object.keys(categoryLabels) as Array<
    keyof typeof categoryLabels
  >;
  const ingredientsByCategory = categories
    .map((category) => ({
      category,
      items: ingredients.filter((i) => i.category === category),
    }))
    .filter((group) => group.items.length > 0);

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <h1 className="text-2xl font-semibold">Ingrédients & Recettes</h1>

      <div className="grid gap-8 lg:grid-cols-2">
        <div className="flex flex-col gap-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium">Ingrédients</h2>
            <AddIngredientDialog householdId={member.householdId} />
          </div>

          <div className="flex flex-col gap-4">
            {ingredientsByCategory.map(({ category, items }) => (
              <div key={category}>
                <h3 className="text-muted-foreground mb-1 text-xs font-semibold tracking-wide uppercase">
                  {categoryLabels[category]}
                </h3>
                <ul className="flex flex-col gap-2">
                  {items.map((ingredient) => (
                    <li
                      key={ingredient.id}
                      className="flex items-center justify-between rounded-md border px-4 py-3"
                    >
                      <div>
                        <p className="font-medium">{ingredient.name}</p>
                        <p className="text-muted-foreground text-sm">
                          {ingredient.caloriesPer100} kcal pour 100 (
                          {unitLabels[ingredient.baseUnit]})
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <EditIngredientDialog
                          householdId={member.householdId}
                          ingredient={ingredient}
                        />
                        <DeleteIngredientButton
                          ingredientId={ingredient.id}
                          ingredientName={ingredient.name}
                        />
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
            {ingredients.length === 0 && (
              <p className="text-muted-foreground text-sm">
                Aucun ingrédient pour le moment.
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium">Recettes</h2>
            <NewRecipeDialog
              householdId={member.householdId}
              ingredientOptions={ingredientOptions}
            />
          </div>

          <ul className="flex flex-col gap-2">
            {recipes.map((recipe) => {
              const total = computeRecipeNutritionTotal(
                recipe.ingredients.map((ri) => ({
                  quantity: ri.quantity,
                  caloriesPer100: ri.ingredient.caloriesPer100,
                  proteinPer100: ri.ingredient.proteinPer100,
                  carbsPer100: ri.ingredient.carbsPer100,
                  fatPer100: ri.ingredient.fatPer100,
                })),
              );
              const perPortion = computeNutritionPerPortion(
                total,
                recipe.servings,
              );

              return (
                <li
                  key={recipe.id}
                  className="flex items-center justify-between overflow-hidden rounded-md border"
                >
                  <RecipeViewDialog
                    recipe={{
                      name: recipe.name,
                      servings: recipe.servings,
                      instructions: recipe.instructions,
                      perPortion,
                      ingredients: recipe.ingredients.map((ri) => ({
                        id: ri.id,
                        name: ri.ingredient.name,
                        quantity: ri.quantity,
                        baseUnit: ri.ingredient.baseUnit,
                      })),
                    }}
                  />
                  <div className="flex items-center gap-1 pr-4">
                    <EditRecipeDialog
                      householdId={member.householdId}
                      ingredientOptions={ingredientOptions}
                      recipe={{
                        id: recipe.id,
                        name: recipe.name,
                        servings: recipe.servings,
                        instructions: recipe.instructions,
                        ingredients: recipe.ingredients.map((ri) => ({
                          ingredientId: ri.ingredientId,
                          quantity: ri.quantity,
                        })),
                      }}
                    />
                    <DeleteRecipeButton
                      recipeId={recipe.id}
                      recipeName={recipe.name}
                    />
                  </div>
                </li>
              );
            })}
            {recipes.length === 0 && (
              <p className="text-muted-foreground text-sm">
                Aucune recette pour le moment.
              </p>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}
