import { z } from "zod";
import type Anthropic from "@anthropic-ai/sdk";

/**
 * A business tool exposed to an agent: a zod schema (single source for the
 * JSON schema sent to the model AND for validating what the model sends
 * back) and a deterministic implementation.
 */
export interface AgentTool<Schema extends z.ZodType = z.ZodType> {
  name: string;
  description: string;
  schema: Schema;
  run(input: z.infer<Schema>): Promise<unknown>;
}

export function defineTool<Schema extends z.ZodType>(
  tool: AgentTool<Schema>,
): AgentTool<Schema> {
  return tool;
}

export function toApiTool(tool: AgentTool): Anthropic.Beta.BetaTool {
  const jsonSchema = z.toJSONSchema(tool.schema, { io: "input" }) as Record<
    string,
    unknown
  >;
  delete jsonSchema.$schema;
  return {
    name: tool.name,
    description: tool.description,
    input_schema: jsonSchema as Anthropic.Beta.BetaTool.InputSchema,
  };
}

/** Error returned to the model as a tool result (it can correct and retry). */
export class ToolInputError extends Error {}
