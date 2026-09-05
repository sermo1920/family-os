import { prisma } from "@/lib/db";
import { addDays } from "@/features/meal-plan/dates";

/** Tous les repas planifiés d'une semaine (7 jours à partir de weekStart). */
export async function getWeekPlan(householdId: string, weekStart: Date) {
  const weekEnd = addDays(weekStart, 7);

  return prisma.plannedMeal.findMany({
    where: { householdId, date: { gte: weekStart, lt: weekEnd } },
    include: {
      recipe: true,
      attendances: { include: { member: true } },
    },
  });
}
