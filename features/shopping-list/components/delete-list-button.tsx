"use client";

import { useRouter } from "next/navigation";
import { deleteShoppingList } from "@/features/shopping-list/actions";
import { ConfirmDeleteButton } from "@/components/confirm-delete-button";

export function DeleteListButton({
  shoppingListId,
  listName,
}: {
  shoppingListId: string;
  listName: string;
}) {
  const router = useRouter();

  return (
    <ConfirmDeleteButton
      itemLabel={listName}
      triggerClassName="border-coral-foreground/40 text-coral-foreground hover:border-coral-foreground hover:text-coral-foreground size-8"
      onConfirm={() => deleteShoppingList(shoppingListId)}
      onSuccess={() => router.push("/shopping-lists")}
    />
  );
}
