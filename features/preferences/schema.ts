import { z } from "zod";

export const preferenceKinds = [
  "LIKE",
  "DISLIKE",
  "EXCLUSION",
  "CONSTRAINT",
  "BUDGET",
  "OTHER",
] as const;

export type PreferenceKindValue = (typeof preferenceKinds)[number];

export const preferenceKindLabels: Record<PreferenceKindValue, string> = {
  LIKE: "On aime",
  DISLIKE: "On n'aime pas",
  EXCLUSION: "Exclusion / allergie",
  CONSTRAINT: "Contrainte (temps, matériel...)",
  BUDGET: "Budget indicatif",
  OTHER: "Autre",
};

export const preferenceSchema = z.object({
  kind: z.enum(preferenceKinds),
  text: z.string().trim().min(1, "Le texte est requis").max(300),
});
