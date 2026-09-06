"use client";

import { useActionState } from "react";
import {
  updateMemberProfile,
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
import { colorLabels, colorDotClass } from "@/features/household/colors";
import type {
  ActivityLevel,
  MemberColor,
  Sex,
} from "@/lib/generated/prisma/client";

const initialState: AddMemberActionState = { error: null };

const activityLevels: { value: ActivityLevel; label: string }[] = [
  { value: "SEDENTARY", label: "Sédentaire (peu ou pas d'exercice)" },
  { value: "LIGHT", label: "Légèrement actif (1-3 j/semaine)" },
  { value: "MODERATE", label: "Modérément actif (3-5 j/semaine)" },
  { value: "ACTIVE", label: "Actif (6-7 j/semaine)" },
  { value: "VERY_ACTIVE", label: "Très actif (sport intense quotidien)" },
];

// Base UI n'affiche le libellé choisi dans le déclencheur (au lieu de la
// valeur brute "MALE"/"MODERATE") que si on lui passe cette table value->libellé.
const sexItems = { FEMALE: "Femme", MALE: "Homme" };
const activityLevelItems = Object.fromEntries(
  activityLevels.map((level) => [level.value, level.label]),
);

export function ProfileForm({
  memberId,
  displayName,
  dateOfBirth,
  sex,
  heightCm,
  weightKg,
  activityLevel,
  icsCalendarUrl,
  color,
}: {
  memberId: string;
  displayName: string;
  dateOfBirth: Date | null;
  sex: Sex | null;
  heightCm: number | null;
  weightKg: number | null;
  activityLevel: ActivityLevel | null;
  icsCalendarUrl: string | null;
  color: MemberColor | null;
}) {
  const action = updateMemberProfile.bind(null, memberId);
  const [state, formAction, pending] = useActionState(action, initialState);

  const dateOfBirthValue = dateOfBirth
    ? dateOfBirth.toISOString().slice(0, 10)
    : undefined;

  return (
    <form action={formAction} className="grid gap-4 sm:grid-cols-2">
      <div className="flex flex-col gap-2">
        <Label htmlFor="displayName">Prénom</Label>
        <Input
          id="displayName"
          name="displayName"
          defaultValue={displayName}
          required
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="dateOfBirth">Date de naissance</Label>
        <Input
          id="dateOfBirth"
          name="dateOfBirth"
          type="date"
          defaultValue={dateOfBirthValue}
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="sex">Sexe</Label>
        <Select name="sex" defaultValue={sex ?? undefined} items={sexItems}>
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
        <Input
          id="heightCm"
          name="heightCm"
          type="number"
          min={0}
          step="0.1"
          defaultValue={heightCm ?? undefined}
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="weightKg">Poids (kg)</Label>
        <Input
          id="weightKg"
          name="weightKg"
          type="number"
          min={0}
          step="0.1"
          defaultValue={weightKg ?? undefined}
        />
      </div>

      <div className="flex flex-col gap-2 sm:col-span-2">
        <Label htmlFor="activityLevel">Niveau d&apos;activité</Label>
        <Select
          name="activityLevel"
          defaultValue={activityLevel ?? undefined}
          items={activityLevelItems}
        >
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

      <div className="flex flex-col gap-2 sm:col-span-2">
        <Label htmlFor="color">Couleur</Label>
        <Select
          name="color"
          defaultValue={color ?? undefined}
          items={colorLabels}
        >
          <SelectTrigger id="color">
            <SelectValue placeholder="Non définie" />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(colorLabels).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                <span
                  className={`size-2.5 rounded-full ${colorDotClass(value as MemberColor)}`}
                />
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-muted-foreground text-xs">
          Utilisée pour repérer ses rendez-vous dans l&apos;agenda de la
          semaine, sans avoir à écrire son nom à côté de chacun.
        </p>
      </div>

      <div className="flex flex-col gap-2 sm:col-span-2">
        <Label htmlFor="icsCalendarUrl">Lien calendrier (ICS)</Label>
        <Input
          id="icsCalendarUrl"
          name="icsCalendarUrl"
          type="url"
          placeholder="https://calendar.google.com/calendar/ical/.../basic.ics"
          defaultValue={icsCalendarUrl ?? undefined}
        />
        <p className="text-muted-foreground text-xs">
          Colle ici le lien iCal (adresse secrète Google Calendar, lien ICS
          publié Outlook/Apple...) pour voir ses événements dans le planning de
          la semaine.
        </p>
      </div>

      {state.error && (
        <p className="text-destructive text-sm sm:col-span-2">{state.error}</p>
      )}

      <Button type="submit" disabled={pending} className="sm:col-span-2">
        {pending ? "Enregistrement..." : "Enregistrer le profil"}
      </Button>
    </form>
  );
}
