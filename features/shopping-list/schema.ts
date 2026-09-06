import { z } from "zod";
import { ingredientSchema } from "@/features/ingredients/schema";

export const generateListSchema = z.object({
  name: z.string().min(1, "Le nom est requis").max(100),
  startDate: z.string().min(1, "Date de début requise"),
  endDate: z.string().min(1, "Date de fin requise"),
});

export const manualItemSchema = z.object({
  name: z.string().min(1, "Le nom est requis").max(100),
  category: ingredientSchema.shape.category,
  quantity: z.coerce.number().positive(),
  unit: z.enum(["GRAM", "MILLILITER"]),
});
