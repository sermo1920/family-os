import { z } from "zod";

export const mealSlots = ["BREAKFAST", "LUNCH", "DINNER"] as const;

// Terminologie romande (Suisse) : "déjeuner" = petit-déjeuner du matin,
// "dîner" = repas de midi, "souper" = repas du soir — pas les noms
// utilisés en France ("déjeuner" = midi, "dîner" = soir).
export const mealSlotLabels: Record<(typeof mealSlots)[number], string> = {
  BREAKFAST: "Déjeuner",
  LUNCH: "Dîner",
  DINNER: "Souper",
};

export const assignMealSchema = z.object({
  recipeId: z.string().min(1, "Choisis une recette"),
  portionMultiplier: z.coerce.number().positive().default(1),
  memberIds: z.array(z.string()),
});

export type AssignMealInput = z.infer<typeof assignMealSchema>;
