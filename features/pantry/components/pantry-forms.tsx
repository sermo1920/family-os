"use client";

import { useActionState, useEffect, useRef } from "react";
import {
  removePantryAction,
  setPantryAction,
  type PantryActionState,
} from "@/features/pantry/actions";
import { categoryLabels, unitLabels } from "@/features/ingredients/schema";
import { ConfirmDeleteButton } from "@/components/confirm-delete-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const initialState: PantryActionState = { error: null, saved: false };

export function SetPantryForm({ householdId }: { householdId: string }) {
  const [state, formAction, pending] = useActionState(
    setPantryAction.bind(null, householdId),
    initialState,
  );
  const formRef = useRef<HTMLFormElement>(null);
  const wasPending = useRef(false);
  useEffect(() => {
    if (wasPending.current && !pending && state.saved) formRef.current?.reset();
    wasPending.current = pending;
  }, [pending, state.saved]);

  return (
    <form
      ref={formRef}
      action={formAction}
      className="grid gap-2 sm:grid-cols-4"
    >
      <Input
        name="name"
        placeholder="Ingrédient"
        required
        className="sm:col-span-2"
      />
      <Input
        name="quantity"
        type="number"
        min={0}
        step="0.1"
        placeholder="Quantité (optionnel)"
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
      <Select name="category" defaultValue="OTHER" items={categoryLabels}>
        <SelectTrigger className="sm:col-span-2">
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
      <Button type="submit" disabled={pending} className="sm:col-span-2">
        {pending ? "Enregistrement..." : "Mettre à jour le stock"}
      </Button>
      <p className="text-muted-foreground text-xs sm:col-span-4">
        Sans quantité, l&apos;ingrédient est noté « présent, quantité inconnue »
        et n&apos;est jamais déduit des courses. Pour un ingrédient déjà au
        catalogue, son unité est conservée. La catégorie ne sert qu&apos;à un
        nouvel ingrédient.
      </p>
      {state.error && (
        <p className="text-destructive text-sm sm:col-span-4">{state.error}</p>
      )}
      {state.saved && !pending && (
        <p
          className="text-sm text-green-700 sm:col-span-4 dark:text-green-400"
          role="status"
        >
          Stock enregistré.
        </p>
      )}
    </form>
  );
}

export function RemovePantryButton({ id, name }: { id: string; name: string }) {
  return (
    <ConfirmDeleteButton
      itemLabel={`${name} du stock`}
      ariaLabel={`Retirer ${name} du stock`}
      onConfirm={() => removePantryAction(id)}
    />
  );
}
