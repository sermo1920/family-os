"use client";

import { deleteIngredient } from "@/features/ingredients/actions";
import { ConfirmDeleteButton } from "@/components/confirm-delete-button";

export function DeleteIngredientButton({
  ingredientId,
  ingredientName,
}: {
  ingredientId: string;
  ingredientName: string;
}) {
  return (
    <ConfirmDeleteButton
      itemLabel={ingredientName}
      onConfirm={() => deleteIngredient(ingredientId)}
    />
  );
}
