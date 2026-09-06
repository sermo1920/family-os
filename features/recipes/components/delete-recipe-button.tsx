"use client";

import { deleteRecipe } from "@/features/recipes/actions";
import { ConfirmDeleteButton } from "@/components/confirm-delete-button";

export function DeleteRecipeButton({
  recipeId,
  recipeName,
}: {
  recipeId: string;
  recipeName: string;
}) {
  return (
    <ConfirmDeleteButton
      itemLabel={recipeName}
      onConfirm={() => deleteRecipe(recipeId)}
    />
  );
}
