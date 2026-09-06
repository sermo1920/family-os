"use client";

import { useActionState, useEffect, useRef } from "react";
import {
  createIngredient,
  type IngredientActionState,
} from "@/features/ingredients/actions";
import { categoryLabels, unitLabels } from "@/features/ingredients/schema";
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

export function IngredientForm({
  householdId,
  onSuccess,
}: {
  householdId: string;
  onSuccess?: () => void;
}) {
  const action = createIngredient.bind(null, householdId);
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
        <Input id="name" name="name" required />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="category">Catégorie</Label>
        <Select name="category" defaultValue="OTHER" items={categoryLabels}>
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
        <Select name="baseUnit" defaultValue="GRAM" items={unitLabels}>
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
          required
        />
      </div>

      {state.error && (
        <p className="text-destructive text-sm sm:col-span-2">{state.error}</p>
      )}

      <Button type="submit" disabled={pending} className="sm:col-span-2">
        {pending ? "Ajout..." : "Ajouter l'ingrédient"}
      </Button>
    </form>
  );
}
