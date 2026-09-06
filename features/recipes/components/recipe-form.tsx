"use client";

import { useActionState, useEffect, useId, useRef, useState } from "react";
import {
  createRecipe,
  updateRecipe,
  type RecipeActionState,
} from "@/features/recipes/actions";
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

const initialState: RecipeActionState = { error: null };

export interface IngredientOption {
  id: string;
  name: string;
}

export interface RecipeFormValues {
  id: string;
  name: string;
  servings: number;
  instructions: string | null;
  ingredients: { ingredientId: string; quantity: number }[];
}

export function RecipeForm({
  householdId,
  ingredientOptions,
  recipe,
  onSuccess,
}: {
  householdId: string;
  ingredientOptions: IngredientOption[];
  recipe?: RecipeFormValues;
  onSuccess?: () => void;
}) {
  const action = recipe
    ? updateRecipe.bind(null, recipe.id)
    : createRecipe.bind(null, householdId);
  const [state, formAction, pending] = useActionState(action, initialState);

  const wasPending = useRef(false);
  useEffect(() => {
    if (wasPending.current && !pending && !state.error) {
      onSuccess?.();
    }
    wasPending.current = pending;
  }, [pending, state.error, onSuccess]);

  const rowIdPrefix = useId();
  const [rowKeys, setRowKeys] = useState<string[]>(() =>
    recipe && recipe.ingredients.length > 0
      ? recipe.ingredients.map((_, index) => `${rowIdPrefix}-${index}`)
      : [`${rowIdPrefix}-0`],
  );

  const ingredientItems = Object.fromEntries(
    ingredientOptions.map((option) => [option.id, option.name]),
  );

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="name">Nom de la recette</Label>
        <Input id="name" name="name" defaultValue={recipe?.name} required />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="servings">Portions</Label>
        <Input
          id="servings"
          name="servings"
          type="number"
          min={1}
          defaultValue={recipe?.servings ?? 4}
          required
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="instructions">Instructions (optionnel)</Label>
        <textarea
          id="instructions"
          name="instructions"
          rows={4}
          defaultValue={recipe?.instructions ?? undefined}
          className="border-input rounded-lg border bg-transparent px-2.5 py-1.5 text-sm"
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label>Ingrédients</Label>
        {ingredientOptions.length === 0 && (
          <p className="text-muted-foreground text-sm">
            Ajoute d&apos;abord des ingrédients avant de créer une recette.
          </p>
        )}
        {rowKeys.map((key, index) => (
          <div key={key} className="flex items-center gap-2">
            <Select
              name="ingredientId"
              items={ingredientItems}
              defaultValue={recipe?.ingredients[index]?.ingredientId}
            >
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Choisir un ingrédient" />
              </SelectTrigger>
              <SelectContent>
                {ingredientOptions.map((option) => (
                  <SelectItem key={option.id} value={option.id}>
                    {option.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              name="quantity"
              type="number"
              min={0}
              step="0.1"
              placeholder="Quantité"
              className="w-28"
              defaultValue={recipe?.ingredients[index]?.quantity}
              required
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={rowKeys.length === 1}
              onClick={() =>
                setRowKeys((keys) => keys.filter((_, i) => i !== index))
              }
            >
              Retirer
            </Button>
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() =>
            setRowKeys((keys) => [...keys, `${rowIdPrefix}-${keys.length}`])
          }
        >
          Ajouter un ingrédient
        </Button>
      </div>

      {state.error && <p className="text-destructive text-sm">{state.error}</p>}

      <Button type="submit" disabled={pending}>
        {pending
          ? "Enregistrement..."
          : recipe
            ? "Enregistrer"
            : "Créer la recette"}
      </Button>
    </form>
  );
}
