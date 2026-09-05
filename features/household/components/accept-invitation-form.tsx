"use client";

import { useActionState } from "react";
import {
  acceptInvitation,
  type AcceptInvitationState,
} from "@/features/household/invitation-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initialState: AcceptInvitationState = { error: null };

export function AcceptInvitationForm({ token }: { token: string }) {
  const action = acceptInvitation.bind(null, token);
  const [state, formAction, pending] = useActionState(action, initialState);

  if (state.success) {
    return (
      <p className="text-muted-foreground text-sm">
        Vérifie ta boîte mail : on t&apos;a envoyé un lien de confirmation.
        Clique dessus pour activer ton compte, puis reviens te connecter.
      </p>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="email">E-mail</Label>
        <Input id="email" name="email" type="email" required />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="password">Mot de passe</Label>
        <Input
          id="password"
          name="password"
          type="password"
          minLength={8}
          required
        />
      </div>
      {state.error && <p className="text-destructive text-sm">{state.error}</p>}
      <Button type="submit" disabled={pending}>
        {pending ? "Création..." : "Créer mon compte et rejoindre"}
      </Button>
    </form>
  );
}
