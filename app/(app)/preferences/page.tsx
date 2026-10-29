import { getOrCreateCurrentMember } from "@/lib/auth";
import { listPreferences } from "@/features/preferences/service";
import { listPantry } from "@/features/pantry/service";
import { shortUnitLabels } from "@/features/ingredients/schema";
import {
  AddPreferenceForm,
  PreferenceRow,
} from "@/features/preferences/components/preference-forms";
import {
  RemovePantryButton,
  SetPantryForm,
} from "@/features/pantry/components/pantry-forms";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function PreferencesPage() {
  const member = await getOrCreateCurrentMember();
  const [preferences, pantry] = await Promise.all([
    listPreferences(member.householdId),
    listPantry(member.householdId),
  ]);

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <h1 className="text-2xl font-semibold">Préférences & stock</h1>

      <Card>
        <CardHeader>
          <CardTitle>Préférences du foyer</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <p className="text-muted-foreground text-sm">
            Goûts, exclusions et contraintes que l&apos;agent cuisine respecte à
            chaque proposition. L&apos;assistant n&apos;en ajoute que lorsque tu
            les confirmes ; tu peux les modifier ici.
          </p>
          <ul className="flex flex-col gap-2">
            {preferences.map((preference) => (
              <PreferenceRow key={preference.id} preference={preference} />
            ))}
            {preferences.length === 0 && (
              <li className="text-muted-foreground text-sm">
                Aucune préférence enregistrée.
              </li>
            )}
          </ul>
          <AddPreferenceForm householdId={member.householdId} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Stock</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <p className="text-muted-foreground text-sm">
            Le stock connu est déduit lors de la synchronisation d&apos;une
            liste de courses. Il ne baisse que quand un repas est marqué «
            Préparé » dans le planning, jamais au moment de planifier.
          </p>
          <ul className="flex flex-col gap-2">
            {pantry.map((item) => (
              <li
                key={item.id}
                className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
              >
                <span>
                  {item.ingredient.name} —{" "}
                  <span className="text-muted-foreground">
                    {item.quantity === null
                      ? "quantité inconnue"
                      : `${item.quantity} ${shortUnitLabels[item.ingredient.baseUnit]}`}
                  </span>
                </span>
                <RemovePantryButton id={item.id} name={item.ingredient.name} />
              </li>
            ))}
            {pantry.length === 0 && (
              <li className="text-muted-foreground text-sm">Stock vide.</li>
            )}
          </ul>
          <SetPantryForm householdId={member.householdId} />
        </CardContent>
      </Card>
    </div>
  );
}
