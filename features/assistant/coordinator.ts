import type Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { runToolLoop } from "@/features/assistant/agent-loop";
import { ActionLog, type AgentAction } from "@/features/assistant/actions-log";
import type { LlmClient } from "@/features/assistant/llm";
import {
  defineTool,
  ToolInputError,
  type AgentTool,
} from "@/features/assistant/tool";
import {
  availableSpecialists,
  delegationToolName,
  plannedSpecialists,
} from "@/features/assistant/specialists";

/**
 * Coordinator: the household's single interlocutor. It only understands,
 * delegates and answers — business logic lives in the specialists. Its only
 * tools are "delegate to specialist X", capped per turn, and specialists
 * cannot delegate back: a simple request is coordinator → specialist →
 * coordinator, nothing more.
 */

export const MAX_DELEGATIONS_PER_TURN = 2;

function buildSystemPrompt() {
  const available = availableSpecialists()
    .map((s) => `- ${s.label} (outil ${delegationToolName(s)}) : ${s.scope}`)
    .join("\n");
  const planned = plannedSpecialists()
    .map((s) => `- ${s.label} : ${s.scope}`)
    .join("\n");

  return `Tu es l'assistant central de Family OS, l'application d'un foyer en Suisse romande. Tu es l'interlocuteur unique de l'utilisateur : tu comprends sa demande, tu la confies au bon spécialiste et tu lui réponds. Réponds toujours en français, tutoiement.

Vocabulaire romand des repas : déjeuner = matin, dîner = midi, souper = soir.

Spécialistes disponibles :
${available}

Spécialistes prévus mais PAS encore disponibles (dis-le simplement si on te demande quelque chose dans ces domaines, sans improviser) :
${planned}

Délégation
- Tu ne réalises toi-même aucune opération métier : pour tout ce qui touche à la cuisine, aux menus, recettes, courses, préférences ou stock, délègue.
- Ta demande au spécialiste doit se suffire à elle-même : reprends toutes les contraintes exprimées dans la conversation (personnes, portions, temps disponible, goûts, budget, restes...) et résous les références à l'aide de l'historique et du calendrier (« celui de jeudi » → la date AAAA-MM-JJ et le créneau concernés, « la liste Migros » → son nom).
- En général une seule délégation suffit. N'en fais une seconde que si le premier rapport l'exige (maximum ${MAX_DELEGATIONS_PER_TURN} par message). Ne délègue pas pour une simple salutation ou une question sur ton fonctionnement.
- Si une information indispensable manque vraiment, pose une seule question courte au lieu de déléguer. Sinon retiens une hypothèse raisonnable et signale-la (par défaut : le souper, du lundi au dimanche de la période demandée ; portions = nombre de membres du foyer).

Ta réponse à l'utilisateur
- Claire et brève, en texte simple (listes avec « - » permises, pas de tableaux ni de titres).
- Sois exact sur l'état des choses en t'appuyant sur le journal d'actions renvoyé par le spécialiste : « proposé (à valider dans le Planning) », « enregistré », « non fait ». Ne dis jamais qu'une chose a été faite si elle ne figure pas dans ce journal.
- Signale les estimations comme telles. Aucune commande ni aucun achat n'est jamais passé par l'application.`;
}

export interface ConversationTurn {
  role: "USER" | "ASSISTANT";
  content: string;
  actions?: AgentAction[] | null;
}

/**
 * Past turns given to the coordinator: text only, with the action journal of
 * each assistant turn so references like "remplace celui de jeudi" can be
 * resolved. Only the last turns are kept (the DB holds the real state).
 */
export function buildHistory(
  turns: ConversationTurn[],
  maxTurns = 16,
): Anthropic.Beta.BetaMessageParam[] {
  const recent = turns.slice(-maxTurns);
  // The API expects the conversation to start with a user message.
  const firstUser = recent.findIndex((turn) => turn.role === "USER");
  return (firstUser === -1 ? [] : recent.slice(firstUser)).map((turn) => {
    if (turn.role === "USER") return { role: "user", content: turn.content };
    const journal =
      turn.actions && turn.actions.length > 0
        ? `\n\n[Journal des actions enregistrées pendant ce tour]\n${turn.actions
            .map((a) => `- ${a.summary}`)
            .join("\n")}`
        : "";
    return { role: "assistant", content: `${turn.content}${journal}` };
  });
}

export interface CoordinatorInput {
  client: LlmClient;
  householdId: string;
  history: ConversationTurn[];
  userMessage: string;
  dateContext: string;
  /** Shared with the caller so writes done before an error are still reported. */
  log: ActionLog;
  onStatus?: (status: string) => void;
}

export interface CoordinatorResult {
  reply: string;
  actions: AgentAction[];
  delegations: number;
}

export async function runCoordinator(
  input: CoordinatorInput,
): Promise<CoordinatorResult> {
  let delegations = 0;

  const tools: AgentTool[] = availableSpecialists().map((specialist) =>
    defineTool({
      name: delegationToolName(specialist),
      description: `Confie une demande à l'${specialist.label.toLowerCase()} (${specialist.scope}). Renvoie son rapport et le journal des actions réellement enregistrées.`,
      schema: z.object({
        demande: z
          .string()
          .min(1)
          .max(4000)
          .describe(
            "Demande complète et autonome, avec toutes les contraintes et dates résolues",
          ),
        contexte: z
          .string()
          .max(4000)
          .optional()
          .describe(
            "Éléments utiles tirés de la conversation (repas déjà proposés, réponses de l'utilisateur...)",
          ),
      }),
      async run({ demande, contexte }) {
        if (delegations >= MAX_DELEGATIONS_PER_TURN) {
          throw new ToolInputError(
            "Nombre maximal de délégations atteint pour ce message : réponds avec ce que tu as.",
          );
        }
        delegations += 1;
        input.onStatus?.(`${specialist.workingLabel}…`);
        const before = input.log.entries.length;
        const result = await specialist.run({
          client: input.client,
          householdId: input.householdId,
          request: demande,
          context: contexte,
          dateContext: input.dateContext,
          log: input.log,
          onToolCall: (name) =>
            input.onStatus?.(
              `${specialist.workingLabel} (${name.replace(/_/g, " ")})…`,
            ),
        });
        input.onStatus?.("Rédaction de la réponse…");
        return {
          rapport: result.report,
          journalDesActions: input.log.since(before).map((a) => a.summary),
          limiteAtteinte: result.limitReached,
        };
      },
    }),
  );

  input.onStatus?.("Analyse de la demande…");
  const result = await runToolLoop({
    client: input.client,
    system: buildSystemPrompt(),
    history: buildHistory(input.history),
    userMessage: `[Calendrier]\n${input.dateContext}\n\n${input.userMessage}`,
    tools,
    effort: "low",
    maxIterations: 4,
  });

  const reply = result.refused
    ? "Je ne peux pas traiter cette demande."
    : result.text ||
      (input.log.entries.length > 0
        ? "Voici ce qui a été enregistré (voir le détail ci-dessous)."
        : "Je n'ai pas pu formuler de réponse. Peux-tu reformuler ta demande ?");

  return { reply, actions: input.log.entries, delegations };
}
