// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { Chat } from "@/features/assistant/components/chat";

const replace = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace, refresh: vi.fn() }),
}));

function ndjsonResponse(events: object[]) {
  const body = new ReadableStream({
    start(controller) {
      for (const event of events) {
        controller.enqueue(
          new TextEncoder().encode(`${JSON.stringify(event)}\n`),
        );
      }
      controller.close();
    },
  });
  return new Response(body, { status: 200 });
}

afterEach(() => cleanup());

beforeEach(() => {
  Element.prototype.scrollIntoView = vi.fn();
  replace.mockClear();
});

describe("Chat", () => {
  it("shows the reply and the saved actions journal", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        ndjsonResponse([
          { type: "conversation", id: "c1" },
          { type: "status", text: "L'agent cuisine travaille…" },
          {
            type: "done",
            conversationId: "c1",
            message: {
              id: "m2",
              role: "ASSISTANT",
              content: "Voici le menu proposé.",
              actions: [
                {
                  kind: "meal_plan",
                  summary: "Repas proposé (à valider) — lundi",
                  href: "/planner",
                },
              ],
              isError: false,
              createdAt: new Date().toISOString(),
            },
          },
        ]),
      ),
    );
    render(<Chat initialMessages={[]} />);
    fireEvent.change(screen.getByLabelText("Message pour l'assistant"), {
      target: { value: "Propose un menu" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Envoyer/ }));

    expect(
      await screen.findByText("Voici le menu proposé."),
    ).toBeInTheDocument();
    expect(screen.getByText("Propose un menu")).toBeInTheDocument();
    expect(
      screen.getByText("Enregistré dans l'application"),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Repas proposé/ })).toHaveAttribute(
      "href",
      "/planner",
    );
    await waitFor(() =>
      expect(replace).toHaveBeenCalledWith("/assistant?c=c1", {
        scroll: false,
      }),
    );
  });

  it("shows a clear error and gives the text back when the server refuses", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json(
          { error: "L'assistant IA n'est pas configuré." },
          { status: 503 },
        ),
      ),
    );
    render(<Chat initialMessages={[]} />);
    const input = screen.getByLabelText("Message pour l'assistant");
    fireEvent.change(input, { target: { value: "Bonjour" } });
    fireEvent.click(screen.getByRole("button", { name: /Envoyer/ }));

    expect(await screen.findByRole("alert")).toHaveTextContent("pas configuré");
    expect(input).toHaveValue("Bonjour");
  });
});
