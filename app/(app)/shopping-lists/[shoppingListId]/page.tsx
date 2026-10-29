import { notFound } from "next/navigation";
import { assertHouseholdAccess } from "@/lib/auth";
import {
  getShoppingListWithItems,
  listKnownShoppingItems,
} from "@/features/shopping-list/queries";
import { ShoppingListItems } from "@/features/shopping-list/components/shopping-list-items";
import { AddManualItemForm } from "@/features/shopping-list/components/add-manual-item-form";
import { ImportPlannedMealsDialog } from "@/features/shopping-list/components/import-planned-meals-dialog";
import { DeleteListButton } from "@/features/shopping-list/components/delete-list-button";
import { ShoppingCartIcon } from "lucide-react";

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

  const knownItems = await listKnownShoppingItems(shoppingList.householdId);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-5">
      <header className="bg-coral text-coral-foreground flex items-center gap-4 rounded-2xl px-5 py-5">
        <ShoppingCartIcon className="size-7 shrink-0" />
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-2xl font-semibold">
            {shoppingList.name}
          </h1>
          {shoppingList.startDate && shoppingList.endDate && (
            <p className="text-coral-foreground/80 text-sm">
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
      </header>

      <AddManualItemForm
        shoppingListId={shoppingList.id}
        knownItems={knownItems}
      />

      <ShoppingListItems items={shoppingList.items} />
    </div>
  );
}
