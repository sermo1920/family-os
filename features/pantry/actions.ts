"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { assertHouseholdAccess } from "@/lib/auth";
import { ingredientSchema } from "@/features/ingredients/schema";
import { removePantryItemById, setPantryItem } from "@/features/pantry/service";

export type PantryActionState = { error: string | null; saved: boolean };

const pantryFormSchema = z.object({
  name: z.string().trim().min(1, "Le nom est requis").max(100),
  quantity: z
    .string()
    .optional()
    .transform((value) => (value ? Number(value) : null))
    .refine(
      (value) => value === null || (Number.isFinite(value) && value >= 0),
      {
        message: "Quantité invalide",
      },
    ),
  unit: ingredientSchema.shape.baseUnit,
  category: ingredientSchema.shape.category,
});

export async function setPantryAction(
  householdId: string,
  _prevState: PantryActionState,
  formData: FormData,
): Promise<PantryActionState> {
  await assertHouseholdAccess(householdId);

  const parsed = pantryFormSchema.safeParse({
    name: formData.get("name"),
    quantity: formData.get("quantity") || undefined,
    unit: formData.get("unit"),
    category: formData.get("category"),
  });
  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Champs invalides",
      saved: false,
    };
  }

  const result = await setPantryItem(householdId, parsed.data);
  if (!result.ok) return { error: result.error, saved: false };
  revalidatePath("/preferences");
  return { error: null, saved: true };
}

export async function removePantryAction(
  pantryItemId: string,
): Promise<{ error: string | null }> {
  const item = await prisma.pantryItem.findUniqueOrThrow({
    where: { id: pantryItemId },
  });
  await assertHouseholdAccess(item.householdId);

  await removePantryItemById(item.householdId, pantryItemId);
  revalidatePath("/preferences");
  return { error: null };
}
