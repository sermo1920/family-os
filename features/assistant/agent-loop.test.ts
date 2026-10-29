import { describe, expect, it } from "vitest";
import { z } from "zod";
import { runToolLoop } from "@/features/assistant/agent-loop";
import {
  defineTool,
  ToolInputError,
  toApiTool,
} from "@/features/assistant/tool";
import {
  FakeLlm,
  lastToolResults,
  text,
  toolUse,
} from "@/tests/helpers/fake-llm";

const echo = defineTool({
  name: "echo",
  description: "Echo",
  schema: z.object({ value: z.number() }),
  async run({ value }) {
    if (value < 0) throw new ToolInputError("négatif");
    return { doubled: value * 2 };
  },
});

describe("runToolLoop", () => {
  it("runs tools and returns the final text", async () => {
    const llm = new FakeLlm({
      SYS: [
        [toolUse("echo", { value: 2 })],
        (params) => [text(JSON.stringify(lastToolResults(params)))],
      ],
    });
    const result = await runToolLoop({
      client: llm,
      system: "SYS",
      userMessage: "go",
      tools: [echo],
      effort: "low",
      maxIterations: 5,
    });
    expect(result.text).toBe('[{"doubled":4}]');
    expect(result.toolCalls).toBe(1);
  });

  it("returns invalid input and business errors to the model as tool errors", async () => {
    const llm = new FakeLlm({
      SYS: [
        [toolUse("echo", { value: "x" }), toolUse("echo", { value: -1 })],
        [text("ok")],
      ],
    });
    await runToolLoop({
      client: llm,
      system: "SYS",
      userMessage: "go",
      tools: [echo],
      effort: "low",
      maxIterations: 5,
    });
    const results = llm.calls[1].params.messages.at(-1)!.content as {
      is_error?: boolean;
      content: string;
    }[];
    expect(results).toHaveLength(2);
    expect(results.every((r) => r.is_error)).toBe(true);
    expect(results[1].content).toBe("négatif");
  });

  it("forces a text answer on the last allowed iteration", async () => {
    const llm = new FakeLlm({
      SYS: [
        [toolUse("echo", { value: 1 })],
        [toolUse("echo", { value: 1 })],
        [text("fini")],
      ],
    });
    const result = await runToolLoop({
      client: llm,
      system: "SYS",
      userMessage: "go",
      tools: [echo],
      effort: "low",
      maxIterations: 3,
    });
    expect(result.text).toBe("fini");
    expect(llm.calls[2].params.toolChoice).toBe("none");
  });

  it("propagates API errors to the caller", async () => {
    const llm = new FakeLlm({ SYS: [new Error("boom")] });
    await expect(
      runToolLoop({
        client: llm,
        system: "SYS",
        userMessage: "go",
        tools: [echo],
        effort: "low",
        maxIterations: 3,
      }),
    ).rejects.toThrow("boom");
  });
});

describe("toApiTool", () => {
  it("derives the JSON schema from the zod schema", () => {
    expect(toApiTool(echo).input_schema).toEqual({
      type: "object",
      properties: { value: { type: "number" } },
      required: ["value"],
    });
  });
});
