"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { assertHouseholdAccess } from "@/lib/auth";
import {
  addMemberSchema,
  updateProfileSchema,
} from "@/features/household/schema";

export type AddMemberActionState = { error: string | null };

// Un champ optionnel non rempli arrive du formulaire comme une chaîne vide,
// pas comme absent : on la convertit avant validation Zod pour ne pas faire
// échouer .positive()/.enum() sur "".
function emptyToUndefined(value: FormDataEntryValue | null) {
  return value === null || value === "" ? undefined : value;
}

export async function addMember(
  householdId: string,
  _prevState: AddMemberActionState,
  formData: FormData,
): Promise<AddMemberActionState> {
  await assertHouseholdAccess(householdId);

  const parsed = addMemberSchema.safeParse({
    displayName: formData.get("displayName"),
    role: emptyToUndefined(formData.get("role")),
    dateOfBirth: emptyToUndefined(formData.get("dateOfBirth")),
    sex: emptyToUndefined(formData.get("sex")),
    heightCm: emptyToUndefined(formData.get("heightCm")),
    weightKg: emptyToUndefined(formData.get("weightKg")),
    activityLevel: emptyToUndefined(formData.get("activityLevel")),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Champs invalides" };
  }

  await prisma.member.create({
    data: {
      householdId,
      displayName: parsed.data.displayName,
      dateOfBirth: parsed.data.dateOfBirth
        ? new Date(parsed.data.dateOfBirth)
        : undefined,
      sex: parsed.data.sex,
      heightCm: parsed.data.heightCm,
      weightKg: parsed.data.weightKg,
      activityLevel: parsed.data.activityLevel,
      role: parsed.data.role,
    },
  });

  revalidatePath("/household");
  return { error: null };
}

export async function updateMemberProfile(
  memberId: string,
  _prevState: AddMemberActionState,
  formData: FormData,
): Promise<AddMemberActionState> {
  const member = await prisma.member.findUniqueOrThrow({
    where: { id: memberId },
  });
  await assertHouseholdAccess(member.householdId);

  const parsed = updateProfileSchema.safeParse({
    displayName: formData.get("displayName"),
    dateOfBirth: emptyToUndefined(formData.get("dateOfBirth")),
    sex: emptyToUndefined(formData.get("sex")),
    heightCm: emptyToUndefined(formData.get("heightCm")),
    weightKg: emptyToUndefined(formData.get("weightKg")),
    activityLevel: emptyToUndefined(formData.get("activityLevel")),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Champs invalides" };
  }

  await prisma.member.update({
    where: { id: memberId },
    data: {
      displayName: parsed.data.displayName,
      dateOfBirth: parsed.data.dateOfBirth
        ? new Date(parsed.data.dateOfBirth)
        : null,
      sex: parsed.data.sex ?? null,
      heightCm: parsed.data.heightCm ?? null,
      weightKg: parsed.data.weightKg ?? null,
      activityLevel: parsed.data.activityLevel ?? null,
    },
  });

  revalidatePath("/household");
  revalidatePath(`/nutrition-goals/${memberId}`);
  return { error: null };
}
