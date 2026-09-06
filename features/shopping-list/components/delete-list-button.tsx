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
      onConfirm={() => deleteShoppingList(shoppingListId)}
      onSuccess={() => router.push("/shopping-lists")}
    />
  );
}
