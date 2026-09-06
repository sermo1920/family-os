"use client";

import { useActionState } from "react";
import {
  createShoppingList,
  type ShoppingListActionState,
} from "@/features/shopping-list/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initialState: ShoppingListActionState = { error: null };

export function CreateListForm({ householdId }: { householdId: string }) {
  const action = createShoppingList.bind(null, householdId);
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex items-end gap-4">
        <div className="flex flex-1 flex-col gap-2">
          <Label htmlFor="name">Nom de la liste</Label>
          <Input id="name" name="name" defaultValue="Courses" required />
        </div>
        <Button type="submit" disabled={pending}>
          {pending ? "Création..." : "Créer la liste"}
        </Button>
      </div>

      {state.error && <p className="text-destructive text-sm">{state.error}</p>}
    </form>
  );
}
