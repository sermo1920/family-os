"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import {
  importPlannedMeals,
  type ShoppingListActionState,
} from "@/features/shopping-list/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const initialState: ShoppingListActionState = { error: null };

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

export function ImportPlannedMealsDialog({
  shoppingListId,
}: {
  shoppingListId: string;
}) {
  const [open, setOpen] = useState(false);
  const action = importPlannedMeals.bind(null, shoppingListId);
  const [state, formAction, pending] = useActionState(action, initialState);

  const wasPending = useRef(false);
  useEffect(() => {
    if (wasPending.current && !pending && !state.error) {
      setOpen(false);
    }
    wasPending.current = pending;
  }, [pending, state.error]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button type="button" variant="outline" />}>
        Ajouter les repas planifiés
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ajouter les repas planifiés</DialogTitle>
          <DialogDescription>
            Les ingrédients des repas planifiés sur cette période sont ajoutés à
            la liste. Un ingrédient déjà présent voit sa quantité augmentée
            plutôt que dupliquée.
          </DialogDescription>
        </DialogHeader>
        <form action={formAction} className="flex flex-col gap-4">
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
            <p className="text-destructive text-sm">{state.error}</p>
          )}

          <Button type="submit" disabled={pending}>
            {pending ? "Ajout..." : "Ajouter à la liste"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
