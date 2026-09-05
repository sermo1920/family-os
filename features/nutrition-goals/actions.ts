"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { assertHouseholdAccess } from "@/lib/auth";
import { computeNutritionGoal } from "@/features/nutrition-goals/calculations";
import { manualGoalSchema } from "@/features/nutrition-goals/schema";

export type GoalActionState = { error: string | null };

async function getMemberProfileOrThrow(memberId: string) {
  const member = await prisma.member.findUniqueOrThrow({
    where: { id: memberId },
  });
  await assertHouseholdAccess(member.householdId);

  if (
    !member.dateOfBirth ||
    !member.sex ||
    !member.heightCm ||
    !member.weightKg ||
    !member.activityLevel
  ) {
    throw new Error(
      "Profil incomplet : date de naissance, sexe, taille, poids et niveau d'activité sont requis.",
    );
  }

  return {
    member,
    profile: {
      dateOfBirth: member.dateOfBirth,
      sex: member.sex,
      heightCm: member.heightCm,
      weightKg: member.weightKg,
      activityLevel: member.activityLevel,
    },
  };
}

/** Recalcule l'objectif à partir du profil courant et l'enregistre. */
export async function recalculateGoal(
  memberId: string,
): Promise<GoalActionState> {
  try {
    const { profile } = await getMemberProfileOrThrow(memberId);
    const computed = computeNutritionGoal(profile);

    await prisma.nutritionGoal.create({
      data: {
        memberId,
        ...computed,
        isManualOverride: false,
      },
    });
  } catch (err) {
    return { error: (err as Error).message };
  }

  revalidatePath(`/nutrition-goals/${memberId}`);
  return { error: null };
}

/** Enregistre une cible saisie manuellement (remplace le calcul automatique). */
export async function saveManualGoal(
  memberId: string,
  _prevState: GoalActionState,
  formData: FormData,
): Promise<GoalActionState> {
  const parsed = manualGoalSchema.safeParse({
    calorieTarget: formData.get("calorieTarget"),
    proteinG: formData.get("proteinG"),
    carbsG: formData.get("carbsG"),
    fatG: formData.get("fatG"),
    notes: formData.get("notes") || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Champs invalides" };
  }

  try {
    const { profile } = await getMemberProfileOrThrow(memberId);
    // bmr/tdee sont recalculés à partir du profil pour garder une trace
    // cohérente dans l'historique, même si la cible est saisie à la main.
    const { bmr, tdee } = computeNutritionGoal(profile);

    await prisma.nutritionGoal.create({
      data: {
        memberId,
        bmr,
        tdee,
        calorieTarget: parsed.data.calorieTarget,
        proteinG: parsed.data.proteinG,
        carbsG: parsed.data.carbsG,
        fatG: parsed.data.fatG,
        notes: parsed.data.notes,
        isManualOverride: true,
      },
    });
  } catch (err) {
    return { error: (err as Error).message };
  }

  revalidatePath(`/nutrition-goals/${memberId}`);
  return { error: null };
}
