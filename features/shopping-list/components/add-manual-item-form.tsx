"use client";

import { useActionState } from "react";
import {
  addManualItem,
  type ShoppingListActionState,
} from "@/features/shopping-list/actions";
import { categoryLabels, unitLabels } from "@/features/ingredients/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const initialState: ShoppingListActionState = { error: null };

export function AddManualItemForm({
  shoppingListId,
}: {
  shoppingListId: string;
}) {
  const action = addManualItem.bind(null, shoppingListId);
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="grid gap-2 sm:grid-cols-5">
      <Input
        name="name"
        placeholder="Article"
        className="sm:col-span-2"
        required
      />
      <Select name="category" defaultValue="OTHER" items={categoryLabels}>
        <SelectTrigger>
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
      <Input
        name="quantity"
        type="number"
        min={0}
        step="0.1"
        placeholder="Quantité"
        required
      />
      <Select name="unit" defaultValue="GRAM" items={unitLabels}>
        <SelectTrigger>
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

      {state.error && (
        <p className="text-destructive text-sm sm:col-span-5">{state.error}</p>
      )}

      <Button type="submit" disabled={pending} className="sm:col-span-5">
        {pending ? "Ajout..." : "Ajouter l'article"}
      </Button>
    </form>
  );
}
