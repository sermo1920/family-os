import { z } from "zod";

export const manualGoalSchema = z.object({
  calorieTarget: z.coerce.number().int().positive(),
  proteinG: z.coerce.number().int().nonnegative(),
  carbsG: z.coerce.number().int().nonnegative(),
  fatG: z.coerce.number().int().nonnegative(),
  notes: z.string().max(500).optional(),
});

export type ManualGoalInput = z.infer<typeof manualGoalSchema>;
