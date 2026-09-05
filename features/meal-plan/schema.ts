import { z } from "zod";

export const mealSlots = ["BREAKFAST", "LUNCH", "DINNER", "SNACK"] as const;

export const mealSlotLabels: Record<(typeof mealSlots)[number], string> = {
  BREAKFAST: "Petit-déjeuner",
  LUNCH: "Déjeuner",
  DINNER: "Dîner",
  SNACK: "Collation",
};

export const assignMealSchema = z.object({
  recipeId: z.string().min(1, "Choisis une recette"),
  portionMultiplier: z.coerce.number().positive().default(1),
  memberIds: z.array(z.string()),
});

export type AssignMealInput = z.infer<typeof assignMealSchema>;
