"use client";

import { useActionState } from "react";
import {
  recalculateGoal,
  saveManualGoal,
  type GoalActionState,
} from "@/features/nutrition-goals/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const initialState: GoalActionState = { error: null };

export interface CurrentGoal {
  bmr: number;
  tdee: number;
  calorieTarget: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  isManualOverride: boolean;
  notes: string | null;
}

function RecalculateForm({ memberId }: { memberId: string }) {
  const action = recalculateGoal.bind(null, memberId);
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-2">
      <Button type="submit" disabled={pending} variant="outline">
        {pending ? "Calcul..." : "Recalculer depuis le profil"}
      </Button>
      {state.error && <p className="text-destructive text-sm">{state.error}</p>}
    </form>
  );
}

function ManualGoalForm({
  memberId,
  current,
}: {
  memberId: string;
  current: CurrentGoal | null;
}) {
  const action = saveManualGoal.bind(null, memberId);
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="grid gap-4 sm:grid-cols-2">
      <div className="flex flex-col gap-2">
        <Label htmlFor="calorieTarget">Calories cibles (kcal)</Label>
        <Input
          id="calorieTarget"
          name="calorieTarget"
          type="number"
          min={0}
          defaultValue={current?.calorieTarget}
          required
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="proteinG">Protéines (g)</Label>
        <Input
          id="proteinG"
          name="proteinG"
          type="number"
          min={0}
          defaultValue={current?.proteinG}
          required
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="carbsG">Glucides (g)</Label>
        <Input
          id="carbsG"
          name="carbsG"
          type="number"
          min={0}
          defaultValue={current?.carbsG}
          required
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="fatG">Lipides (g)</Label>
        <Input
          id="fatG"
          name="fatG"
          type="number"
          min={0}
          defaultValue={current?.fatG}
          required
        />
      </div>
      <div className="flex flex-col gap-2 sm:col-span-2">
        <Label htmlFor="notes">Notes (optionnel)</Label>
        <Input
          id="notes"
          name="notes"
          defaultValue={current?.notes ?? undefined}
        />
      </div>
      {state.error && (
        <p className="text-destructive text-sm sm:col-span-2">{state.error}</p>
      )}
      <Button type="submit" disabled={pending} className="sm:col-span-2">
        {pending ? "Enregistrement..." : "Enregistrer cette cible manuelle"}
      </Button>
    </form>
  );
}

export function GoalPanel({
  memberId,
  current,
}: {
  memberId: string;
  current: CurrentGoal | null;
}) {
  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Objectif nutritionnel</CardTitle>
          <CardDescription>
            {current
              ? current.isManualOverride
                ? "Cible saisie manuellement."
                : "Calculée automatiquement à partir du profil (métabolisme de base × niveau d'activité)."
              : "Aucun objectif calculé pour le moment."}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {current && (
            <dl className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-3">
              <div>
                <dt className="text-muted-foreground">Métabolisme de base</dt>
                <dd className="font-medium">{Math.round(current.bmr)} kcal</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Dépense totale</dt>
                <dd className="font-medium">{Math.round(current.tdee)} kcal</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Cible calorique</dt>
                <dd className="font-medium">{current.calorieTarget} kcal</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Protéines</dt>
                <dd className="font-medium">{current.proteinG} g</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Glucides</dt>
                <dd className="font-medium">{current.carbsG} g</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Lipides</dt>
                <dd className="font-medium">{current.fatG} g</dd>
              </div>
            </dl>
          )}
          <RecalculateForm memberId={memberId} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Ajuster manuellement</CardTitle>
          <CardDescription>
            Remplace la valeur calculée par des chiffres choisis à la main (ex:
            conseil d&apos;un professionnel de santé).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ManualGoalForm memberId={memberId} current={current} />
        </CardContent>
      </Card>
    </div>
  );
}
