"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { PencilIcon } from "lucide-react";
import {
  addPreferenceAction,
  deletePreferenceAction,
  updatePreferenceAction,
  type PreferenceActionState,
} from "@/features/preferences/actions";
import {
  preferenceKindLabels,
  type PreferenceKindValue,
} from "@/features/preferences/schema";
import { ConfirmDeleteButton } from "@/components/confirm-delete-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const initialState: PreferenceActionState = { error: null, saved: false };

function KindSelect({ defaultValue }: { defaultValue?: PreferenceKindValue }) {
  return (
    <Select
      name="kind"
      defaultValue={defaultValue ?? "LIKE"}
      items={preferenceKindLabels}
    >
      <SelectTrigger className="sm:w-56">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {Object.entries(preferenceKindLabels).map(([value, label]) => (
          <SelectItem key={value} value={value}>
            {label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function AddPreferenceForm({ householdId }: { householdId: string }) {
  const [state, formAction, pending] = useActionState(
    addPreferenceAction.bind(null, householdId),
    initialState,
  );
  const formRef = useRef<HTMLFormElement>(null);
  const wasPending = useRef(false);
  useEffect(() => {
    if (wasPending.current && !pending && state.saved) formRef.current?.reset();
    wasPending.current = pending;
  }, [pending, state.saved]);

  return (
    <form
      ref={formRef}
      action={formAction}
      className="flex flex-col gap-2 sm:flex-row"
    >
      <KindSelect />
      <Input
        name="text"
        placeholder="ex : pas de porc, Julie n'aime pas les champignons"
        maxLength={300}
        required
        className="flex-1"
      />
      <Button type="submit" disabled={pending}>
        {pending ? "Ajout..." : "Ajouter"}
      </Button>
      {state.error && <p className="text-destructive text-sm">{state.error}</p>}
    </form>
  );
}

export function PreferenceRow({
  preference,
}: {
  preference: { id: string; kind: PreferenceKindValue; text: string };
}) {
  const [editing, setEditing] = useState(false);
  const [state, formAction, pending] = useActionState(
    updatePreferenceAction.bind(null, preference.id),
    initialState,
  );
  const wasPending = useRef(false);
  useEffect(() => {
    if (wasPending.current && !pending && state.saved) setEditing(false);
    wasPending.current = pending;
  }, [pending, state.saved]);

  if (editing) {
    return (
      <li className="rounded-md border px-3 py-2">
        <form action={formAction} className="flex flex-col gap-2 sm:flex-row">
          <KindSelect defaultValue={preference.kind} />
          <Input
            name="text"
            defaultValue={preference.text}
            maxLength={300}
            required
            className="flex-1"
          />
          <div className="flex gap-1">
            <Button type="submit" size="sm" disabled={pending}>
              {pending ? "..." : "Enregistrer"}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => setEditing(false)}
            >
              Annuler
            </Button>
          </div>
        </form>
        {state.error && (
          <p className="text-destructive mt-1 text-sm">{state.error}</p>
        )}
      </li>
    );
  }

  return (
    <li className="flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm">
      <span>
        <span className="text-muted-foreground mr-2 text-xs">
          {preferenceKindLabels[preference.kind]}
        </span>
        {preference.text}
      </span>
      <span className="flex items-center gap-1">
        <button
          type="button"
          aria-label={`Modifier « ${preference.text} »`}
          onClick={() => setEditing(true)}
          className="text-muted-foreground hover:border-foreground/40 hover:text-foreground flex size-6 shrink-0 items-center justify-center rounded-full border"
        >
          <PencilIcon className="size-3.5" />
        </button>
        <ConfirmDeleteButton
          itemLabel="cette préférence"
          ariaLabel={`Supprimer « ${preference.text} »`}
          description={preference.text}
          onConfirm={() => deletePreferenceAction(preference.id)}
        />
      </span>
    </li>
  );
}
