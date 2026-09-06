"use client";

import { useState } from "react";
import {
  RecipeForm,
  type IngredientOption,
} from "@/features/recipes/components/recipe-form";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function NewRecipeDialog({
  householdId,
  ingredientOptions,
}: {
  householdId: string;
  ingredientOptions: IngredientOption[];
}) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button type="button" />}>
        Nouvelle recette
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Nouvelle recette</DialogTitle>
        </DialogHeader>
        <RecipeForm
          householdId={householdId}
          ingredientOptions={ingredientOptions}
        />
      </DialogContent>
    </Dialog>
  );
}
