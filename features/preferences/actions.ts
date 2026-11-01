"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { assertHouseholdAccess } from "@/lib/auth";
import { preferenceSchema } from "@/features/preferences/schema";
import {
  addPreference,
  deletePreference,
  updatePreference,
} from "@/features/preferences/service";

export type PreferenceActionState = { error: string | null; saved: boolean };

export async function addPreferenceAction(
  householdId: string,
  _prevState: PreferenceActionState,
  formData: FormData,
): Promise<PreferenceActionState> {
  await assertHouseholdAccess(householdId);

  const parsed = preferenceSchema.safeParse({
    kind: formData.get("kind"),
    text: formData.get("text"),
  });
  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Champs invalides",
      saved: false,
    };
  }

  await addPreference(householdId, parsed.data.kind, parsed.data.text);
  revalidatePath("/preferences");
  return { error: null, saved: true };
}

export async function updatePreferenceAction(
  preferenceId: string,
  _prevState: PreferenceActionState,
  formData: FormData,
): Promise<PreferenceActionState> {
  const preference = await prisma.householdPreference.findUniqueOrThrow({
    where: { id: preferenceId },
  });
  await assertHouseholdAccess(preference.householdId);

  const parsed = preferenceSchema.safeParse({
    kind: formData.get("kind"),
    text: formData.get("text"),
  });
  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Champs invalides",
      saved: false,
    };
  }

  await updatePreference(preference.householdId, preferenceId, parsed.data);
  revalidatePath("/preferences");
  return { error: null, saved: true };
}

export async function deletePreferenceAction(
  preferenceId: string,
): Promise<{ error: string | null }> {
  const preference = await prisma.householdPreference.findUniqueOrThrow({
    where: { id: preferenceId },
  });
  await assertHouseholdAccess(preference.householdId);

  await deletePreference(preference.householdId, preferenceId);
  revalidatePath("/preferences");
  return { error: null };
}
