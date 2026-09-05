"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { XIcon } from "lucide-react";
import { ProfileForm } from "@/features/household/components/profile-form";
import { deleteMember } from "@/features/household/actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { ActivityLevel, Sex } from "@/lib/generated/prisma/client";

const roleLabels: Record<string, string> = {
  OWNER: "Propriétaire",
  ADULT: "Adulte",
  CHILD: "Enfant",
};

export function MemberRow({
  member,
}: {
  member: {
    id: string;
    displayName: string;
    email: string | null;
    role: string;
    linkedUserId: string | null;
    dateOfBirth: Date | null;
    sex: Sex | null;
    heightCm: number | null;
    weightKg: number | null;
    activityLevel: ActivityLevel | null;
  };
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deletePending, startDeleteTransition] = useTransition();

  function handleDelete() {
    setDeleteError(null);
    startDeleteTransition(async () => {
      const result = await deleteMember(member.id);
      if (result.error) {
        setDeleteError(result.error);
      } else {
        setDeleteOpen(false);
      }
    });
  }

  if (isEditing) {
    return (
      <li className="rounded-md border p-4">
        <ProfileForm
          memberId={member.id}
          displayName={member.displayName}
          dateOfBirth={member.dateOfBirth}
          sex={member.sex}
          heightCm={member.heightCm}
          weightKg={member.weightKg}
          activityLevel={member.activityLevel}
        />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="mt-2"
          onClick={() => setIsEditing(false)}
        >
          Fermer
        </Button>
      </li>
    );
  }

  return (
    <li className="flex items-center justify-between rounded-md border px-4 py-3">
      <div className="flex flex-col">
        <span>{member.displayName}</span>
        {member.email && (
          <span className="text-muted-foreground text-xs">{member.email}</span>
        )}
      </div>
      <div className="flex items-center gap-4">
        <span className="text-muted-foreground text-sm">
          {roleLabels[member.role]}
        </span>
        <button
          type="button"
          className="text-sm underline"
          onClick={() => setIsEditing(true)}
        >
          Modifier
        </button>
        <Link
          href={`/nutrition-goals/${member.id}`}
          className="text-sm underline"
        >
          Objectifs nutritionnels
        </Link>
        {!member.linkedUserId && (
          <Dialog
            open={deleteOpen}
            onOpenChange={(open) => {
              setDeleteOpen(open);
              if (!open) setDeleteError(null);
            }}
          >
            <DialogTrigger
              render={
                <button
                  type="button"
                  aria-label={`Supprimer ${member.displayName}`}
                  className="text-muted-foreground hover:border-destructive hover:text-destructive flex size-6 items-center justify-center rounded-full border"
                />
              }
            >
              <XIcon className="size-3.5" />
            </DialogTrigger>
            <DialogContent showCloseButton={false}>
              <DialogHeader>
                <DialogTitle>Supprimer {member.displayName} ?</DialogTitle>
                <DialogDescription>
                  Cette action est irréversible : son historique
                  d&apos;objectifs nutritionnels et ses présences aux repas
                  planifiés seront aussi supprimés.
                </DialogDescription>
              </DialogHeader>
              {deleteError && (
                <p className="text-destructive text-sm">{deleteError}</p>
              )}
              <DialogFooter>
                <DialogClose
                  render={<Button type="button" variant="outline" />}
                >
                  Annuler
                </DialogClose>
                <Button
                  type="button"
                  variant="destructive"
                  disabled={deletePending}
                  onClick={handleDelete}
                >
                  {deletePending ? "Suppression..." : "Supprimer"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </li>
  );
}
