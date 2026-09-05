import { z } from "zod";

export const generateListSchema = z.object({
  name: z.string().min(1, "Le nom est requis").max(100),
  startDate: z.string().min(1, "Date de début requise"),
  endDate: z.string().min(1, "Date de fin requise"),
});

export const manualItemSchema = z.object({
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
  quantity: z.coerce.number().positive(),
  unit: z.enum(["GRAM", "MILLILITER"]),
});
