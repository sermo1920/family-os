import { z } from "zod";

export const ingredientSchema = z.object({
  name: z.string().min(1, "Le nom est requis").max(100),
  category: z.enum([
    "OTHER",
    "FRUITS_VEGETABLES",
    "MEAT",
    "FISH",
    "BAKERY",
    "FRESH",
    "FROZEN",
    "BEVERAGES",
    "STARCHES",
    "SAVORY_GROCERY",
    "CANNED",
    "READY_MEALS",
    "SAUCES_CONDIMENTS",
    "BREAKFAST",
    "COOKIES_CAKES",
    "CONFECTIONERY",
    "DESSERT",
    "BEAUTY_HYGIENE",
    "BABY",
    "CLEANING",
    "PETS",
    "HOME_GARDEN",
    "CONDIMENTS",
  ]),
  baseUnit: z.enum(["GRAM", "MILLILITER"]),
  caloriesPer100: z.coerce.number().nonnegative(),
  proteinPer100: z.coerce.number().nonnegative(),
  carbsPer100: z.coerce.number().nonnegative(),
  fatPer100: z.coerce.number().nonnegative(),
});

export type IngredientInput = z.infer<typeof ingredientSchema>;

// Ordre volontairement calqué sur le rayon d'un magasin (voir CLAUDE.md) :
// c'est aussi l'ordre d'affichage des catégories dans les <Select> et dans
// la liste de courses groupée, puisque les deux itèrent sur cet objet.
export const categoryLabels: Record<IngredientInput["category"], string> = {
  OTHER: "Non classé",
  FRUITS_VEGETABLES: "Fruits & Légumes",
  MEAT: "Viande",
  FISH: "Poissonnerie",
  BAKERY: "Boulangerie",
  FRESH: "Frais",
  FROZEN: "Surgelés",
  BEVERAGES: "Boissons",
  STARCHES: "Pâtes, Riz, Féculents",
  SAVORY_GROCERY: "Épicerie salée",
  CANNED: "Conserves",
  READY_MEALS: "Plats cuisinés",
  SAUCES_CONDIMENTS: "Sauces & Condiments",
  BREAKFAST: "Petit déjeuner",
  COOKIES_CAKES: "Biscuits & Gâteaux",
  CONFECTIONERY: "Confiserie",
  DESSERT: "Dessert",
  BEAUTY_HYGIENE: "Beauté & Hygiène",
  BABY: "Bébé",
  CLEANING: "Entretien",
  PETS: "Animaux",
  HOME_GARDEN: "Maison & Jardin",
  CONDIMENTS: "Condiments",
};

export const unitLabels: Record<IngredientInput["baseUnit"], string> = {
  GRAM: "Grammes (g)",
  MILLILITER: "Millilitres (ml)",
};
