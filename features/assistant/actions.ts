"use server";

import { revalidatePath } from "next/cache";
import { getOrCreateCurrentMember } from "@/lib/auth";
import { deleteConversation } from "@/features/assistant/conversation";

export async function deleteConversationAction(
  conversationId: string,
): Promise<{ error: string | null }> {
  const member = await getOrCreateCurrentMember();
  const deleted = await deleteConversation(member.id, conversationId);
  if (!deleted) return { error: "Conversation introuvable." };
  revalidatePath("/assistant");
  return { error: null };
}
