import { prisma } from "@/lib/db";

export async function listShoppingLists(householdId: string) {
  return prisma.shoppingList.findMany({
    where: { householdId },
    orderBy: { createdAt: "desc" },
  });
}

export async function getShoppingListWithItems(shoppingListId: string) {
  return prisma.shoppingList.findUnique({
    where: { id: shoppingListId },
    include: {
      items: { orderBy: [{ category: "asc" }, { name: "asc" }] },
    },
  });
}
