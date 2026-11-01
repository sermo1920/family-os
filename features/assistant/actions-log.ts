/**
 * Deterministic journal of what the agents actually changed in the database
 * during one conversation turn. Written by the tool code (never by the
 * model), stored on the assistant message and displayed under the reply:
 * the user can always tell what was proposed, saved or not done, whatever
 * the model wrote in its answer.
 */

export type ActionKind =
  "recipe" | "meal_plan" | "shopping_list" | "preference" | "pantry";

export interface AgentAction {
  kind: ActionKind;
  /** Short French sentence shown to the user ("Menu proposé : ..."). */
  summary: string;
  /** In-app page where the change can be seen. */
  href?: string;
}

export class ActionLog {
  readonly entries: AgentAction[] = [];

  record(action: AgentAction) {
    this.entries.push(action);
  }

  since(index: number): AgentAction[] {
    return this.entries.slice(index);
  }
}

export function isAgentActionList(value: unknown): value is AgentAction[] {
  return (
    Array.isArray(value) &&
    value.every(
      (entry) =>
        typeof entry === "object" &&
        entry !== null &&
        typeof (entry as AgentAction).summary === "string",
    )
  );
}
