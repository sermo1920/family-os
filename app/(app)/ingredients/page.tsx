import Link from "next/link";
import { getOrCreateCurrentMember } from "@/lib/auth";
import { listIngredients } from "@/features/ingredients/queries";
import { listRecipes } from "@/features/recipes/queries";
import { categoryLabels, unitLabels } from "@/features/ingredients/schema";
import { IngredientForm } from "@/features/ingredients/components/ingredient-form";
import { DeleteIngredientButton } from "@/features/ingredients/components/delete-ingredient-button";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function IngredientsPage() {
  const member = await getOrCreateCurrentMember();
  const [ingredients, recipes] = await Promise.all([
    listIngredients(member.householdId),
    listRecipes(member.householdId),
  ]);

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <h1 className="text-2xl font-semibold">Ingrédients & Recettes</h1>

      <div className="grid gap-8 lg:grid-cols-2">
        <div className="flex flex-col gap-6">
          <h2 className="text-lg font-medium">Ingrédients</h2>

          <ul className="flex flex-col gap-2">
            {ingredients.map((ingredient) => (
              <li
                key={ingredient.id}
                className="flex items-center justify-between rounded-md border px-4 py-3"
              >
                <div>
                  <p className="font-medium">{ingredient.name}</p>
                  <p className="text-muted-foreground text-sm">
                    {categoryLabels[ingredient.category]} ·{" "}
                    {ingredient.caloriesPer100} kcal pour 100 (
                    {unitLabels[ingredient.baseUnit]})
                  </p>
                </div>
                <DeleteIngredientButton ingredientId={ingredient.id} />
              </li>
            ))}
            {ingredients.length === 0 && (
              <p className="text-muted-foreground text-sm">
                Aucun ingrédient pour le moment.
              </p>
            )}
          </ul>

          <Card>
            <CardHeader>
              <CardTitle>Ajouter un ingrédient</CardTitle>
            </CardHeader>
            <CardContent>
              <IngredientForm householdId={member.householdId} />
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col gap-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium">Recettes</h2>
            <Button render={<Link href="/recipes/new" />}>
              Nouvelle recette
            </Button>
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
