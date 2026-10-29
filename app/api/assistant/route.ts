import { z } from "zod";
import { prisma } from "@/lib/db";
import { getAuthClaims } from "@/lib/auth";
import { runConversationTurn } from "@/features/assistant/conversation";
import {
  createAnthropicClient,
  isAiConfigured,
} from "@/features/assistant/llm";

// A turn can chain several model calls (coordinator + cooking agent tools).
export const maxDuration = 300;

const bodySchema = z.object({
  conversationId: z.string().min(1).optional(),
  message: z.string(),
});

/**
 * Chat endpoint. Streams newline-delimited JSON events so the UI can show
 * progress while the agents work:
 *   {type:"conversation", id} → {type:"status", text}* → {type:"done", message}
 *   or {type:"error", error}
 */
export async function POST(request: Request) {
  const claims = await getAuthClaims();
  if (!claims) {
    return Response.json({ error: "Non connecté." }, { status: 401 });
  }
  const member = await prisma.member.findUnique({
    where: { linkedUserId: claims.sub },
  });
  if (!member) {
    return Response.json({ error: "Profil introuvable." }, { status: 403 });
  }

  if (!isAiConfigured()) {
    return Response.json(
      {
        error:
          "L'assistant IA n'est pas configuré : ajoute ANTHROPIC_API_KEY aux variables d'environnement du serveur.",
      },
      { status: 503 },
    );
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: "Requête invalide." }, { status: 400 });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: Record<string, unknown>) =>
        controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
      try {
        const result = await runConversationTurn({
          member,
          conversationId: parsed.data.conversationId,
          text: parsed.data.message,
          client: createAnthropicClient(),
          onConversation: (id) => send({ type: "conversation", id }),
          onStatus: (text) => send({ type: "status", text }),
        });
        if (result.ok) {
          send({
            type: "done",
            conversationId: result.conversationId,
            message: result.message,
          });
        } else {
          send({ type: "error", error: result.error });
        }
      } catch (error) {
        console.error("[assistant] request failed", error);
        send({
          type: "error",
          error: "Erreur interne du serveur. Réessaie dans un instant.",
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
