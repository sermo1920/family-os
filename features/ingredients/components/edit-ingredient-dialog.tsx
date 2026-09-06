"use client";

import { useState } from "react";
import {
  IngredientForm,
  type IngredientFormValues,
} from "@/features/ingredients/components/ingredient-form";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function EditIngredientDialog({
  householdId,
  ingredient,
}: {
  householdId: string;
  ingredient: IngredientFormValues;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={<Button type="button" variant="ghost" size="sm" />}
      >
        Modifier
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Modifier {ingredient.name}</DialogTitle>
        </DialogHeader>
        <IngredientForm
          householdId={householdId}
          ingredient={ingredient}
          onSuccess={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
