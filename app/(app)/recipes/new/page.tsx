import { getOrCreateCurrentMember } from "@/lib/auth";
import { listIngredients } from "@/features/ingredients/queries";
import { RecipeForm } from "@/features/recipes/components/recipe-form";

export default async function NewRecipePage() {
  const member = await getOrCreateCurrentMember();
  const ingredients = await listIngredients(member.householdId);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <h1 className="text-2xl font-semibold">Nouvelle recette</h1>
      <RecipeForm
        householdId={member.householdId}
        ingredientOptions={ingredients.map((i) => ({ id: i.id, name: i.name }))}
      />
    </div>
  );
}
