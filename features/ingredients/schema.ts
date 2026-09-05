import { z } from "zod";

export const ingredientSchema = z.object({
  name: z.string().min(1, "Le nom est requis").max(100),
  category: z.enum([
    "FRUITS_VEGETABLES",
    "DAIRY",
    "MEAT_FISH",
    "GROCERY",
    "BAKERY",
    "BEVERAGES",
    "FROZEN",
    "OTHER",
  ]),
  baseUnit: z.enum(["GRAM", "MILLILITER"]),
  caloriesPer100: z.coerce.number().nonnegative(),
  proteinPer100: z.coerce.number().nonnegative(),
  carbsPer100: z.coerce.number().nonnegative(),
  fatPer100: z.coerce.number().nonnegative(),
});

export type IngredientInput = z.infer<typeof ingredientSchema>;

export const categoryLabels: Record<IngredientInput["category"], string> = {
  FRUITS_VEGETABLES: "Fruits & Légumes",
  DAIRY: "Produits laitiers",
  MEAT_FISH: "Viande & Poisson",
  GROCERY: "Épicerie",
  BAKERY: "Boulangerie",
  BEVERAGES: "Boissons",
  FROZEN: "Surgelés",
  OTHER: "Autres",
};

export const unitLabels: Record<IngredientInput["baseUnit"], string> = {
  GRAM: "Grammes (g)",
  MILLILITER: "Millilitres (ml)",
};
