"use client";

import { useActionState, useState } from "react";
import { RefreshCwIcon } from "lucide-react";
import {
  syncShoppingListAction,
  type SyncActionState,
  type SyncPreview,
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

const initialState: SyncActionState = { error: null, preview: null };

function PreviewSection({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <div>
      <p className="font-medium">{title}</p>
      <ul className="text-muted-foreground list-disc pl-5">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

function PreviewDetails({ preview }: { preview: SyncPreview }) {
  const nothing =
    preview.create.length === 0 &&
    preview.update.length === 0 &&
    preview.remove.length === 0;
  return (
    <div className="flex flex-col gap-2 rounded-md border px-3 py-2 text-sm">
      <p>
        {preview.countedMeals} repas validé{preview.countedMeals > 1 ? "s" : ""}{" "}
        pris en compte
        {preview.proposedMealsSkipped > 0 &&
          ` (${preview.proposedMealsSkipped} repas encore proposé${preview.proposedMealsSkipped > 1 ? "s" : ""} ignoré${preview.proposedMealsSkipped > 1 ? "s" : ""})`}
        .
      </p>
      {nothing ? (
        <p className="text-muted-foreground">
          La liste est déjà à jour : aucun changement.
        </p>
      ) : (
        <>
          <PreviewSection title="À ajouter" items={preview.create} />
          <PreviewSection title="Quantités ajustées" items={preview.update} />
          <PreviewSection
            title="À retirer (plus dans le menu)"
            items={preview.remove}
          />
        </>
      )}
      <p className="text-muted-foreground text-xs">
        Conservés tels quels : {preview.keptManualCount} article(s) ajouté(s) à
        la main, {preview.keptCheckedCount} article(s) déjà coché(s).
      </p>
      {preview.stockUsed.length > 0 && (
        <p className="text-muted-foreground text-xs">
          Stock déduit : {preview.stockUsed.join(", ")}.
        </p>
      )}
      {preview.stockUnknown.length > 0 && (
        <p className="text-muted-foreground text-xs">
          En stock mais quantité inconnue (non déduit) :{" "}
          {preview.stockUnknown.join(", ")}.
        </p>
      )}
      {preview.possibleManualDuplicates.length > 0 && (
        <p className="text-xs text-amber-700 dark:text-amber-400">
          Déjà présent en article manuel, à vérifier :{" "}
          {preview.possibleManualDuplicates.join(", ")}.
        </p>
      )}
    </div>
  );
}

export function SyncWithMenuDialog({
  shoppingListId,
  defaultStart,
  defaultEnd,
}: {
  shoppingListId: string;
  defaultStart: string;
  defaultEnd: string;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(
    syncShoppingListAction.bind(null, shoppingListId),
    initialState,
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button type="button" variant="outline" />}>
        <RefreshCwIcon />
        Synchroniser avec le menu
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Synchroniser avec le menu</DialogTitle>
          <DialogDescription>
            Calcule les ingrédients des repas validés de la période (stock connu
            déduit). Les articles ajoutés à la main et ceux déjà cochés ne sont
            jamais modifiés ; relancer ne crée pas de doublon.
          </DialogDescription>
        </DialogHeader>
        <form action={formAction} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="startDate">Du</Label>
              <Input
                id="startDate"
                name="startDate"
                type="date"
                defaultValue={defaultStart}
                required
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="endDate">Au</Label>
              <Input
                id="endDate"
                name="endDate"
                type="date"
                defaultValue={defaultEnd}
                required
              />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="includeProposed" />
            Inclure aussi les repas encore proposés (non validés)
          </label>

          {state.error && (
            <p className="text-destructive text-sm" role="alert">
              {state.error}
            </p>
          )}
          {state.preview && <PreviewDetails preview={state.preview} />}
          {state.preview?.applied && !pending && (
            <p
              className="text-sm text-green-700 dark:text-green-400"
              role="status"
            >
              Liste mise à jour et enregistrée.
            </p>
          )}

          <div className="flex flex-wrap gap-2">
            <Button
              type="submit"
              name="intent"
              value="preview"
              variant="outline"
              disabled={pending}
            >
              {pending ? "Calcul..." : "Voir les changements"}
            </Button>
            <Button
              type="submit"
              name="intent"
              value="apply"
              disabled={pending}
            >
              {pending ? "Enregistrement..." : "Appliquer"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
