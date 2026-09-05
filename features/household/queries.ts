import { prisma } from "@/lib/db";

export async function getHouseholdWithMembers(householdId: string) {
  return prisma.household.findUniqueOrThrow({
    where: { id: householdId },
    include: {
      members: {
        orderBy: { createdAt: "asc" },
        include: { invitation: true },
      },
    },
  });
}
