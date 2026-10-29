"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CheckCircle2Icon,
  Loader2Icon,
  SendIcon,
  TriangleAlertIcon,
} from "lucide-react";
import type { ChatMessage } from "@/features/assistant/conversation";
import { Button } from "@/components/ui/button";

const SUGGESTIONS = [
  "Propose les repas de la semaine pour deux personnes.",
  "Mardi, nous avons seulement vingt minutes pour cuisiner.",
  "Il reste du poulet et des courgettes, que peut-on préparer ?",
  "Prévois quatre portions pour avoir des restes demain midi.",
  "Remplace le repas de jeudi par quelque chose de végétarien.",
  "Ajoute les ingrédients manquants à la liste Migros.",
];

type StreamEvent =
  | { type: "conversation"; id: string }
  | { type: "status"; text: string }
  | { type: "done"; conversationId: string; message: ChatMessage }
  | { type: "error"; error: string };

export function Chat({
  conversationId: initialConversationId,
  initialMessages,
}: {
  conversationId?: string;
  initialMessages: ChatMessage[];
}) {
  const router = useRouter();
  const [messages, setMessages] = useState(initialMessages);
  const [conversationId, setConversationId] = useState(initialConversationId);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, status]);

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || pending) return;
    setPending(true);
    setError(null);
    setStatus("Envoi…");
    setInput("");
    const optimistic: ChatMessage = {
      id: `pending-${Date.now()}`,
      role: "USER",
      content: trimmed,
      actions: [],
      isError: false,
      createdAt: new Date().toISOString(),
    };
    setMessages((current) => [...current, optimistic]);

    let currentConversationId = conversationId;
    let finished = false;
    try {
      const response = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId, message: trimmed }),
      });
      // An expired session is redirected to the sign-in page (HTML).
      if (response.redirected || response.url.includes("/sign-in")) {
        throw new Error(
          "Ta session a expiré : reconnecte-toi puis renvoie ton message.",
        );
      }
      if (!response.ok || !response.body) {
        const body = await response.json().catch(() => null);
        throw new Error(
          body?.error ?? "Le serveur n'a pas pu traiter la demande.",
        );
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.trim()) continue;
          const event = JSON.parse(line) as StreamEvent;
          if (event.type === "conversation") {
            currentConversationId = event.id;
            setConversationId(event.id);
          } else if (event.type === "status") {
            setStatus(event.text);
          } else if (event.type === "done") {
            finished = true;
            setMessages((current) => [...current, event.message]);
          } else if (event.type === "error") {
            throw new Error(event.error);
          }
        }
      }
      if (!finished) {
        throw new Error(
          "La connexion a été interrompue avant la fin. La réponse a peut-être été enregistrée : recharge la page pour le vérifier.",
        );
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Erreur inconnue.");
      if (!currentConversationId) {
        // Nothing was stored server-side: give the text back for a retry.
        setMessages((current) => current.filter((m) => m.id !== optimistic.id));
        setInput(trimmed);
      }
    } finally {
      setPending(false);
      setStatus(null);
      if (
        currentConversationId &&
        currentConversationId !== initialConversationId
      ) {
        router.replace(`/assistant?c=${currentConversationId}`, {
          scroll: false,
        });
      }
      // Refresh server components (conversation list, etc.).
      router.refresh();
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <div className="flex flex-1 flex-col gap-4">
        {messages.length === 0 && (
          <div className="flex flex-col gap-3">
            <p className="text-muted-foreground text-sm">
              Demande ce que tu veux pour les repas, recettes, courses,
              préférences ou le stock. Exemples :
            </p>
            <div className="flex flex-wrap gap-2">
              {SUGGESTIONS.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => setInput(suggestion)}
                  className="hover:bg-muted rounded-full border px-3 py-1.5 text-left text-xs"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((message) => (
          <MessageBubble key={message.id} message={message} />
        ))}

        {pending && (
          <div
            className="text-muted-foreground flex items-center gap-2 text-sm"
            aria-live="polite"
          >
            <Loader2Icon className="size-4 animate-spin" />
            {status ?? "L'assistant réfléchit…"}
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {error && (
        <div
          role="alert"
          className="border-destructive/40 bg-destructive/5 text-destructive flex items-start gap-2 rounded-md border px-3 py-2 text-sm"
        >
          <TriangleAlertIcon className="mt-0.5 size-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form
        onSubmit={(event) => {
          event.preventDefault();
          void send(input);
        }}
        className="bg-background sticky bottom-0 flex items-end gap-2 border-t pt-3 pb-1"
      >
        <textarea
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              void send(input);
            }
          }}
          rows={2}
          maxLength={4000}
          placeholder="Écris ta demande…"
          aria-label="Message pour l'assistant"
          disabled={pending}
          className="border-input focus-visible:ring-ring/50 min-h-12 flex-1 resize-none rounded-lg border bg-transparent px-3 py-2 text-sm outline-none focus-visible:ring-3"
        />
        <Button type="submit" size="lg" disabled={pending || !input.trim()}>
          {pending ? <Loader2Icon className="animate-spin" /> : <SendIcon />}
          <span className="sr-only sm:not-sr-only">Envoyer</span>
        </Button>
      </form>
    </div>
  );
}

function MessageBubble({ message }: { message: ChatMessage }) {
  if (message.role === "USER") {
    return (
      <div className="flex justify-end">
        <p className="bg-primary text-primary-foreground max-w-[85%] rounded-2xl rounded-br-sm px-3 py-2 text-sm whitespace-pre-wrap">
          {message.content}
        </p>
      </div>
    );
  }

  return (
    <div className="flex max-w-[95%] flex-col gap-2 sm:max-w-[85%]">
      <div
        className={
          message.isError
            ? "border-destructive/40 bg-destructive/5 rounded-2xl rounded-bl-sm border px-3 py-2 text-sm whitespace-pre-wrap"
            : "bg-muted rounded-2xl rounded-bl-sm px-3 py-2 text-sm whitespace-pre-wrap"
        }
      >
        {message.isError && (
          <TriangleAlertIcon className="text-destructive mr-1 mb-0.5 inline size-4" />
        )}
        {message.content}
      </div>
      {message.actions.length > 0 && (
        <div className="rounded-lg border px-3 py-2">
          <p className="mb-1 text-xs font-medium">
            Enregistré dans l&apos;application
          </p>
          <ul className="flex flex-col gap-1">
            {message.actions.map((action, index) => (
              <li key={index} className="flex items-start gap-1.5 text-xs">
                <CheckCircle2Icon className="mt-0.5 size-3.5 shrink-0 text-green-600" />
                {action.href ? (
                  <Link href={action.href} className="hover:underline">
                    {action.summary}
                  </Link>
                ) : (
                  <span>{action.summary}</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
