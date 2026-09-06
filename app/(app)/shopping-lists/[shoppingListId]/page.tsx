import { notFound } from "next/navigation";
import { assertHouseholdAccess } from "@/lib/auth";
import { getShoppingListWithItems } from "@/features/shopping-list/queries";
import { ShoppingListItems } from "@/features/shopping-list/components/shopping-list-items";
import { AddManualItemForm } from "@/features/shopping-list/components/add-manual-item-form";
import { ImportPlannedMealsDialog } from "@/features/shopping-list/components/import-planned-meals-dialog";
import { DeleteListButton } from "@/features/shopping-list/components/delete-list-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const dateFormatter = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "short",
});

export default async function ShoppingListPage({
  params,
}: PageProps<"/shopping-lists/[shoppingListId]">) {
  const { shoppingListId } = await params;

  const shoppingList = await getShoppingListWithItems(shoppingListId);
  if (!shoppingList) notFound();

  await assertHouseholdAccess(shoppingList.householdId);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{shoppingList.name}</h1>
          {shoppingList.startDate && shoppingList.endDate && (
            <p className="text-muted-foreground text-sm">
              {dateFormatter.format(shoppingList.startDate)} –{" "}
              {dateFormatter.format(shoppingList.endDate)}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <ImportPlannedMealsDialog shoppingListId={shoppingList.id} />
          <DeleteListButton
            shoppingListId={shoppingList.id}
            listName={shoppingList.name}
          />
        </div>
      </div>

      <ShoppingListItems items={shoppingList.items} />

      <Card>
        <CardHeader>
          <CardTitle>Ajouter un article</CardTitle>
        </CardHeader>
        <CardContent>
          <AddManualItemForm shoppingListId={shoppingList.id} />
        </CardContent>
      </Card>
    </div>
  );
}
