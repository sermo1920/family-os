"use client";

import { useRouter } from "next/navigation";
import { deleteConversationAction } from "@/features/assistant/actions";
import { ConfirmDeleteButton } from "@/components/confirm-delete-button";

export function DeleteConversationButton({
  conversationId,
  title,
}: {
  conversationId: string;
  title: string;
}) {
  const router = useRouter();

  return (
    <ConfirmDeleteButton
      itemLabel="cette conversation"
      ariaLabel={`Supprimer la conversation « ${title} »`}
      description="L'historique de la conversation est supprimé. Les recettes, menus et listes enregistrés restent en place."
      onConfirm={() => deleteConversationAction(conversationId)}
      onSuccess={() => router.push("/assistant")}
    />
  );
}
