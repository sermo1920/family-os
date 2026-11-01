import Anthropic from "@anthropic-ai/sdk";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import {
  runConversationTurn,
  getConversation,
} from "@/features/assistant/conversation";
import { getRecipeDetail, searchRecipes } from "@/features/recipes/service";
import { listPreferences } from "@/features/preferences/service";
import { setPantryItem } from "@/features/pantry/service";
import { validateMeals } from "@/features/meal-plan/service";
import {
  addManualListItem,
  syncShoppingList,
} from "@/features/shopping-list/service";
import {
  FakeLlm,
  lastToolResults,
  text,
  toolUse,
} from "@/tests/helpers/fake-llm";

/**
 * End-to-end path with a real database and a scripted model:
 * user → coordinator → cooking agent → business tools → DB → answer.
 * Covers the verification list of the feature (recipes persisted, constrained
 * planning, single-meal change, 2→4 servings, grouped list, idempotent
 * re-sync, manual items preserved, preferences across sessions, AI errors).
 */

const COORDINATOR = "Tu es l'assistant central";
const COOKING = "Tu es l'agent cuisine";
const NOW = new Date("2026-10-29T10:00:00Z"); // Thursday
const MON = "2026-11-02";
const TUE = "2026-11-03";
const WED = "2026-11-04";
const THU = "2026-11-05";

let member: { id: string; householdId: string };
let conversationId: string;
const recipeIds: Record<string, string> = {};

function delegate(demande: string) {
  return [toolUse("deleguer_cuisine", { demande })];
}

beforeAll(async () => {
  const household = await prisma.household.create({
    data: {
      name: "Foyer test",
      members: {
        create: [
          {
            displayName: "Alex",
            role: "OWNER",
            linkedUserId: `test-${Date.now()}`,
          },
          { displayName: "Sam", role: "ADULT" },
        ],
      },
    },
    include: { members: true },
  });
  member = { id: household.members[0].id, householdId: household.id };
});

afterAll(async () => {
  const householdId = member.householdId;
  await prisma.conversation.deleteMany({ where: { householdId } });
  await prisma.shoppingList.deleteMany({ where: { householdId } });
  await prisma.plannedMeal.deleteMany({ where: { householdId } });
  await prisma.recipe.deleteMany({ where: { householdId } });
  await prisma.pantryItem.deleteMany({ where: { householdId } });
  await prisma.ingredient.deleteMany({ where: { householdId } });
  await prisma.householdPreference.deleteMany({ where: { householdId } });
  await prisma.member.deleteMany({ where: { householdId } });
  await prisma.household.delete({ where: { id: householdId } });
  await prisma.$disconnect();
});

async function mealsByKey() {
  const meals = await prisma.plannedMeal.findMany({
    where: { householdId: member.householdId },
    include: { recipe: true },
  });
  return new Map(
    meals.map((m) => [`${m.date.toISOString().slice(0, 10)}-${m.mealSlot}`, m]),
  );
}

