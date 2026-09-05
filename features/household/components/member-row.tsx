"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { ProfileForm } from "@/features/household/components/profile-form";
import { deleteMember } from "@/features/household/actions";
import { Button } from "@/components/ui/button";
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
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deletePending, startDeleteTransition] = useTransition();

  function handleDelete() {
    if (!window.confirm(`Supprimer ${member.displayName} du foyer ?`)) return;
    setDeleteError(null);
    startDeleteTransition(async () => {
      const result = await deleteMember(member.id);
      if (result.error) setDeleteError(result.error);
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
    <li className="flex flex-col gap-1 rounded-md border px-4 py-3">
      <div className="flex items-center justify-between">
        <div className="flex flex-col">
          <span>{member.displayName}</span>
          {member.email && (
            <span className="text-muted-foreground text-xs">
              {member.email}
            </span>
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
            <button
              type="button"
              disabled={deletePending}
              className="text-destructive text-sm underline"
              onClick={handleDelete}
            >
              Supprimer
            </button>
          )}
        </div>
      </div>
      {deleteError && <p className="text-destructive text-sm">{deleteError}</p>}
    </li>
  );
}
