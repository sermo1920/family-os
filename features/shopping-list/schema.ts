import { z } from "zod";
import { ingredientSchema } from "@/features/ingredients/schema";

export const createListSchema = z.object({
  name: z.string().min(1, "Le nom est requis").max(100),
});

export const importPlannedMealsSchema = z.object({
  startDate: z.string().min(1, "Date de début requise"),
  endDate: z.string().min(1, "Date de fin requise"),
});

export const manualItemSchema = z.object({
  name: z.string().min(1, "Le nom est requis").max(100),
  category: ingredientSchema.shape.category,
  // Optional: a quick add only needs a name (e.g. "Lame gilette"), see
  // addManualItem for the default stored when it is left empty.
  quantity: z.preprocess(
    (value) => (value === "" || value == null ? undefined : value),
    z.coerce.number().positive().optional(),
  ),
  unit: ingredientSchema.shape.baseUnit,
});
