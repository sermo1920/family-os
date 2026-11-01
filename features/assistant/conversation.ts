import { prisma } from "@/lib/db";
import type { Prisma } from "@/lib/generated/prisma/client";
import {
  ActionLog,
  isAgentActionList,
  type AgentAction,
} from "@/features/assistant/actions-log";
import { runCoordinator } from "@/features/assistant/coordinator";
import { buildDateContext } from "@/features/assistant/date-context";
import { describeAiError, type LlmClient } from "@/features/assistant/llm";

export async function listConversations(memberId: string) {
  return prisma.conversation.findMany({
    where: { memberId },
    orderBy: { updatedAt: "desc" },
    take: 30,
    select: { id: true, title: true, updatedAt: true },
  });
}

/** A member only ever sees their own conversations. */
export async function getConversation(
  memberId: string,
  conversationId: string,
) {
  const conversation = await prisma.conversation.findFirst({
    where: { id: conversationId, memberId },
    include: { messages: { orderBy: { createdAt: "asc" } } },
  });
  if (!conversation) return null;
  return {
    ...conversation,
    messages: conversation.messages.map(toChatMessage),
  };
}

export interface ChatMessage {
  id: string;
  role: "USER" | "ASSISTANT";
  content: string;
  actions: AgentAction[];
  isError: boolean;
  createdAt: string;
}

function toChatMessage(message: {
  id: string;
  role: "USER" | "ASSISTANT";
  content: string;
  actions: Prisma.JsonValue;
  isError: boolean;
  createdAt: Date;
}): ChatMessage {
  return {
    id: message.id,
    role: message.role,
    content: message.content,
    actions: isAgentActionList(message.actions) ? message.actions : [],
    isError: message.isError,
    createdAt: message.createdAt.toISOString(),
  };
}

export async function deleteConversation(
  memberId: string,
  conversationId: string,
) {
  const result = await prisma.conversation.deleteMany({
    where: { id: conversationId, memberId },
  });
  return result.count > 0;
}

export interface TurnInput {
  member: { id: string; householdId: string };
  conversationId?: string;
  text: string;
  client: LlmClient;
  now?: Date;
  onStatus?: (status: string) => void;
  onConversation?: (conversationId: string) => void;
}

export type TurnResult =
  | { ok: true; conversationId: string; message: ChatMessage }
  | { ok: false; status: number; error: string };

/**
 * One conversation turn: store the user's message, run the coordinator,
 * store its answer with the action journal. On an AI failure the error is
 * stored as an assistant message too — including the writes that did happen
 * before the failure, so nothing is silently half-done.
 */
export async function runConversationTurn(
  input: TurnInput,
): Promise<TurnResult> {
  const text = input.text.trim();
  if (!text) return { ok: false, status: 400, error: "Message vide." };
  if (text.length > 4000) {
    return {
      ok: false,
      status: 400,
      error: "Message trop long (4000 caractères max).",
    };
  }

  let conversation = input.conversationId
    ? await prisma.conversation.findFirst({
        where: { id: input.conversationId, memberId: input.member.id },
      })
    : null;
  if (input.conversationId && !conversation) {
    return { ok: false, status: 404, error: "Conversation introuvable." };
  }
  if (!conversation) {
    conversation = await prisma.conversation.create({
      data: {
        householdId: input.member.householdId,
        memberId: input.member.id,
        title: text.length > 60 ? `${text.slice(0, 57)}…` : text,
      },
    });
  }
  input.onConversation?.(conversation.id);

  const previous = await prisma.conversationMessage.findMany({
    where: { conversationId: conversation.id },
    orderBy: { createdAt: "desc" },
    take: 16,
  });
  await prisma.conversationMessage.create({
    data: { conversationId: conversation.id, role: "USER", content: text },
  });

  const log = new ActionLog();
  let content: string;
  let isError = false;
  try {
    const result = await runCoordinator({
      client: input.client,
      householdId: input.member.householdId,
      history: previous.reverse().map((m) => ({
        role: m.role,
        content: m.content,
        actions: isAgentActionList(m.actions) ? m.actions : null,
      })),
      userMessage: text,
      dateContext: buildDateContext(input.now ?? new Date()),
      log,
      onStatus: input.onStatus,
    });
    content = result.reply;
  } catch (error) {
    console.error("[assistant] turn failed", error);
    isError = true;
    content =
      describeAiError(error) +
      (log.entries.length > 0
        ? " Attention : certaines modifications ont déjà été enregistrées avant l'erreur (détail ci-dessous)."
        : " Aucune modification n'a été enregistrée.");
  }

  const saved = await prisma.conversationMessage.create({
    data: {
      conversationId: conversation.id,
      role: "ASSISTANT",
      content,
      isError,
      actions: log.entries as unknown as Prisma.InputJsonValue,
    },
  });
  await prisma.conversation.update({
    where: { id: conversation.id },
    data: { updatedAt: new Date() },
  });

  return {
    ok: true,
    conversationId: conversation.id,
    message: toChatMessage(saved),
  };
}
