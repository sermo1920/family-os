"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import {
  addManualItem,
  type ShoppingListActionState,
} from "@/features/shopping-list/actions";
import { categoryLabels, unitLabels } from "@/features/ingredients/schema";
import type { KnownShoppingItem } from "@/features/shopping-list/queries";
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
const DATALIST_ID = "known-shopping-items";

export function AddManualItemForm({
  shoppingListId,
  knownItems,
}: {
  shoppingListId: string;
  knownItems: KnownShoppingItem[];
}) {
  const action = addManualItem.bind(null, shoppingListId);
  const [state, formAction, pending] = useActionState(action, initialState);

  const [name, setName] = useState("");
  const [category, setCategory] = useState("OTHER");
  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState("GRAM");

  const wasPending = useRef(false);
  useEffect(() => {
    if (wasPending.current && !pending && !state.error) {
      setName("");
      setCategory("OTHER");
      setQuantity("");
      setUnit("GRAM");
    }
    wasPending.current = pending;
  }, [pending, state.error]);

  function handleNameChange(value: string) {
    setName(value);
    const known = knownItems.find(
      (item) => item.name.trim().toLowerCase() === value.trim().toLowerCase(),
    );
    if (known) {
      setCategory(known.category);
      setQuantity(String(known.quantity));
      setUnit(known.unit);
    }
  }

  return (
    <form action={formAction} className="grid gap-2 sm:grid-cols-5">
      <Input
        name="name"
        placeholder="Article"
        list={DATALIST_ID}
        value={name}
        onChange={(e) => handleNameChange(e.target.value)}
        className="sm:col-span-2"
        required
      />
      <datalist id={DATALIST_ID}>
        {knownItems.map((item) => (
          <option key={item.name} value={item.name} />
        ))}
      </datalist>

      <Select
        name="category"
        value={category}
        onValueChange={(value) => setCategory(value as string)}
        items={categoryLabels}
      >
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
        value={quantity}
        onChange={(e) => setQuantity(e.target.value)}
        required
      />
      <Select
        name="unit"
        value={unit}
        onValueChange={(value) => setUnit(value as string)}
        items={unitLabels}
      >
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
