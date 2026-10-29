"use client";

import { useActionState, useState, useTransition } from "react";
import {
  assignMeal,
  markPrepared,
  validateMeal,
  type MealPlanActionState,
} from "@/features/meal-plan/actions";
import { mealSlotLabels } from "@/features/meal-plan/schema";
import { servingsFromMultiplier } from "@/features/recipes/scaling";
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
  const [actionPending, startAction] = useTransition();
  const [confirmPrepared, setConfirmPrepared] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const recipeItems = Object.fromEntries(
    recipeOptions.map((r) => [r.id, r.name]),
  );

  if (!isEditing && meal) {
    const isProposed = meal.status === "PROPOSED";
    const servings = servingsFromMultiplier(
      meal.recipe.servings,
      meal.portionMultiplier,
    );
    return (
      <div
        className={`flex min-h-24 flex-col gap-1 rounded-md border p-2 text-xs ${
          isProposed
            ? "border-dashed border-amber-500 bg-amber-50/50 dark:bg-amber-950/20"
            : ""
        }`}
      >
        <div className="flex flex-wrap gap-1">
          {isProposed && (
            <span className="rounded bg-amber-100 px-1 text-[10px] font-medium text-amber-800 dark:bg-amber-900 dark:text-amber-100">
              Proposé
            </span>
          )}
          {meal.leftoverOfId && (
            <span
              className="bg-muted rounded px-1 text-[10px] font-medium"
              title={
                meal.leftoverOf
                  ? `Restes du ${mealSlotLabels[meal.leftoverOf.mealSlot].toLowerCase()} du ${meal.leftoverOf.date.toISOString().slice(0, 10)}`
                  : undefined
              }
            >
              Restes
            </span>
          )}
          {meal.preparedAt && (
            <span className="rounded bg-green-100 px-1 text-[10px] font-medium text-green-800 dark:bg-green-900 dark:text-green-100">
              Préparé
            </span>
          )}
        </div>
        <p className="font-medium">{meal.recipe.name}</p>
        <p className="text-muted-foreground">
          {servings} portion{servings > 1 ? "s" : ""}
        </p>
        {meal.notes && (
          <p className="text-muted-foreground italic">{meal.notes}</p>
        )}
        {meal.attendances.length > 0 && (
          <p className="text-muted-foreground">
            {meal.attendances.map((a) => a.member.displayName).join(", ")}
          </p>
        )}
        {feedback && (
          <p className="text-green-700 dark:text-green-400">{feedback}</p>
        )}
        <div className="mt-auto flex flex-wrap gap-1">
          {isProposed && (
            <Button
              type="button"
              size="xs"
              disabled={actionPending}
              onClick={() =>
                startAction(async () => {
                  await validateMeal(meal.id);
                })
              }
            >
              Valider
            </Button>
          )}
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
          {!meal.preparedAt && !isProposed && (
            <Button
              type="button"
              variant={confirmPrepared ? "secondary" : "ghost"}
              size="xs"
              disabled={actionPending}
              title="Décompte du stock les ingrédients utilisés"
              onClick={() => {
                if (!confirmPrepared) {
                  setConfirmPrepared(true);
                  return;
                }
                startAction(async () => {
                  const result = await markPrepared(meal.id);
                  setConfirmPrepared(false);
                  setFeedback(result.error ?? result.message);
                });
              }}
            >
              {confirmPrepared ? "Confirmer : préparé ?" : "Préparé"}
            </Button>
          )}
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
