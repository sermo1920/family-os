"use client";

import { useState } from "react";
import { PencilIcon } from "lucide-react";
import {
  RecipeForm,
  type IngredientOption,
  type RecipeFormValues,
} from "@/features/recipes/components/recipe-form";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function EditRecipeDialog({
  householdId,
  recipe,
  ingredientOptions,
}: {
  householdId: string;
  recipe: RecipeFormValues;
  ingredientOptions: IngredientOption[];
}) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <button
            type="button"
            aria-label={`Modifier ${recipe.name}`}
            className="text-muted-foreground hover:border-foreground/40 hover:text-foreground flex size-6 shrink-0 items-center justify-center rounded-full border"
          />
        }
      >
        <PencilIcon className="size-3.5" />
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Modifier {recipe.name}</DialogTitle>
        </DialogHeader>
        <RecipeForm
          householdId={householdId}
          ingredientOptions={ingredientOptions}
          recipe={recipe}
          onSuccess={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
