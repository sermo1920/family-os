import Link from "next/link";
import { getOrCreateCurrentMember } from "@/lib/auth";
import { listIngredients } from "@/features/ingredients/queries";
import { listRecipes } from "@/features/recipes/queries";
import { categoryLabels, unitLabels } from "@/features/ingredients/schema";
import { AddIngredientDialog } from "@/features/ingredients/components/add-ingredient-dialog";
import { EditIngredientDialog } from "@/features/ingredients/components/edit-ingredient-dialog";
import { DeleteIngredientButton } from "@/features/ingredients/components/delete-ingredient-button";
import { NewRecipeDialog } from "@/features/recipes/components/new-recipe-dialog";

export default async function IngredientsPage() {
  const member = await getOrCreateCurrentMember();
  const [ingredients, recipes] = await Promise.all([
    listIngredients(member.householdId),
    listRecipes(member.householdId),
  ]);

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
              ingredientOptions={ingredients.map((i) => ({
                id: i.id,
                name: i.name,
              }))}
            />
          </div>

          <ul className="flex flex-col gap-2">
            {recipes.map((recipe) => (
              <li key={recipe.id}>
                <Link
                  href={`/recipes/${recipe.id}`}
                  className="hover:bg-accent flex items-center justify-between rounded-md border px-4 py-3"
                >
                  <span className="font-medium">{recipe.name}</span>
                  <span className="text-muted-foreground text-sm">
                    {recipe.servings} portion{recipe.servings > 1 ? "s" : ""}
                  </span>
                </Link>
              </li>
            ))}
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
