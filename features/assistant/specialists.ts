import type { ActionLog } from "@/features/assistant/actions-log";
import type { LlmClient } from "@/features/assistant/llm";
import { runCookingAgent } from "@/features/cooking-agent/agent";

/**
 * Registry of the specialists the coordinator can delegate to. Adding a
 * future agent (Garmin, finances, garde-robe...) = implementing `run` in its
 * own feature folder and flipping `available`. The coordinator's tools and
 * system prompt are generated from this list, nothing else to wire.
 */

export interface SpecialistRunInput {
  client: LlmClient;
  householdId: string;
  request: string;
  context?: string;
  dateContext: string;
  log: ActionLog;
  onToolCall?: (toolName: string) => void;
}

export interface SpecialistRunResult {
  report: string;
  limitReached: boolean;
}

export interface Specialist {
  id: string;
  label: string;
  /** What the coordinator should delegate to it. */
  scope: string;
  /** Shown while the specialist works (chat loading state). */
  workingLabel: string;
  run?: (input: SpecialistRunInput) => Promise<SpecialistRunResult>;
}

export const specialists: Specialist[] = [
  {
    id: "cuisine",
    label: "Agent cuisine",
    scope:
      "recettes, menus et planning des repas, portions, restes, listes de courses, préférences alimentaires du foyer, stock d'ingrédients",
    workingLabel: "L'agent cuisine travaille",
    run: runCookingAgent,
  },
  // Planned, not implemented yet: the coordinator tells the user these
  // domains are not available instead of improvising an answer.
  {
    id: "garmin",
    label: "Agent Garmin",
    scope: "données d'activité, sommeil et santé issues de Garmin",
    workingLabel: "",
  },
  {
    id: "finances",
    label: "Agent finances",
    scope: "budget et dépenses du foyer",
    workingLabel: "",
  },
  {
    id: "garde-robe",
    label: "Agent garde-robe",
    scope: "vêtements et garde-robe",
    workingLabel: "",
  },
];

export function availableSpecialists() {
  return specialists.filter(
    (s): s is Specialist & { run: NonNullable<Specialist["run"]> } =>
      Boolean(s.run),
  );
}

export function plannedSpecialists() {
  return specialists.filter((s) => !s.run);
}

export function delegationToolName(specialist: Specialist) {
  return `deleguer_${specialist.id.replace(/[^a-z0-9]/g, "_")}`;
}
