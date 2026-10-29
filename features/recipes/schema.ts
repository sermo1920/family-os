import { z } from "zod";

// Declared before recipeSchema (which references it); recipeTags below is
// the public, labelled version of the same list.
const recipeTagsForSchema = [
  "QUICK",
  "VEGETARIAN",
  "VEGAN",
  "MAKE_AHEAD",
  "FREEZABLE",
  "KID_FRIENDLY",
  "LIGHT",
  "BUDGET",
  "ONE_POT",
] as const;

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
  prepTimeMinutes: z.coerce.number().int().nonnegative().optional(),
  cookTimeMinutes: z.coerce.number().int().nonnegative().optional(),
  tags: z.array(z.enum(recipeTagsForSchema)).default([]),
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

export const recipeTags = recipeTagsForSchema;

export type RecipeTagValue = (typeof recipeTags)[number];

export const recipeTagLabels: Record<RecipeTagValue, string> = {
  QUICK: "Rapide",
  VEGETARIAN: "Végétarien",
  VEGAN: "Végan",
  MAKE_AHEAD: "À préparer à l'avance",
  FREEZABLE: "Se congèle",
  KID_FRIENDLY: "Apprécié des enfants",
  LIGHT: "Léger",
  BUDGET: "Économique",
  ONE_POT: "Tout-en-un",
};

export const recipeStatusLabels = {
  AI_PROPOSED: "Proposée par l'IA",
  VALIDATED: "Validée",
} as const;

/** Steps are stored one per line in Recipe.instructions. */
export function splitSteps(instructions: string | null | undefined): string[] {
  return (instructions ?? "")
    .split("\n")
    .map((line) => line.replace(/^\s*\d+[.)]\s*/, "").trim())
    .filter(Boolean);
}
