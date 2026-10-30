"use client";

import { useState, useTransition } from "react";
import { CheckIcon } from "lucide-react";
import { validateWeek } from "@/features/meal-plan/actions";
import { Button } from "@/components/ui/button";

export function ValidateWeekButton({
  householdId,
  weekStartKey,
  proposedCount,
}: {
  householdId: string;
  weekStartKey: string;
  proposedCount: number;
}) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  if (proposedCount === 0) {
    return message ? (
      <p className="text-sm text-green-700 dark:text-green-400" role="status">
        {message}
      </p>
    ) : null;
  }

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-md border border-dashed border-amber-500 bg-amber-50/50 px-3 py-2 text-sm dark:bg-amber-950/20">
      <span>
        {proposedCount} repas proposé{proposedCount > 1 ? "s" : ""} par
        l&apos;assistant, à valider. Seuls les repas validés alimentent la liste
        de courses.
      </span>
      <Button
        size="sm"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const result = await validateWeek(householdId, weekStartKey);
            setMessage(
              `${result.count} repas validé${result.count > 1 ? "s" : ""}.`,
            );
          })
        }
      >
        <CheckIcon />
        {pending ? "Validation..." : "Tout valider pour la semaine"}
      </Button>
    </div>
  );
}
