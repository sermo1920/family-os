import { z } from "zod";
import {
  defineTool,
  ToolInputError,
  type AgentTool,
} from "@/features/assistant/tool";
import type { ActionLog } from "@/features/assistant/actions-log";
import {
  categoryLabels,
  ingredientSchema,
  shortUnitLabels,
} from "@/features/ingredients/schema";
import {
  ACCEPTED_UNIT_HINT,
  normalizeQuantity,
} from "@/features/ingredients/units";
import { mealSlots } from "@/features/meal-plan/schema";
import { recipeTags } from "@/features/recipes/schema";
import {
  preferenceKinds,
  preferenceKindLabels,
} from "@/features/preferences/schema";
import {
  formatQuantity,
  getRecipeDetail,
  saveRecipeFromAgent,
  searchRecipes,
  updateRecipeFeedback,
} from "@/features/recipes/service";
import {
  dateFromKey,
  findMealAt,
  getMenu,
  markMealPrepared,
  planMeals,
  removeMealAt,
  validateMeals,
} from "@/features/meal-plan/service";
import {
  addManualListItem,
  computeNeeds,
  findOrCreateShoppingList,
  findShoppingList,
  listShoppingListsSummary,
  syncShoppingList,
} from "@/features/shopping-list/service";
import {
  addPreference,
  deletePreference,
  getHouseholdComposition,
  listPreferences,
} from "@/features/preferences/service";
import {
  listPantry,
  removePantryItem,
  setPantryItem,
} from "@/features/pantry/service";

/**
 * Business tools of the cooking agent. Each one is a thin, deterministic
 * wrapper over a service function scoped to the authenticated household;
 * every write is recorded in the ActionLog shown to the user.
 */

const dateKey = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .describe("Date au format AAAA-MM-JJ (voir le calendrier fourni)");
const slot = z
  .enum(mealSlots)
  .describe(
    "Créneau : BREAKFAST = déjeuner (matin), LUNCH = dîner (midi), DINNER = souper (soir)",
  );
const category = ingredientSchema.shape.category.describe(
  `Rayon : ${Object.entries(categoryLabels)
    .map(([value, label]) => `${value} (${label})`)
    .join(", ")}`,
);
const unit = z.string().describe(`Unité : ${ACCEPTED_UNIT_HINT}`);

function rangeOf(du: string, au: string) {
  if (dateFromKey(au) < dateFromKey(du)) {
    throw new ToolInputError(
      "La date de fin doit être après la date de début.",
    );
  }
  return { startKey: du, endKeyInclusive: au };
}

function plannerHref(date: string) {
  return `/planner?week=${date}`;
}

