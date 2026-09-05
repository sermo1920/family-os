import { z } from "zod";

export const recipeIngredientSchema = z.object({
  ingredientId: z.string().min(1, "Choisis un ingrédient"),
  quantity: z.coerce.number().positive("La quantité doit être positive"),
});

export const recipeSchema = z.object({
  name: z.string().min(1, "Le nom est requis").max(100),
  instructions: z.string().max(5000).optional(),
  servings: z.coerce
    .number()
    .int()
    .positive("Le nombre de portions doit être positif"),
  ingredients: z
    .array(recipeIngredientSchema)
    .min(1, "Ajoute au moins un ingrédient")
    .refine(
      (items) =>
        new Set(items.map((i) => i.ingredientId)).size === items.length,
      { message: "Un même ingrédient ne peut apparaître qu'une fois" },
    ),
});

export type RecipeInput = z.infer<typeof recipeSchema>;
