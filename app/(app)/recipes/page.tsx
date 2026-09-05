import Link from "next/link";
import { getOrCreateCurrentMember } from "@/lib/auth";
import { listRecipes } from "@/features/recipes/queries";
import { Button } from "@/components/ui/button";

export default async function RecipesPage() {
  const member = await getOrCreateCurrentMember();
  const recipes = await listRecipes(member.householdId);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Recettes</h1>
        <Button render={<Link href="/recipes/new" />}>Nouvelle recette</Button>
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
  );
}
