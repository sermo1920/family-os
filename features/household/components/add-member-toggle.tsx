"use client";

import { useState } from "react";
import { AddMemberForm } from "@/features/household/components/add-member-form";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function AddMemberToggle({ householdId }: { householdId: string }) {
  const [isOpen, setIsOpen] = useState(false);

  if (!isOpen) {
    return (
      <Button type="button" variant="outline" onClick={() => setIsOpen(true)}>
        + Ajouter un membre
      </Button>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Ajouter un membre</CardTitle>
        <CardDescription>
          Pour un enfant ou toute autre personne du foyer qui n&apos;a pas
          besoin de son propre compte.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <AddMemberForm
          householdId={householdId}
          onSuccess={() => setIsOpen(false)}
        />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="mt-2"
          onClick={() => setIsOpen(false)}
        >
          Annuler
        </Button>
      </CardContent>
    </Card>
  );
}
