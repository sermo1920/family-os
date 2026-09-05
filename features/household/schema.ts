import { z } from "zod";

export const addMemberSchema = z.object({
  displayName: z.string().min(1, "Le prénom est requis").max(50),
  role: z.enum(["ADULT", "CHILD"]).default("ADULT"),
  dateOfBirth: z.string().optional(),
  sex: z.enum(["MALE", "FEMALE"]).optional(),
  heightCm: z.coerce.number().positive().optional(),
  weightKg: z.coerce.number().positive().optional(),
  activityLevel: z
    .enum(["SEDENTARY", "LIGHT", "MODERATE", "ACTIVE", "VERY_ACTIVE"])
    .optional(),
});

export type AddMemberInput = z.infer<typeof addMemberSchema>;
