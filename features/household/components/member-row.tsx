"use client";

import { useState } from "react";
import Link from "next/link";
import { ProfileForm } from "@/features/household/components/profile-form";
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
    role: string;
    dateOfBirth: Date | null;
    sex: Sex | null;
    heightCm: number | null;
    weightKg: number | null;
    activityLevel: ActivityLevel | null;
  };
}) {
  const [isEditing, setIsEditing] = useState(false);

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
      <span>{member.displayName}</span>
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
      </div>
    </li>
  );
}
