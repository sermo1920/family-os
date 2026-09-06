"use client";

import { useRouter } from "next/navigation";
import { deleteRecipe } from "@/features/recipes/actions";
import { ConfirmDeleteButton } from "@/components/confirm-delete-button";

export function DeleteRecipeButton({
  recipeId,
  recipeName,
  redirectTo,
}: {
  recipeId: string;
  recipeName: string;
  redirectTo?: string;
}) {
  const router = useRouter();

  return (
    <ConfirmDeleteButton
      itemLabel={recipeName}
      onConfirm={() => deleteRecipe(recipeId)}
      onSuccess={() => {
        if (redirectTo) router.push(redirectTo);
      }}
    />
  );
}
