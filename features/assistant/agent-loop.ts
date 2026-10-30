import Anthropic from "@anthropic-ai/sdk";
import {
  AiNotConfiguredError,
  type Effort,
  type LlmClient,
} from "@/features/assistant/llm";
import {
  toApiTool,
  ToolInputError,
  type AgentTool,
} from "@/features/assistant/tool";

/**
 * Minimal manual tool loop shared by the coordinator and the specialists.
 * Kept explicit (rather than the SDK's beta tool runner) to enforce a hard
 * cap on iterations and to run tools sequentially: they write to the
 * database, and ordering must stay predictable.
 */

export interface ToolLoopOptions {
  client: LlmClient;
  system: string;
  userMessage: string;
  history?: Anthropic.Beta.BetaMessageParam[];
  tools: AgentTool[];
  effort: Effort;
  /** Max model calls; the last one is forced to answer without tools. */
  maxIterations: number;
  onToolCall?: (toolName: string) => void;
}

export interface ToolLoopResult {
  text: string;
  refused: boolean;
  limitReached: boolean;
  toolCalls: number;
}

function extractText(message: Anthropic.Beta.BetaMessage): string {
  return message.content
    .filter(
      (block): block is Anthropic.Beta.BetaTextBlock => block.type === "text",
    )
    .map((block) => block.text)
    .join("\n")
    .trim();
}

async function runTool(
  tool: AgentTool | undefined,
  block: Anthropic.Beta.BetaToolUseBlock,
): Promise<Anthropic.Beta.BetaToolResultBlockParam> {
  if (!tool) {
    return {
      type: "tool_result",
      tool_use_id: block.id,
      is_error: true,
      content: `Outil inconnu : ${block.name}`,
    };
  }
  const parsed = tool.schema.safeParse(block.input);
  if (!parsed.success) {
    return {
      type: "tool_result",
      tool_use_id: block.id,
      is_error: true,
      content: `Paramètres invalides : ${parsed.error.issues
        .map(
          (issue) => `${issue.path.join(".") || "(racine)"} ${issue.message}`,
        )
        .join("; ")}`,
    };
  }
  try {
    const result = await tool.run(parsed.data);
    return {
      type: "tool_result",
      tool_use_id: block.id,
      content: JSON.stringify(result),
    };
  } catch (error) {
    // An AI provider failure inside a delegated specialist aborts the whole
    // turn (the user gets a clear message) instead of being handed to the
    // coordinator as a mere tool error it would try to work around.
    if (
      error instanceof Anthropic.AnthropicError ||
      error instanceof AiNotConfiguredError
    ) {
      throw error;
    }
    // Business errors are given back to the model so it can adapt; anything
    // else is reported generically (no stack traces or internals sent out).
    const message =
      error instanceof ToolInputError
        ? error.message
        : "Erreur interne lors de l'exécution de cet outil.";
    if (!(error instanceof ToolInputError)) {
      console.error(`[agent] tool ${block.name} failed`, error);
    }
    return {
      type: "tool_result",
      tool_use_id: block.id,
      is_error: true,
      content: message,
    };
  }
}

export async function runToolLoop(
  options: ToolLoopOptions,
): Promise<ToolLoopResult> {
  const toolsByName = new Map(options.tools.map((tool) => [tool.name, tool]));
  const apiTools = options.tools.map(toApiTool);
  const messages: Anthropic.Beta.BetaMessageParam[] = [
    ...(options.history ?? []),
    { role: "user", content: options.userMessage },
  ];
  let toolCalls = 0;

  for (let iteration = 1; iteration <= options.maxIterations; iteration++) {
    const isLast = iteration === options.maxIterations;
    const response = await options.client.createMessage({
      system: options.system,
      messages,
      tools: apiTools,
      effort: options.effort,
      toolChoice: isLast ? "none" : "auto",
    });

    if (response.stop_reason === "refusal") {
      return {
        text: extractText(response),
        refused: true,
        limitReached: false,
        toolCalls,
      };
    }

    const toolUses = response.content.filter(
      (block): block is Anthropic.Beta.BetaToolUseBlock =>
        block.type === "tool_use",
    );
    // Content is appended verbatim (thinking / fallback blocks included) so
    // the next request in this loop stays valid.
    messages.push({ role: "assistant", content: response.content });

    if (response.stop_reason !== "tool_use" || toolUses.length === 0) {
      return {
        text: extractText(response),
        refused: false,
        limitReached: false,
        toolCalls,
      };
    }

    const results: Anthropic.Beta.BetaToolResultBlockParam[] = [];
    for (const block of toolUses) {
      toolCalls += 1;
      options.onToolCall?.(block.name);
      results.push(await runTool(toolsByName.get(block.name), block));
    }
    // All results of one assistant turn go back in a single user message.
    const nextIsLast = iteration + 1 === options.maxIterations;
    messages.push({
      role: "user",
      content: nextIsLast
        ? [
            ...results,
            {
              type: "text",
              text: "Limite d'étapes atteinte : n'appelle plus d'outil et rédige maintenant ta réponse à partir de ce qui a été fait.",
            },
          ]
        : results,
    });
  }

  return { text: "", refused: false, limitReached: true, toolCalls };
}
