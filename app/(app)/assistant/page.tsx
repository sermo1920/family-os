import Link from "next/link";
import { notFound } from "next/navigation";
import { PlusIcon } from "lucide-react";
import { getOrCreateCurrentMember } from "@/lib/auth";
import {
  getConversation,
  listConversations,
} from "@/features/assistant/conversation";
import { isAiConfigured, AI_MODEL } from "@/features/assistant/llm";
import { Chat } from "@/features/assistant/components/chat";
import { DeleteConversationButton } from "@/features/assistant/components/delete-conversation-button";
import { Button } from "@/components/ui/button";

const dateFormatter = new Intl.DateTimeFormat("fr-CH", {
  day: "numeric",
  month: "short",
  timeZone: "Europe/Zurich",
});

export default async function AssistantPage({
  searchParams,
}: PageProps<"/assistant">) {
  const { c } = await searchParams;
  const conversationId = typeof c === "string" ? c : undefined;

  const member = await getOrCreateCurrentMember();
  const [conversations, conversation] = await Promise.all([
    listConversations(member.id),
    conversationId ? getConversation(member.id, conversationId) : null,
  ]);
  if (conversationId && !conversation) notFound();

  const configured = isAiConfigured();

  const conversationLinks = (
    <ul className="flex flex-col gap-1">
      {conversations.map((item) => (
        <li key={item.id}>
          <Link
            href={`/assistant?c=${item.id}`}
            className={`hover:bg-muted flex flex-col rounded-md px-2 py-1.5 text-sm ${
              item.id === conversationId ? "bg-muted font-medium" : ""
            }`}
          >
            <span className="truncate">{item.title}</span>
            <span className="text-muted-foreground text-xs">
              {dateFormatter.format(item.updatedAt)}
            </span>
          </Link>
        </li>
      ))}
      {conversations.length === 0 && (
        <li className="text-muted-foreground px-2 text-sm">
          Aucune conversation.
        </li>
      )}
    </ul>
  );

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-4 lg:flex-row">
      <aside className="flex flex-col gap-2 lg:w-60 lg:shrink-0">
        <Button variant="outline" render={<Link href="/assistant" />}>
          <PlusIcon />
          Nouvelle conversation
        </Button>
        <details className="lg:hidden">
          <summary className="text-muted-foreground cursor-pointer text-sm">
            Conversations précédentes ({conversations.length})
          </summary>
          <div className="mt-2">{conversationLinks}</div>
        </details>
        <div className="hidden lg:block">{conversationLinks}</div>
      </aside>

      <section className="flex min-w-0 flex-1 flex-col gap-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h1 className="text-2xl font-semibold">Assistant</h1>
            <p className="text-muted-foreground text-sm">
              Coordinateur du foyer — délègue à l&apos;agent cuisine (menus,
              recettes, courses, préférences, stock).
            </p>
          </div>
          {conversation && (
            <DeleteConversationButton
              conversationId={conversation.id}
              title={conversation.title}
            />
          )}
        </div>

        {configured ? (
          <Chat
            key={conversationId ?? "new"}
            conversationId={conversationId}
            initialMessages={conversation?.messages ?? []}
          />
        ) : (
          <NotConfigured />
        )}

        {configured && (
          <p className="text-muted-foreground text-xs">
            Modèle : {AI_MODEL}. Les menus et recettes proposés par l&apos;IA
            restent « à valider » ; aucune commande ni aucun achat n&apos;est
            jamais effectué.
          </p>
        )}
      </section>
    </div>
  );
}

function NotConfigured() {
  return (
    <div className="flex flex-col gap-3 rounded-lg border p-4 text-sm">
      <p className="font-medium">
        L&apos;assistant IA n&apos;est pas encore configuré.
      </p>
      <p className="text-muted-foreground">
        Le reste de l&apos;application (planning, recettes, courses,
        préférences) fonctionne sans IA. Pour activer l&apos;assistant :
      </p>
      <ol className="text-muted-foreground list-decimal space-y-1 pl-5">
        <li>
          Crée une clé API sur console.anthropic.com (Settings → API Keys).
        </li>
        <li>
          En local : ajoute <code>ANTHROPIC_API_KEY=…</code> dans{" "}
          <code>.env.local</code>, puis redémarre <code>npm run dev</code>.
        </li>
        <li>
          Sur Vercel : Project Settings → Environment Variables → ajoute{" "}
          <code>ANTHROPIC_API_KEY</code>, puis redéploie.
        </li>
      </ol>
      <p className="text-muted-foreground">
        La clé reste côté serveur, elle n&apos;est jamais envoyée au navigateur.
        Aucun mode démonstration n&apos;est activé : sans clé, aucune réponse
        n&apos;est simulée.
      </p>
    </div>
  );
}
