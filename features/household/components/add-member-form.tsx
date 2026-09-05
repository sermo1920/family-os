"use client";

import { useActionState, useEffect, useRef } from "react";
import {
  addMember,
  type AddMemberActionState,
} from "@/features/household/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const initialState: AddMemberActionState = { error: null };

const activityLevels = [
  { value: "SEDENTARY", label: "Sédentaire (peu ou pas d'exercice)" },
  { value: "LIGHT", label: "Légèrement actif (1-3 j/semaine)" },
  { value: "MODERATE", label: "Modérément actif (3-5 j/semaine)" },
  { value: "ACTIVE", label: "Actif (6-7 j/semaine)" },
  { value: "VERY_ACTIVE", label: "Très actif (sport intense quotidien)" },
];

// Base UI n'affiche le libellé choisi dans le déclencheur (au lieu de la
// valeur brute "MALE"/"ADULT") que si on lui passe cette table value->libellé.
const roleItems = { ADULT: "Adulte", CHILD: "Enfant" };
const sexItems = { FEMALE: "Femme", MALE: "Homme" };
const activityLevelItems = Object.fromEntries(
  activityLevels.map((level) => [level.value, level.label]),
);

export function AddMemberForm({
  householdId,
  onSuccess,
}: {
  householdId: string;
  onSuccess?: () => void;
}) {
  const action = addMember.bind(null, householdId);
  const [state, formAction, pending] = useActionState(action, initialState);
  const submittedRef = useRef(false);

  useEffect(() => {
    if (submittedRef.current && !pending) {
      submittedRef.current = false;
      if (!state.error) onSuccess?.();
    }
  }, [pending, state, onSuccess]);

  function handleAction(formData: FormData) {
    submittedRef.current = true;
    formAction(formData);
  }

  return (
    <form action={handleAction} className="grid gap-4 sm:grid-cols-2">
      <div className="flex flex-col gap-2">
        <Label htmlFor="displayName">Prénom</Label>
        <Input id="displayName" name="displayName" required />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="role">Type de profil</Label>
        <Select name="role" defaultValue="ADULT" items={roleItems}>
          <SelectTrigger id="role">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ADULT">Adulte</SelectItem>
            <SelectItem value="CHILD">Enfant</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="dateOfBirth">Date de naissance</Label>
        <Input id="dateOfBirth" name="dateOfBirth" type="date" />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="sex">Sexe</Label>
        <Select name="sex" items={sexItems}>
          <SelectTrigger id="sex">
            <SelectValue placeholder="Non précisé" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="FEMALE">Femme</SelectItem>
            <SelectItem value="MALE">Homme</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="heightCm">Taille (cm)</Label>
        <Input id="heightCm" name="heightCm" type="number" min={0} step="0.1" />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="weightKg">Poids (kg)</Label>
        <Input id="weightKg" name="weightKg" type="number" min={0} step="0.1" />
      </div>

      <div className="flex flex-col gap-2 sm:col-span-2">
        <Label htmlFor="activityLevel">Niveau d&apos;activité</Label>
        <Select name="activityLevel" items={activityLevelItems}>
          <SelectTrigger id="activityLevel">
            <SelectValue placeholder="Non précisé" />
          </SelectTrigger>
          <SelectContent>
            {activityLevels.map((level) => (
              <SelectItem key={level.value} value={level.value}>
                {level.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {state.error && (
        <p className="text-destructive text-sm sm:col-span-2">{state.error}</p>
      )}

      <Button type="submit" disabled={pending} className="sm:col-span-2">
        {pending ? "Ajout..." : "Ajouter ce membre"}
      </Button>
    </form>
  );
}
