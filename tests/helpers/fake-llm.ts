import type Anthropic from "@anthropic-ai/sdk";
import type { CreateMessageParams, LlmClient } from "@/features/assistant/llm";

/**
 * Scripted stand-in for the Anthropic API, used by tests only: each agent
 * (picked by a substring of its system prompt) replays a queue of steps.
 * A step builds the assistant content from the request it receives, so a
 * step can reuse ids returned by earlier tool results.
 */

type Block = Anthropic.Beta.BetaContentBlock;
export type ScriptStep =
  Block[] | ((params: CreateMessageParams) => Block[]) | Error;

export function text(value: string): Block {
  return { type: "text", text: value, citations: null } as Block;
}

let toolUseCounter = 0;
export function toolUse(name: string, input: Record<string, unknown>): Block {
  toolUseCounter += 1;
  return {
    type: "tool_use",
    id: `toolu_${toolUseCounter}`,
    name,
    input,
  } as Block;
}

/** JSON results of the tool calls answered in the latest user message. */
export function lastToolResults(params: CreateMessageParams): unknown[] {
  const last = params.messages[params.messages.length - 1];
  if (!Array.isArray(last.content)) return [];
  const blocks = last.content as Anthropic.Beta.BetaContentBlockParam[];
  return blocks
    .flatMap((b) => (b.type === "tool_result" ? [b] : []))
    .map((b) => {
      try {
        return JSON.parse(String(b.content));
      } catch {
        return b.content;
      }
    });
}

export class FakeLlm implements LlmClient {
  readonly calls: { agent: string; params: CreateMessageParams }[] = [];

  constructor(private scripts: Record<string, ScriptStep[]>) {}

  async createMessage(
    params: CreateMessageParams,
  ): Promise<Anthropic.Beta.BetaMessage> {
    const agent = Object.keys(this.scripts).find((key) =>
      params.system.includes(key),
    );
    if (!agent) throw new Error("No script for this system prompt");
    // Snapshot: the loop keeps appending to the same messages array.
    this.calls.push({
      agent,
      params: { ...params, messages: [...params.messages] },
    });
    const step = this.scripts[agent].shift();
    if (!step) throw new Error(`Script exhausted for ${agent}`);
    if (step instanceof Error) throw step;
    const content = typeof step === "function" ? step(params) : step;
    return {
      id: `msg_${this.calls.length}`,
      type: "message",
      role: "assistant",
      model: "fake",
      content,
      stop_reason: content.some((b) => b.type === "tool_use")
        ? "tool_use"
        : "end_turn",
      stop_sequence: null,
      usage: { input_tokens: 0, output_tokens: 0 },
    } as unknown as Anthropic.Beta.BetaMessage;
  }
}
