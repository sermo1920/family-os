"use client";

import { useActionState, useState } from "react";
import {
  assignMeal,
  type MealPlanActionState,
} from "@/features/meal-plan/actions";
import type { getWeekPlan } from "@/features/meal-plan/queries";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type PlannedMealWithRelations = Awaited<ReturnType<typeof getWeekPlan>>[number];

const initialState: MealPlanActionState = { error: null };

export function MealCell({
  meal,
  householdId,
  dateKey,
  mealSlot,
  recipeOptions,
  memberOptions,
  onRemove,
}: {
  meal: PlannedMealWithRelations | undefined;
  householdId: string;
  dateKey: string;
  mealSlot: string;
  recipeOptions: { id: string; name: string }[];
  memberOptions: { id: string; displayName: string }[];
  onRemove: (meal: PlannedMealWithRelations) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const action = assignMeal.bind(
    null,
    householdId,
    dateKey,
    mealSlot as Parameters<typeof assignMeal>[2],
  );
  const [state, formAction, pending] = useActionState(action, initialState);
  const recipeItems = Object.fromEntries(
    recipeOptions.map((r) => [r.id, r.name]),
  );

  if (!isEditing && meal) {
    return (
      <div className="flex min-h-24 flex-col gap-1 rounded-md border p-2 text-xs">
        <p className="font-medium">{meal.recipe.name}</p>
        {meal.portionMultiplier !== 1 && (
          <p className="text-muted-foreground">×{meal.portionMultiplier}</p>
        )}
        {meal.attendances.length > 0 && (
          <p className="text-muted-foreground">
            {meal.attendances.map((a) => a.member.displayName).join(", ")}
          </p>
        )}
        <div className="mt-auto flex gap-1">
          <Button
            type="button"
            variant="ghost"
            size="xs"
            onClick={() => setIsEditing(true)}
          >
            Modifier
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="xs"
            onClick={() => onRemove(meal)}
          >
            Retirer
          </Button>
        </div>
      </div>
    );
  }

  if (!isEditing) {
    return (
      <button
        type="button"
        onClick={() => setIsEditing(true)}
        className="text-muted-foreground hover:border-foreground/30 hover:text-foreground min-h-24 rounded-md border border-dashed text-xs"
      >
        + Ajouter
      </button>
    );
  }

  return (
    <form
      action={(formData) => {
        formAction(formData);
        setIsEditing(false);
      }}
      className="flex min-h-24 flex-col gap-1.5 rounded-md border p-2 text-xs"
    >
      <Select name="recipeId" defaultValue={meal?.recipeId} items={recipeItems}>
        <SelectTrigger className="h-7 text-xs">
          <SelectValue placeholder="Recette" />
        </SelectTrigger>
        <SelectContent>
          {recipeOptions.map((recipe) => (
            <SelectItem key={recipe.id} value={recipe.id}>
              {recipe.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Input
        name="portionMultiplier"
        type="number"
        min={0.25}
        step="0.25"
        defaultValue={meal?.portionMultiplier ?? 1}
        className="h-7 text-xs"
        aria-label="Multiplicateur de portions"
      />

      <div className="flex flex-col gap-0.5">
        {memberOptions.map((member) => (
          <label key={member.id} className="flex items-center gap-1.5">
            <input
              type="checkbox"
              name="memberId"
              value={member.id}
              defaultChecked={meal?.attendances.some(
                (a) => a.memberId === member.id,
              )}
            />
            {member.displayName}
          </label>
        ))}
      </div>

      {state.error && <p className="text-destructive">{state.error}</p>}

      <div className="mt-auto flex gap-1">
        <Button type="submit" size="xs" disabled={pending}>
          {pending ? "..." : "OK"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="xs"
          onClick={() => setIsEditing(false)}
        >
          Annuler
        </Button>
      </div>
    </form>
  );
}
