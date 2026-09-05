"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { assertHouseholdAccess } from "@/lib/auth";
import { addMemberSchema } from "@/features/household/schema";

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
