"use client";

import { Fragment, useOptimistic, useTransition } from "react";
import { removeMeal } from "@/features/meal-plan/actions";
import { mealSlotLabels, mealSlots } from "@/features/meal-plan/schema";
import { toDateKey } from "@/features/meal-plan/dates";
import { MealCell } from "@/features/meal-plan/components/meal-cell";
import type { getWeekPlan } from "@/features/meal-plan/queries";

type PlannedMealWithRelations = Awaited<ReturnType<typeof getWeekPlan>>[number];

const dayFormatter = new Intl.DateTimeFormat("fr-FR", {
  weekday: "short",
  day: "numeric",
  month: "short",
});

export function WeekGrid({
  householdId,
  days,
  initialMeals,
  recipeOptions,
  memberOptions,
}: {
  householdId: string;
  days: Date[];
  initialMeals: PlannedMealWithRelations[];
  recipeOptions: { id: string; name: string }[];
  memberOptions: { id: string; displayName: string }[];
}) {
  const [, startTransition] = useTransition();
  const [meals, updateOptimisticMeals] = useOptimistic(
    initialMeals,
    (state, removedId: string) => state.filter((m) => m.id !== removedId),
  );

  function handleRemove(meal: PlannedMealWithRelations) {
    startTransition(async () => {
      updateOptimisticMeals(meal.id);
      await removeMeal(meal.id);
    });
  }

  return (
    <div className="grid grid-cols-[auto_repeat(7,1fr)] gap-2 overflow-x-auto">
      <div />
      {days.map((day) => (
        <div key={toDateKey(day)} className="text-center text-sm font-medium">
          {dayFormatter.format(day)}
        </div>
      ))}

      {mealSlots.map((slot) => (
        <Fragment key={slot}>
          <div className="text-muted-foreground flex items-center text-sm">
            {mealSlotLabels[slot]}
          </div>
          {days.map((day) => {
            const dateKey = toDateKey(day);
            const meal = meals.find(
              (m) => toDateKey(m.date) === dateKey && m.mealSlot === slot,
            );
            return (
              <MealCell
                key={`${dateKey}-${slot}`}
                meal={meal}
                householdId={householdId}
                dateKey={dateKey}
                mealSlot={slot}
                recipeOptions={recipeOptions}
                memberOptions={memberOptions}
                onRemove={handleRemove}
              />
            );
          })}
        </Fragment>
      ))}
    </div>
  );
}
