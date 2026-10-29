import { z } from "zod";
import { ingredientSchema } from "@/features/ingredients/schema";

export const createListSchema = z.object({
  name: z.string().min(1, "Le nom est requis").max(100),
});

const dateKey = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date invalide");

export const syncListSchema = z.object({
  startDate: dateKey,
  endDate: dateKey,
});

export const manualItemSchema = z.object({
  name: z.string().min(1, "Le nom est requis").max(100),
  category: ingredientSchema.shape.category,
  quantity: z.coerce.number().positive(),
  unit: ingredientSchema.shape.baseUnit,
});
