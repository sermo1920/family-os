"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteShoppingList } from "@/features/shopping-list/actions";
import { Button } from "@/components/ui/button";

export function DeleteListButton({
  shoppingListId,
}: {
  shoppingListId: string;
}) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          await deleteShoppingList(shoppingListId);
          router.push("/shopping-lists");
        })
      }
    >
      Supprimer la liste
    </Button>
  );
}
