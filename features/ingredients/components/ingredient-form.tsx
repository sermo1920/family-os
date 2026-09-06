"use client";

import { useActionState, useEffect, useRef } from "react";
import {
  createIngredient,
  updateIngredient,
  type IngredientActionState,
} from "@/features/ingredients/actions";
import {
  categoryLabels,
  unitLabels,
  type IngredientInput,
} from "@/features/ingredients/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const initialState: IngredientActionState = { error: null };

export interface IngredientFormValues extends IngredientInput {
  id: string;
}

export function IngredientForm({
  householdId,
  ingredient,
  onSuccess,
}: {
  householdId: string;
  ingredient?: IngredientFormValues;
  onSuccess?: () => void;
}) {
  const action = ingredient
    ? updateIngredient.bind(null, ingredient.id)
    : createIngredient.bind(null, householdId);
  const [state, formAction, pending] = useActionState(action, initialState);

  const wasPending = useRef(false);
  useEffect(() => {
    if (wasPending.current && !pending && !state.error) {
      onSuccess?.();
    }
    wasPending.current = pending;
  }, [pending, state.error, onSuccess]);

  return (
    <form action={formAction} className="grid gap-4 sm:grid-cols-2">
      <div className="flex flex-col gap-2 sm:col-span-2">
        <Label htmlFor="name">Nom</Label>
        <Input id="name" name="name" defaultValue={ingredient?.name} required />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="category">Catégorie</Label>
        <Select
          name="category"
          defaultValue={ingredient?.category ?? "OTHER"}
          items={categoryLabels}
        >
          <SelectTrigger id="category">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(categoryLabels).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="baseUnit">Unité</Label>
        <Select
          name="baseUnit"
          defaultValue={ingredient?.baseUnit ?? "GRAM"}
          items={unitLabels}
        >
          <SelectTrigger id="baseUnit">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(unitLabels).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="caloriesPer100">Calories / 100</Label>
        <Input
          id="caloriesPer100"
          name="caloriesPer100"
          type="number"
          min={0}
          step="0.1"
          defaultValue={ingredient?.caloriesPer100}
          required
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="proteinPer100">Protéines / 100 (g)</Label>
        <Input
          id="proteinPer100"
          name="proteinPer100"
          type="number"
          min={0}
          step="0.1"
          defaultValue={ingredient?.proteinPer100}
          required
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="carbsPer100">Glucides / 100 (g)</Label>
        <Input
          id="carbsPer100"
          name="carbsPer100"
          type="number"
          min={0}
          step="0.1"
          defaultValue={ingredient?.carbsPer100}
          required
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="fatPer100">Lipides / 100 (g)</Label>
        <Input
          id="fatPer100"
          name="fatPer100"
          type="number"
          min={0}
          step="0.1"
          defaultValue={ingredient?.fatPer100}
          required
        />
      </div>

      {state.error && (
        <p className="text-destructive text-sm sm:col-span-2">{state.error}</p>
      )}

      <Button type="submit" disabled={pending} className="sm:col-span-2">
        {pending
          ? "Enregistrement..."
          : ingredient
            ? "Enregistrer"
            : "Ajouter l'ingrédient"}
      </Button>
    </form>
  );
}