describe("assistant → cooking agent → database", () => {
  it("plans several meals with constraints, creating AI-proposed recipes", async () => {
    const llm = new FakeLlm({
      [COORDINATOR]: [
        delegate(
          `Propose les soupers du lundi ${MON} au jeudi ${THU} pour 2 personnes. Mardi ${TUE} : 20 minutes maximum. Prévoir 4 portions le mercredi pour des restes le jeudi midi.`,
        ),
        (params) => {
          const [result] = lastToolResults(params) as {
            journalDesActions: string[];
          }[];
          return [
            text(
              `Menu proposé (à valider) :\n${result.journalDesActions.join("\n")}`,
            ),
          ];
        },
      ],
      [COOKING]: [
        [
          toolUse("consulter_preferences", {}),
          toolUse("rechercher_recettes", {}),
        ],
        [
          toolUse("enregistrer_recette", {
            nom: "Pâtes au pesto",
            portions: 2,
            tempsPreparationMinutes: 5,
            tempsCuissonMinutes: 12,
            tags: ["QUICK", "VEGETARIAN"],
            etapes: [
              "Cuire les pâtes.",
              "Mélanger avec le pesto et le parmesan.",
            ],
            ingredients: [
              {
                nom: "Pâtes",
                quantite: 200,
                unite: "g",
                categorie: "STARCHES",
              },
              {
                nom: "Pesto",
                quantite: 4,
                unite: "c. à soupe",
                categorie: "SAUCES_CONDIMENTS",
              },
              { nom: "Parmesan", quantite: 30, unite: "g", categorie: "FRESH" },
            ],
          }),
          toolUse("enregistrer_recette", {
            nom: "Poulet aux courgettes",
            portions: 2,
            tempsPreparationMinutes: 15,
            tempsCuissonMinutes: 25,
            etapes: ["Couper.", "Saisir le poulet.", "Ajouter les courgettes."],
            ingredients: [
              { nom: "Poulet", quantite: 0.3, unite: "kg", categorie: "MEAT" },
              {
                nom: "Courgette",
                quantite: 2,
                unite: "pce",
                categorie: "FRUITS_VEGETABLES",
              },
              {
                nom: "Huile d'olive",
                quantite: 1,
                unite: "c. à soupe",
                categorie: "SAVORY_GROCERY",
              },
            ],
          }),
          toolUse("enregistrer_recette", {
            nom: "Curry de lentilles",
            portions: 2,
            tempsPreparationMinutes: 10,
            tempsCuissonMinutes: 25,
            tags: ["VEGETARIAN", "MAKE_AHEAD"],
            etapes: [
              "Faire revenir l'oignon.",
              "Ajouter lentilles et lait de coco.",
            ],
            ingredients: [
              {
                nom: "Lentilles corail",
                quantite: 150,
                unite: "g",
                categorie: "STARCHES",
              },
              {
                nom: "Lait de coco",
                quantite: 2,
                unite: "dl",
                categorie: "CANNED",
              },
              {
                nom: "Oignon",
                quantite: 1,
                unite: "pce",
                categorie: "FRUITS_VEGETABLES",
              },
            ],
          }),
        ],
        (params) => {
          const [pasta, chicken, curry] = lastToolResults(params) as {
            recipeId: string;
          }[];
          recipeIds.pasta = pasta.recipeId;
          recipeIds.chicken = chicken.recipeId;
          recipeIds.curry = curry.recipeId;
          return [
            toolUse("planifier_repas", {
              repas: [
                { date: MON, creneau: "DINNER", recipeId: curry.recipeId },
                {
                  date: TUE,
                  creneau: "DINNER",
                  recipeId: pasta.recipeId,
                  remarques: "20 minutes seulement",
                },
                {
                  date: WED,
                  creneau: "DINNER",
                  recipeId: chicken.recipeId,
                  portions: 4,
                },
                {
                  date: THU,
                  creneau: "LUNCH",
                  recipeId: chicken.recipeId,
                  portions: 2,
                  restesDe: { date: WED, creneau: "DINNER" },
                },
                { date: THU, creneau: "DINNER", recipeId: chicken.recipeId },
              ],
            }),
          ];
        },
        [text("5 repas proposés, 3 recettes créées (à valider).")],
      ],
    });

    const result = await runConversationTurn({
      member,
      text: "Propose les repas de la semaine prochaine pour deux personnes, mardi on a 20 minutes, et des restes de mercredi pour jeudi midi.",
      client: llm,
      now: NOW,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    conversationId = result.conversationId;

    // The coordinator got the calendar computed by code.
    const firstCall = llm.calls[0].params.messages.at(-1)!.content as string;
    expect(firstCall).toContain("Semaine prochaine : lundi 2026-11-02");

    // Journal of what was really written, stored on the message.
    expect(result.message.isError).toBe(false);
    expect(
      result.message.actions.filter((a) => a.kind === "recipe"),
    ).toHaveLength(3);
    expect(
      result.message.actions.filter((a) => a.kind === "meal_plan"),
    ).toHaveLength(5);

    const meals = await mealsByKey();
    expect(meals.size).toBe(5);
    expect([...meals.values()].every((m) => m.status === "PROPOSED")).toBe(
      true,
    );
    expect(meals.get(`${TUE}-DINNER`)?.notes).toBe("20 minutes seulement");
    expect(meals.get(`${WED}-DINNER`)?.portionMultiplier).toBe(2);
    expect(meals.get(`${THU}-LUNCH`)?.leftoverOfId).toBe(
      meals.get(`${WED}-DINNER`)?.id,
    );
  });

  it("1. finds the created recipe again after a reload, flagged as AI-proposed", async () => {
    const found = await searchRecipes(member.householdId, { query: "pesto" });
    expect(found).toHaveLength(1);
    expect(found[0]).toMatchObject({
      name: "Pâtes au pesto",
      status: "AI_PROPOSED",
      totalMinutes: 17,
      tags: ["QUICK", "VEGETARIAN"],
    });
    // Units were converted by code: 0.3 kg → 300 g, 1 c. à soupe → 15 ml.
    const chicken = await getRecipeDetail(
      member.householdId,
      recipeIds.chicken,
    );
    expect(chicken?.ingredients).toEqual(
      expect.arrayContaining([
        { name: "Poulet", quantity: 300, unit: "g" },
        { name: "Huile d'olive", quantity: 15, unit: "ml" },
      ]),
    );
    // Conversation and messages are persisted.
    const conversation = await getConversation(member.id, conversationId);
    expect(conversation?.messages.map((m) => m.role)).toEqual([
      "USER",
      "ASSISTANT",
    ]);
  });

  it("refuses to create the same recipe twice when a request is re-run", async () => {
    const llm = new FakeLlm({
      [COORDINATOR]: [
        delegate("Crée la recette Pâtes au pesto."),
        [text("ok")],
      ],
      [COOKING]: [
        [
          toolUse("enregistrer_recette", {
            nom: "pâtes au pesto",
            portions: 2,
            etapes: ["x"],
            ingredients: [{ nom: "Pâtes", quantite: 200, unite: "g" }],
          }),
        ],
        [text("Elle existait déjà.")],
      ],
    });
    const result = await runConversationTurn({
      member,
      text: "Crée les pâtes au pesto",
      client: llm,
      now: NOW,
    });
    expect(result.ok && result.message.actions).toEqual([]);
    const toolResult = llm.calls
      .find((c) => c.agent === COOKING && c.params.messages.length > 1)!
      .params.messages.at(-1)!.content as {
      is_error?: boolean;
      content: string;
    }[];
    expect(toolResult[0].is_error).toBe(true);
    expect(toolResult[0].content).toContain("existe déjà");
    expect(
      await prisma.recipe.count({ where: { householdId: member.householdId } }),
    ).toBe(3);
  });

  it("4. adapts a recipe from 2 to 4 servings with deterministic quantities", async () => {
    const detail = await getRecipeDetail(
      member.householdId,
      recipeIds.pasta,
      4,
    );
    expect(detail?.ingredients).toEqual([
      { name: "Pâtes", quantity: 400, unit: "g" },
      { name: "Pesto", quantity: 120, unit: "ml" },
      { name: "Parmesan", quantity: 60, unit: "g" },
    ]);
    // Stored recipe untouched.
    const stored = await getRecipeDetail(member.householdId, recipeIds.pasta);
    expect(stored?.servings).toBe(2);
  });

  it("5. generates a grouped shopping list from the validated menu (stock deducted)", async () => {
    await validateMeals(member.householdId, {
      startKey: MON,
      endKeyInclusive: THU,
    });
    await setPantryItem(member.householdId, {
      name: "Courgette",
      quantity: 2,
      unit: "pce",
    });
    await setPantryItem(member.householdId, { name: "Huile d'olive" }); // unknown quantity

    const llm = new FakeLlm({
      [COORDINATOR]: [
        delegate(
          `Ajoute les ingrédients manquants du menu du ${MON} au ${THU} à la liste Migros.`,
        ),
        [text("Liste Migros mise à jour.")],
      ],
      [COOKING]: [
        [
          toolUse("synchroniser_liste_courses", {
            nomListe: "Migros",
            du: MON,
            au: THU,
            appliquer: true,
            creerSiAbsente: true,
          }),
        ],
        [text("Liste Migros créée et remplie.")],
      ],
    });
    const result = await runConversationTurn({
      member,
      conversationId,
      text: "Ajoute les ingrédients manquants à la liste Migros.",
      client: llm,
      now: NOW,
    });
    expect(result.ok && result.message.actions.map((a) => a.summary)).toEqual([
      "Liste de courses créée : Migros",
      expect.stringContaining("Liste « Migros » synchronisée"),
    ]);

    const list = await prisma.shoppingList.findFirstOrThrow({
      where: { householdId: member.householdId, name: "Migros" },
      include: { items: true },
    });
    const byName = new Map(list.items.map((i) => [i.name, i]));
    // Chicken used by two meals (Wed 4 servings + Thu dinner 2) → one line,
    // the leftover lunch is not bought twice: 600 + 300 g.
    expect(byName.get("Poulet")?.quantity).toBe(900);
    expect(list.items.filter((i) => i.name === "Poulet")).toHaveLength(1);
    // 4 + 2 courgettes needed, 2 in stock.
    expect(byName.get("Courgette")?.quantity).toBe(4);
    // Unknown stock is never assumed: oil still on the list.
    expect(byName.get("Huile d'olive")?.quantity).toBe(45);
    expect(list.items.every((i) => i.source === "MEAL_PLAN")).toBe(true);
  });

  it("6. re-running the generation creates no duplicate", async () => {
    const list = await prisma.shoppingList.findFirstOrThrow({
      where: { householdId: member.householdId, name: "Migros" },
      include: { items: true },
    });
    const before = list.items.map((i) => [i.name, i.quantity]).sort();
    const rerun = await syncShoppingList(member.householdId, list.id, {
      apply: true,
    });
    expect(rerun.ok && rerun.applied).toBe(false);
    const after = await prisma.shoppingListItem.findMany({
      where: { shoppingListId: list.id },
    });
    expect(after.map((i) => [i.name, i.quantity]).sort()).toEqual(before);
  });

  it("3 + 7. replaces only Thursday's dinner, then re-syncs keeping manual and bought items", async () => {
    const list = await prisma.shoppingList.findFirstOrThrow({
      where: { householdId: member.householdId, name: "Migros" },
      include: { items: true },
    });
    await addManualListItem(member.householdId, list.id, {
      name: "Papier toilette",
      quantity: 1,
      unit: "PACK",
      category: "HOME_GARDEN",
    });
    const pasta = list.items.find((i) => i.name === "Pâtes")!;
    await prisma.shoppingListItem.update({
      where: { id: pasta.id },
      data: { isChecked: true },
    });

    const before = await mealsByKey();

    const llm = new FakeLlm({
      [COORDINATOR]: [
        (params) => {
          // Previous turns and their action journal are in the history.
          const history = JSON.stringify(params.messages);
          expect(history).toContain("Repas proposé (à valider)");
          return delegate(
            `Remplace uniquement le souper du jeudi ${THU} par une recette végétarienne, puis mets à jour la liste Migros.`,
          );
        },
        [text("Jeudi soir remplacé par le curry de lentilles, liste ajustée.")],
      ],
      [COOKING]: [
        [toolUse("rechercher_recettes", { tags: ["VEGETARIAN"] })],
        // Without the explicit flag a validated meal is protected.
        [
          toolUse("planifier_repas", {
            repas: [
              { date: THU, creneau: "DINNER", recipeId: recipeIds.curry },
            ],
          }),
        ],
        (params) => {
          const [outcomes] = lastToolResults(params) as { ok: boolean }[][];
          expect(outcomes[0].ok).toBe(false);
          return [
            toolUse("planifier_repas", {
              repas: [
                {
                  date: THU,
                  creneau: "DINNER",
                  recipeId: recipeIds.curry,
                  remplacerRepasValide: true,
                },
              ],
            }),
          ];
        },
        [
          toolUse("synchroniser_liste_courses", {
            nomListe: "Migros",
            appliquer: false,
          }),
        ],
        (params) => {
          const [preview] = lastToolResults(params) as {
            retraits: string[];
            ajustements: string[];
          }[];
          expect(preview.ajustements).toEqual(
            expect.arrayContaining([
              expect.stringContaining("Poulet 900 g → 600 g"),
            ]),
          );
          return [toolUse("valider_menu", { du: THU, au: THU })];
        },
        [
          toolUse("synchroniser_liste_courses", {
            nomListe: "Migros",
            appliquer: true,
          }),
        ],
        [text("Fait.")],
      ],
    });

    const result = await runConversationTurn({
      member,
      conversationId,
      text: "Remplace le repas de jeudi par quelque chose de végétarien et mets la liste à jour.",
      client: llm,
      now: NOW,
    });
    expect(result.ok).toBe(true);

    const after = await mealsByKey();
    expect(after.get(`${THU}-DINNER`)?.recipeId).toBe(recipeIds.curry);
    for (const key of [
      `${MON}-DINNER`,
      `${TUE}-DINNER`,
      `${WED}-DINNER`,
      `${THU}-LUNCH`,
    ]) {
      expect(after.get(key)?.recipeId).toBe(before.get(key)?.recipeId);
      expect(after.get(key)?.status).toBe("VALIDATED");
      expect(after.get(key)?.id).toBe(before.get(key)?.id);
    }

    const items = await prisma.shoppingListItem.findMany({
      where: { shoppingListId: list.id },
    });
    const byName = new Map(items.map((i) => [i.name, i]));
    expect(byName.get("Papier toilette")).toMatchObject({
      source: "MANUAL",
      quantity: 1,
    });
    expect(byName.get("Pâtes")).toMatchObject({
      isChecked: true,
      quantity: 200,
    });
    expect(byName.get("Poulet")?.quantity).toBe(600);
    // Curry now twice (Mon + Thu): lentils 300 g, still a single line.
    expect(items.filter((i) => i.name === "Lentilles corail")).toHaveLength(1);
    expect(byName.get("Lentilles corail")?.quantity).toBe(300);
  });

  it("8. finds confirmed preferences again in a new session", async () => {
    const first = new FakeLlm({
      [COORDINATOR]: [
        delegate("Enregistre la préférence durable : pas de porc."),
        [text("C'est noté.")],
      ],
      [COOKING]: [
        [
          toolUse("enregistrer_preference", {
            kind: "EXCLUSION",
            texte: "Pas de porc",
          }),
        ],
        [text("Préférence enregistrée.")],
      ],
    });
    await runConversationTurn({
      member,
      text: "Retiens qu'on ne mange pas de porc.",
      client: first,
      now: NOW,
    });

    // New conversation: nothing from the previous chat in the history.
    const second = new FakeLlm({
      [COORDINATOR]: [
        (params) => {
          expect(params.messages).toHaveLength(1);
          return delegate("Propose un souper pour ce soir.");
        },
        [text("ok")],
      ],
      [COOKING]: [
        [toolUse("consulter_preferences", {})],
        (params) => {
          const [prefs] = lastToolResults(params) as {
            memberCount: number;
            preferences: { texte: string }[];
            members: Record<string, unknown>[];
          }[];
          expect(prefs.memberCount).toBe(2);
          expect(prefs.preferences.map((p) => p.texte)).toContain(
            "Pas de porc",
          );
          // Only what the agent needs: no e-mail or body data.
          expect(Object.keys(prefs.members[0]).sort()).toEqual([
            "isChild",
            "name",
          ]);
          return [text("Pas de porc, noté.")];
        },
      ],
    });
    const result = await runConversationTurn({
      member,
      text: "Que mange-t-on ce soir ?",
      client: second,
      now: NOW,
    });
    expect(result.ok && result.conversationId).not.toBe(conversationId);
    expect(
      (await listPreferences(member.householdId)).map((p) => p.text),
    ).toEqual(["Pas de porc"]);
  });

  it("9. reports an AI API error clearly, including writes done before it", async () => {
    const llm = new FakeLlm({
      [COORDINATOR]: [
        delegate("Il reste 300 g de poulet, note-le et propose une recette."),
      ],
      [COOKING]: [
        [
          toolUse("mettre_a_jour_stock", {
            nom: "Poulet",
            quantite: 300,
            unite: "g",
          }),
        ],
        new Anthropic.RateLimitError(
          429,
          undefined,
          "rate limited",
          new Headers(),
        ),
      ],
    });
    const result = await runConversationTurn({
      member,
      text: "Il reste du poulet, que peut-on préparer ?",
      client: llm,
      now: NOW,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.message.isError).toBe(true);
    expect(result.message.content).toContain("Trop de demandes");
    expect(result.message.content).toContain(
      "certaines modifications ont déjà été enregistrées",
    );
    expect(result.message.actions.map((a) => a.summary)).toEqual([
      "Stock mis à jour : Poulet — 300 g",
    ]);

    const offline = new FakeLlm({
      [COORDINATOR]: [new Anthropic.APIConnectionError({ message: "offline" })],
    });
    const failed = await runConversationTurn({
      member,
      text: "Bonjour",
      client: offline,
      now: NOW,
    });
    expect(failed.ok && failed.message.content).toBe(
      "Impossible de joindre le service IA (problème réseau). Réessaie dans un instant. Aucune modification n'a été enregistrée.",
    );
    // The error is stored in the conversation like any answer.
    if (failed.ok) {
      const stored = await getConversation(member.id, failed.conversationId);
      expect(stored?.messages.at(-1)?.isError).toBe(true);
    }
  });

  it("caps delegations per message (no delegation loop)", async () => {
    const llm = new FakeLlm({
      [COORDINATOR]: [
        delegate("a"),
        delegate("b"),
        delegate("c"),
        (params) => {
          const last = params.messages.at(-1)!.content as {
            is_error?: boolean;
          }[];
          expect(last[0].is_error).toBe(true);
          return [text("fin")];
        },
      ],
      [COOKING]: [[text("rapport a")], [text("rapport b")]],
    });
    const result = await runConversationTurn({
      member,
      text: "x",
      client: llm,
      now: NOW,
    });
    expect(result.ok && result.message.content).toBe("fin");
    // The third delegation never reached the cooking agent.
    expect(llm.calls.filter((c) => c.agent === COOKING)).toHaveLength(2);
  });
});
