"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteRecipe } from "@/features/recipes/actions";
import { Button } from "@/components/ui/button";

export function DeleteRecipeButton({
  recipeId,
  redirectTo,
}: {
  recipeId: string;
  redirectTo?: string;
}) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          await deleteRecipe(recipeId);
          if (redirectTo) router.push(redirectTo);
        })
      }
    >
      Supprimer
    </Button>
  );
}