export function createCookingTools(
  householdId: string,
  log: ActionLog,
): AgentTool[] {
  return [
    // ---- Préférences -------------------------------------------------
    defineTool({
      name: "consulter_preferences",
      description:
        "Préférences confirmées du foyer (goûts, exclusions, contraintes, budget indicatif) et composition du foyer (prénoms, enfant/adulte). À consulter avant de proposer un menu ou une recette.",
      schema: z.object({}),
      async run() {
        const [composition, preferences] = await Promise.all([
          getHouseholdComposition(householdId),
          listPreferences(householdId),
        ]);
        return {
          ...composition,
          preferences: preferences.map((p) => ({
            id: p.id,
            type: preferenceKindLabels[p.kind],
            kind: p.kind,
            texte: p.text,
          })),
        };
      },
    }),
    defineTool({
      name: "enregistrer_preference",
      description:
        "Enregistre une préférence DURABLE que l'utilisateur a confirmée (ex : « on ne mange pas de porc », « retiens que Julie n'aime pas les champignons »). Ne pas utiliser pour une contrainte ponctuelle (ex : « mardi on a 20 minutes ») : la noter plutôt dans les remarques du repas.",
      schema: z.object({
        kind: z.enum(preferenceKinds),
        texte: z.string().min(1).max(300),
      }),
      async run({ kind, texte }) {
        const { preference, created } = await addPreference(
          householdId,
          kind,
          texte,
        );
        if (created) {
          log.record({
            kind: "preference",
            summary: `Préférence enregistrée (${preferenceKindLabels[kind]}) : ${preference.text}`,
            href: "/preferences",
          });
        }
        return { id: preference.id, dejaPresente: !created };
      },
    }),
    defineTool({
      name: "supprimer_preference",
      description:
        "Supprime une préférence enregistrée (sur demande explicite).",
      schema: z.object({ preferenceId: z.string() }),
      async run({ preferenceId }) {
        const removed = await deletePreference(householdId, preferenceId);
        if (!removed) throw new ToolInputError("Préférence introuvable.");
        log.record({
          kind: "preference",
          summary: `Préférence supprimée : ${removed.text}`,
          href: "/preferences",
        });
        return { ok: true };
      },
    }),

    // ---- Recettes ----------------------------------------------------
    defineTool({
      name: "rechercher_recettes",
      description:
        "Recherche dans les recettes du foyer (par nom ou ingrédient, catégories, temps total max). Toujours chercher avant de créer une nouvelle recette, pour réutiliser l'existant.",
      schema: z.object({
        texte: z.string().optional().describe("Mot du nom ou d'un ingrédient"),
        tags: z.array(z.enum(recipeTags)).optional(),
        tempsTotalMaxMinutes: z.number().int().positive().optional(),
        statut: z.enum(["AI_PROPOSED", "VALIDATED"]).optional(),
      }),
      async run(input) {
        return searchRecipes(householdId, {
          query: input.texte,
          tags: input.tags,
          maxTotalMinutes: input.tempsTotalMaxMinutes,
          status: input.statut,
        });
      },
    }),
    defineTool({
      name: "consulter_recette",
      description:
        "Détail d'une recette (ingrédients, étapes, temps). Avec `portions`, les quantités sont recalculées par le code pour ce nombre de portions.",
      schema: z.object({
        recipeId: z.string(),
        portions: z.number().int().positive().max(50).optional(),
      }),
      async run({ recipeId, portions }) {
        const detail = await getRecipeDetail(householdId, recipeId, portions);
        if (!detail) throw new ToolInputError("Recette introuvable.");
        return detail;
      },
    }),
    defineTool({
      name: "enregistrer_recette",
      description: `Crée une recette (statut « proposée par l'IA », à valider par le foyer) ou, avec recipeId, modifie une recette existante. Les quantités sont pour le nombre de portions indiqué. Ingrédients : nom simple au singulier (« Oignon », « Crème entière »), quantité numérique et unité parmi : ${ACCEPTED_UNIT_HINT}. Un ingrédient déjà au catalogue doit garder son unité (l'outil le signale sinon). N'invente aucune valeur nutritionnelle ni prix.`,
      schema: z.object({
        recipeId: z.string().optional(),
        nom: z.string().min(1).max(100),
        portions: z.number().int().positive().max(50),
        tempsPreparationMinutes: z.number().int().nonnegative().optional(),
        tempsCuissonMinutes: z.number().int().nonnegative().optional(),
        tags: z.array(z.enum(recipeTags)).optional(),
        etapes: z.array(z.string().min(1)).min(1).max(30),
        ingredients: z
          .array(
            z.object({
              nom: z.string().min(1).max(100),
              quantite: z.number().positive(),
              unite: unit,
              categorie: category.optional(),
            }),
          )
          .min(1)
          .max(40),
        remarques: z.string().max(1000).optional(),
      }),
      async run(input) {
        const result = await saveRecipeFromAgent(householdId, {
          recipeId: input.recipeId,
          name: input.nom,
          servings: input.portions,
          prepTimeMinutes: input.tempsPreparationMinutes,
          cookTimeMinutes: input.tempsCuissonMinutes,
          tags: input.tags,
          steps: input.etapes,
          notes: input.remarques,
          ingredients: input.ingredients.map((i) => ({
            name: i.nom,
            quantity: i.quantite,
            unit: i.unite,
            category: i.categorie,
          })),
        });
        if (!result.ok) throw new ToolInputError(result.error);
        log.record({
          kind: "recipe",
          summary: result.created
            ? `Recette créée (proposée par l'IA, à valider) : ${result.name}`
            : `Recette modifiée : ${result.name}`,
          href: "/ingredients",
        });
        return {
          recipeId: result.recipeId,
          creee: result.created,
          statut: result.status,
          nouveauxIngredientsAuCatalogue: result.createdIngredients,
        };
      },
    }),
    defineTool({
      name: "evaluer_recette",
      description:
        "Enregistre l'appréciation du foyer sur une recette (note 1 à 5, remarques/modifications souhaitées) et/ou la marque comme validée — uniquement sur demande de l'utilisateur.",
      schema: z.object({
        recipeId: z.string(),
        note: z.number().int().min(1).max(5).optional(),
        remarques: z.string().max(1000).optional(),
        valider: z.boolean().optional(),
      }),
      async run({ recipeId, note, remarques, valider }) {
        const recipe = await updateRecipeFeedback(householdId, recipeId, {
          rating: note,
          notes: remarques,
          validate: valider,
        });
        if (!recipe) throw new ToolInputError("Recette introuvable.");
        const parts = [
          note !== undefined ? `note ${note}/5` : null,
          remarques ? "remarques" : null,
          valider ? "validée" : null,
        ].filter(Boolean);
        log.record({
          kind: "recipe",
          summary: `Recette « ${recipe.name} » mise à jour : ${parts.join(", ")}`,
          href: "/ingredients",
        });
        return { ok: true, statut: recipe.status };
      },
    }),

    // ---- Menu --------------------------------------------------------
    defineTool({
      name: "consulter_menu",
      description:
        "Repas planifiés entre deux dates incluses : créneau, recette, portions, statut (PROPOSED = proposé, VALIDATED = validé), restes, préparé ou non.",
      schema: z.object({ du: dateKey, au: dateKey }),
      async run({ du, au }) {
        rangeOf(du, au);
        return getMenu(householdId, du, au);
      },
    }),
    defineTool({
      name: "planifier_repas",
      description:
        "Pose un ou plusieurs repas au planning, en statut « proposé ». Un seul repas par jour et créneau : seuls les créneaux passés sont modifiés, le reste du menu est conservé. Pour des restes : planifie le repas source avec les portions supplémentaires, puis le repas de restes avec `restesDe` (même recette ; ses ingrédients ne seront pas achetés deux fois). Un repas déjà validé n'est remplacé que si `remplacerRepasValide` est vrai (uniquement si l'utilisateur a demandé ce remplacement).",
      schema: z.object({
        repas: z
          .array(
            z.object({
              date: dateKey,
              creneau: slot,
              recipeId: z.string(),
              portions: z.number().int().positive().max(50).optional(),
              remarques: z.string().max(300).optional(),
              restesDe: z.object({ date: dateKey, creneau: slot }).optional(),
              remplacerRepasValide: z.boolean().optional(),
            }),
          )
          .min(1)
          .max(21),
      }),
      async run({ repas }) {
        const outcomes = await planMeals(
          householdId,
          repas.map((r) => ({
            date: r.date,
            slot: r.creneau,
            recipeId: r.recipeId,
            servings: r.portions,
            notes: r.remarques,
            leftoverOf: r.restesDe
              ? { date: r.restesDe.date, slot: r.restesDe.creneau }
              : undefined,
            replaceValidated: r.remplacerRepasValide,
          })),
        );
        for (const outcome of outcomes.filter((o) => o.ok)) {
          log.record({
            kind: "meal_plan",
            summary: `Repas proposé (à valider) — ${outcome.message}${outcome.replaced ? ` (remplace ${outcome.replaced})` : ""}`,
            href: plannerHref(outcome.date),
          });
        }
        return outcomes;
      },
    }),
    defineTool({
      name: "retirer_repas",
      description: "Retire le repas d'un jour et créneau donnés.",
      schema: z.object({ date: dateKey, creneau: slot }),
      async run({ date, creneau }) {
        const removed = await removeMealAt(householdId, date, creneau);
        if (!removed) throw new ToolInputError("Aucun repas à ce créneau.");
        log.record({
          kind: "meal_plan",
          summary: `Repas retiré — ${removed.label} : ${removed.recipeName}`,
          href: plannerHref(date),
        });
        return { ok: true };
      },
    }),
    defineTool({
      name: "valider_menu",
      description:
        "Valide les repas proposés entre deux dates incluses. Uniquement si l'utilisateur demande explicitement de valider. Seuls les repas validés alimentent la liste de courses.",
      schema: z.object({ du: dateKey, au: dateKey }),
      async run({ du, au }) {
        const count = await validateMeals(householdId, rangeOf(du, au));
        if (count > 0) {
          log.record({
            kind: "meal_plan",
            summary: `${count} repas validé${count > 1 ? "s" : ""} (du ${du} au ${au})`,
            href: plannerHref(du),
          });
        }
        return { repasValides: count };
      },
    }),
    defineTool({
      name: "marquer_repas_prepare",
      description:
        "Indique qu'un repas a réellement été préparé : décrémente le stock connu des quantités utilisées (une seule fois). Uniquement sur déclaration explicite de l'utilisateur — jamais au moment de planifier.",
      schema: z.object({ date: dateKey, creneau: slot }),
      async run({ date, creneau }) {
        const meal = await findMealAt(householdId, date, creneau);
        if (!meal) throw new ToolInputError("Aucun repas à ce créneau.");
        const result = await markMealPrepared(householdId, meal.id);
        if (!result.ok) throw new ToolInputError(result.error);
        if (!result.alreadyPrepared) {
          const stockText =
            result.changes.length > 0
              ? ` ; stock mis à jour : ${result.changes
                  .map((c) => `${c.name} ${formatQuantity(c.to, c.unit)}`)
                  .join(", ")}`
              : "";
          log.record({
            kind: "pantry",
            summary: `Repas marqué comme préparé — ${result.label}${stockText}`,
            href: plannerHref(date),
          });
        }
        return result;
      },
    }),

    // ---- Courses -----------------------------------------------------
    defineTool({
      name: "calculer_besoins",
      description:
        "Calcule (sans rien écrire) les ingrédients à acheter pour les repas d'une période : quantités sommées selon les portions, stock connu déduit. Par défaut seuls les repas validés comptent.",
      schema: z.object({
        du: dateKey,
        au: dateKey,
        inclureProposes: z.boolean().optional(),
      }),
      async run({ du, au, inclureProposes }) {
        const needs = await computeNeeds(householdId, rangeOf(du, au), {
          includeProposed: inclureProposes,
        });
        return {
          repasPrisEnCompte: needs.countedMeals,
          repasProposesNonComptes: needs.proposedMealsSkipped,
          aAcheter: needs.toBuy.map((i) => ({
            nom: i.name,
            quantite: i.quantity,
            unite: shortUnitLabels[i.unit],
          })),
          couvertParLeStock: needs.plan.stockUsed,
          enStockQuantiteInconnue: needs.plan.stockUnknown,
        };
      },
    }),
    defineTool({
      name: "lister_listes_courses",
      description:
        "Listes de courses du foyer (nom, nombre d'articles, période du menu synchronisée).",
      schema: z.object({}),
      async run() {
        return listShoppingListsSummary(householdId);
      },
    }),
    defineTool({
      name: "synchroniser_liste_courses",
      description:
        "Met une liste de courses nommée (ex : « Migros ») en accord avec le menu d'une période : ajoute ou ajuste les articles issus du menu, retire ceux qui ne sont plus nécessaires. Ne touche jamais aux articles ajoutés à la main ni aux articles déjà cochés (achetés). Relancer la même synchronisation ne crée pas de doublon. `appliquer: false` = aperçu des changements sans rien écrire (à utiliser pour proposer des ajustements après un changement de menu). Sans dates, reprend la période déjà associée à la liste.",
      schema: z.object({
        nomListe: z.string().min(1).max(100),
        du: dateKey.optional(),
        au: dateKey.optional(),
        inclureProposes: z
          .boolean()
          .optional()
          .describe(
            "Compter aussi les repas encore proposés (seulement si l'utilisateur le demande)",
          ),
        appliquer: z.boolean(),
        creerSiAbsente: z.boolean().optional(),
      }),
      async run(input) {
        if ((input.du && !input.au) || (!input.du && input.au)) {
          throw new ToolInputError(
            "Indique les deux dates (du et au) ou aucune.",
          );
        }
        let list = await findShoppingList(householdId, {
          name: input.nomListe,
        });
        let created = false;
        if (!list) {
          if (!input.creerSiAbsente || !input.appliquer) {
            throw new ToolInputError(
              `Aucune liste nommée « ${input.nomListe} ». Utilise creerSiAbsente si l'utilisateur veut la créer.`,
            );
          }
          const result = await findOrCreateShoppingList(
            householdId,
            input.nomListe,
          );
          list = result.list;
          created = result.created;
        }
        const result = await syncShoppingList(householdId, list.id, {
          range: input.du && input.au ? rangeOf(input.du, input.au) : undefined,
          includeProposed: input.inclureProposes,
          apply: input.appliquer,
        });
        if (!result.ok) throw new ToolInputError(result.error);

        const { plan } = result;
        if (created) {
          log.record({
            kind: "shopping_list",
            summary: `Liste de courses créée : ${result.listName}`,
            href: `/shopping-lists/${result.listId}`,
          });
        }
        if (result.applied) {
          const parts = [
            plan.create.length ? `${plan.create.length} ajouté(s)` : null,
            plan.update.length
              ? `${plan.update.length} quantité(s) ajustée(s)`
              : null,
            plan.remove.length ? `${plan.remove.length} retiré(s)` : null,
          ].filter(Boolean);
          log.record({
            kind: "shopping_list",
            summary: `Liste « ${result.listName} » synchronisée avec le menu du ${result.range.startKey} au ${result.range.endKeyInclusive} : ${parts.join(", ")}`,
            href: `/shopping-lists/${result.listId}`,
          });
        }
        return {
          liste: result.listName,
          applique: input.appliquer,
          periode: result.range,
          repasPrisEnCompte: result.countedMeals,
          repasProposesNonComptes: result.proposedMealsSkipped,
          ajouts: plan.create.map(
            (c) => `${c.name} ${formatQuantity(c.quantity, c.unit)}`,
          ),
          ajustements: plan.update.map(
            (u) =>
              `${u.name} ${formatQuantity(u.from, u.unit)} → ${formatQuantity(u.to, u.unit)}`,
          ),
          retraits: plan.remove.map(
            (r) => `${r.name} ${formatQuantity(r.quantity, r.unit)}`,
          ),
          articlesManuelsConserves: plan.keptManualCount,
          articlesCochesConserves: plan.keptCheckedCount,
          couvertParLeStock: plan.stockUsed.map((s) => s.name),
          enStockQuantiteInconnue: plan.stockUnknown.map((s) => s.name),
          doublonsPossiblesAvecArticlesManuels:
            plan.possibleManualDuplicates.map((d) => d.name),
        };
      },
    }),
    defineTool({
      name: "ajouter_article_liste",
      description:
        "Ajoute un article manuel à une liste de courses nommée (hors menu, ex : « papier toilette »). Il ne sera jamais modifié par une synchronisation.",
      schema: z.object({
        nomListe: z.string().min(1).max(100),
        nom: z.string().min(1).max(100),
        quantite: z.number().positive(),
        unite: unit,
        categorie: category.optional(),
        creerListeSiAbsente: z.boolean().optional(),
      }),
      async run(input) {
        const normalized = normalizeQuantity(input.quantite, input.unite);
        if (!normalized)
          throw new ToolInputError(`Unité inconnue « ${input.unite} ».`);
        let list = await findShoppingList(householdId, {
          name: input.nomListe,
        });
        if (!list) {
          if (!input.creerListeSiAbsente) {
            throw new ToolInputError(
              `Aucune liste nommée « ${input.nomListe} ».`,
            );
          }
          list = (await findOrCreateShoppingList(householdId, input.nomListe))
            .list;
        }
        await addManualListItem(householdId, list.id, {
          name: input.nom.trim(),
          quantity: normalized.quantity,
          unit: normalized.unit,
          category: input.categorie ?? "OTHER",
        });
        log.record({
          kind: "shopping_list",
          summary: `Article ajouté à « ${list.name} » : ${input.nom} ${formatQuantity(normalized.quantity, normalized.unit)}`,
          href: `/shopping-lists/${list.id}`,
        });
        return { ok: true };
      },
    }),

    // ---- Stock -------------------------------------------------------
    defineTool({
      name: "consulter_stock",
      description:
        "Stock connu du foyer. quantite null = présent mais quantité inconnue (ne jamais supposer qu'il y en a assez).",
      schema: z.object({}),
      async run() {
        const pantry = await listPantry(householdId);
        return pantry.map((p) => ({
          nom: p.ingredient.name,
          quantite: p.quantity,
          unite: shortUnitLabels[p.ingredient.baseUnit],
        }));
      },
    }),
    defineTool({
      name: "mettre_a_jour_stock",
      description: `Indique ce qu'il reste à la maison (ex : « il reste 300 g de poulet »). Sans quantité = présent, quantité inconnue. Unités : ${ACCEPTED_UNIT_HINT}. Uniquement à partir de ce que l'utilisateur déclare.`,
      schema: z.object({
        nom: z.string().min(1).max(100),
        quantite: z.number().nonnegative().optional(),
        unite: unit.optional(),
        categorie: category.optional(),
      }),
      async run(input) {
        const result = await setPantryItem(householdId, {
          name: input.nom,
          quantity: input.quantite,
          unit: input.unite,
          category: input.categorie,
        });
        if (!result.ok) throw new ToolInputError(result.error);
        log.record({
          kind: "pantry",
          summary: `Stock mis à jour : ${result.name} — ${
            result.quantity === null
              ? "quantité inconnue"
              : `${result.quantity} ${result.unitLabel}`
          }`,
          href: "/preferences",
        });
        return result;
      },
    }),
    defineTool({
      name: "retirer_du_stock",
      description: "Retire un ingrédient du stock (il n'y en a plus).",
      schema: z.object({ nom: z.string().min(1) }),
      async run({ nom }) {
        const removed = await removePantryItem(householdId, nom);
        if (!removed) throw new ToolInputError("Ingrédient absent du stock.");
        log.record({
          kind: "pantry",
          summary: `Retiré du stock : ${removed}`,
          href: "/preferences",
        });
        return { ok: true };
      },
    }),
  ] as AgentTool[];
}
