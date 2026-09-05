"use client";

import { useTransition } from "react";
import { deleteIngredient } from "@/features/ingredients/actions";
import { Button } from "@/components/ui/button";

export function DeleteIngredientButton({
  ingredientId,
}: {
  ingredientId: string;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      disabled={pending}
      onClick={() => startTransition(() => deleteIngredient(ingredientId))}
    >
      Supprimer
    </Button>
  );
}
