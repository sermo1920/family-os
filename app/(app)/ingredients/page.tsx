import { getOrCreateCurrentMember } from "@/lib/auth";
import { listIngredients } from "@/features/ingredients/queries";
import { categoryLabels, unitLabels } from "@/features/ingredients/schema";
import { IngredientForm } from "@/features/ingredients/components/ingredient-form";
import { DeleteIngredientButton } from "@/features/ingredients/components/delete-ingredient-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function IngredientsPage() {
  const member = await getOrCreateCurrentMember();
  const ingredients = await listIngredients(member.householdId);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <h1 className="text-2xl font-semibold">Ingrédients</h1>

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
  );
}
