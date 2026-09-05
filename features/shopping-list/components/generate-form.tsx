"use client";

import { useActionState } from "react";
import {
  generateShoppingList,
  type ShoppingListActionState,
} from "@/features/shopping-list/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initialState: ShoppingListActionState = { error: null };

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

export function GenerateForm({ householdId }: { householdId: string }) {
  const action = generateShoppingList.bind(null, householdId);
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="grid gap-4 sm:grid-cols-3">
      <div className="flex flex-col gap-2">
        <Label htmlFor="name">Nom de la liste</Label>
        <Input
          id="name"
          name="name"
          defaultValue="Courses de la semaine"
          required
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="startDate">Du</Label>
        <Input
          id="startDate"
          name="startDate"
          type="date"
          defaultValue={todayKey()}
          required
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="endDate">Au</Label>
        <Input id="endDate" name="endDate" type="date" required />
      </div>

      {state.error && (
        <p className="text-destructive text-sm sm:col-span-3">{state.error}</p>
      )}

      <Button type="submit" disabled={pending} className="sm:col-span-3">
        {pending ? "Génération..." : "Générer la liste"}
      </Button>
    </form>
  );
}
