import { z } from "zod";

export const signUpSchema = z.object({
  displayName: z.string().min(1, "Le prénom est requis").max(50),
  email: z.email("Adresse e-mail invalide"),
  password: z.string().min(8, "8 caractères minimum"),
});

export const signInSchema = z.object({
  email: z.email("Adresse e-mail invalide"),
  password: z.string().min(1, "Mot de passe requis"),
});

export type SignUpInput = z.infer<typeof signUpSchema>;
export type SignInInput = z.infer<typeof signInSchema>;
