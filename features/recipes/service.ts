import { prisma } from "@/lib/db";
import type {
  IngredientCategory,
  Prisma,
  RecipeStatus,
  RecipeTag,
  Unit,
} from "@/lib/generated/prisma/client";
import { normalizeQuantity, roundQuantity } from "@/features/ingredients/units";
import { shortUnitLabels } from "@/features/ingredients/schema";
import { scaleIngredients } from "@/features/recipes/scaling";
import { splitSteps } from "@/features/recipes/schema";

/**
 * Recipe operations shared by the UI server actions and the cooking agent's
 * tools. Every function takes the householdId of the authenticated member and
 * filters on it (authorization is checked by the caller, cf. lib/auth.ts).
 */

export interface RecipeSearchFilters {
  query?: string;
  tags?: RecipeTag[];
  maxTotalMinutes?: number;
  status?: RecipeStatus;
  limit?: number;
}

export async function searchRecipes(
  householdId: string,
  filters: RecipeSearchFilters,
) {
  const query = filters.query?.trim();
  const recipes = await prisma.recipe.findMany({
    where: {
      householdId,
      ...(filters.status ? { status: filters.status } : {}),
      ...(filters.tags && filters.tags.length > 0
        ? { tags: { hasEvery: filters.tags } }
        : {}),
      ...(query
        ? {
            OR: [
              { name: { contains: query, mode: "insensitive" } },
              {
                ingredients: {
                  some: {
                    ingredient: {
                      name: { contains: query, mode: "insensitive" },
                    },
                  },
                },
              },
            ],
          }
        : {}),
    },
    orderBy: [{ rating: { sort: "desc", nulls: "last" } }, { name: "asc" }],
    include: { ingredients: { include: { ingredient: true } } },
    take: 50,
  });

  return recipes
    .map((recipe) => {
      const totalMinutes =
        recipe.prepTimeMinutes === null && recipe.cookTimeMinutes === null
          ? null
          : (recipe.prepTimeMinutes ?? 0) + (recipe.cookTimeMinutes ?? 0);
      return {
        id: recipe.id,
        name: recipe.name,
        servings: recipe.servings,
        status: recipe.status,
        tags: recipe.tags,
        prepTimeMinutes: recipe.prepTimeMinutes,
        cookTimeMinutes: recipe.cookTimeMinutes,
        totalMinutes,
        rating: recipe.rating,
        ingredients: recipe.ingredients.map((ri) => ri.ingredient.name),
      };
    })
    .filter(
      (recipe) =>
        filters.maxTotalMinutes === undefined ||
        (recipe.totalMinutes !== null &&
          recipe.totalMinutes <= filters.maxTotalMinutes),
    )
    .slice(0, filters.limit ?? 20);
}

export async function getRecipeDetail(
  householdId: string,
  recipeId: string,
  targetServings?: number,
) {
  const recipe = await prisma.recipe.findFirst({
    where: { id: recipeId, householdId },
    include: { ingredients: { include: { ingredient: true } } },
  });
  if (!recipe) return null;

  const baseIngredients = recipe.ingredients.map((ri) => ({
    name: ri.ingredient.name,
    quantity: ri.quantity,
    unit: ri.ingredient.baseUnit,
  }));
  const servings = targetServings ?? recipe.servings;
  const ingredients =
    servings === recipe.servings
      ? baseIngredients
      : scaleIngredients(baseIngredients, recipe.servings, servings);

  return {
    id: recipe.id,
    name: recipe.name,
    status: recipe.status,
    recipeServings: recipe.servings,
    servings,
    prepTimeMinutes: recipe.prepTimeMinutes,
    cookTimeMinutes: recipe.cookTimeMinutes,
    tags: recipe.tags,
    rating: recipe.rating,
    notes: recipe.notes,
    steps: splitSteps(recipe.instructions),
    ingredients: ingredients.map((i) => ({
      name: i.name,
      quantity: i.quantity,
      unit: shortUnitLabels[i.unit],
    })),
  };
}

export interface IngredientLineInput {
  name: string;
  quantity: number;
  unit: string;
  category?: IngredientCategory;
}

type ResolvedLine =
  | {
      kind: "existing";
      ingredientId: string;
      name: string;
      quantity: number;
    }
  | {
      kind: "new";
      name: string;
      quantity: number;
      unit: Unit;
      category: IngredientCategory;
    };

/**
 * Maps a free-form ingredient line to the household catalogue: existing
 * ingredient matched by name (case-insensitive), quantity converted into its
 * base unit; otherwise a new catalogue entry (nutrition left unknown).
 */
export async function resolveIngredientLines(
  householdId: string,
  lines: IngredientLineInput[],
): Promise<{ lines: ResolvedLine[]; errors: string[] }> {
  const catalogue = await prisma.ingredient.findMany({
    where: { householdId },
  });
  const byName = new Map(
    catalogue.map((i) => [i.name.trim().toLowerCase(), i]),
  );

  const resolved: ResolvedLine[] = [];
  const errors: string[] = [];

  for (const line of lines) {
    const normalized = normalizeQuantity(line.quantity, line.unit);
    if (!normalized) {
      errors.push(`Unité inconnue « ${line.unit} » pour « ${line.name} ».`);
      continue;
    }
    if (normalized.quantity <= 0) {
      errors.push(`Quantité invalide pour « ${line.name} ».`);
      continue;
    }
    const existing = byName.get(line.name.trim().toLowerCase());
    if (existing) {
      if (existing.baseUnit !== normalized.unit) {
        errors.push(
          `« ${existing.name} » est suivi en ${shortUnitLabels[existing.baseUnit]} dans le catalogue : exprime sa quantité dans cette unité (pas de conversion automatique entre poids, volume et pièces).`,
        );
        continue;
      }
      resolved.push({
        kind: "existing",
        ingredientId: existing.id,
        name: existing.name,
        quantity: normalized.quantity,
      });
    } else {
      resolved.push({
        kind: "new",
        name: line.name.trim(),
        quantity: normalized.quantity,
        unit: normalized.unit,
        category: line.category ?? "OTHER",
      });
    }
  }

  return { lines: resolved, errors };
}

/** Creates the catalogue entries needed by `lines`; returns name -> id. */
async function materializeIngredients(
  tx: Prisma.TransactionClient,
  householdId: string,
  lines: ResolvedLine[],
) {
  const ids = new Map<string, { id: string; quantity: number }>();
  const created: string[] = [];
  for (const line of lines) {
    const key = line.name.trim().toLowerCase();
    let ingredientId: string;
    if (line.kind === "existing") {
      ingredientId = line.ingredientId;
    } else {
      const already = ids.get(key);
      if (already) {
        ingredientId = already.id;
      } else {
        const ingredient = await tx.ingredient.create({
          data: {
            householdId,
            name: line.name,
            category: line.category,
            baseUnit: line.unit,
          },
        });
        ingredientId = ingredient.id;
        created.push(ingredient.name);
      }
    }
    // Same ingredient listed twice: one line, quantities summed (recipe
    // ingredients are unique per recipe).
    const previous = ids.get(key);
    ids.set(key, {
      id: ingredientId,
      quantity: (previous?.quantity ?? 0) + line.quantity,
    });
  }
  return { ids, created };
}

export interface SaveRecipeInput {
  recipeId?: string;
  name: string;
  servings: number;
  prepTimeMinutes?: number | null;
  cookTimeMinutes?: number | null;
  tags?: RecipeTag[];
  steps?: string[];
  notes?: string | null;
  ingredients: IngredientLineInput[];
}

export type SaveRecipeResult =
  | {
      ok: true;
      recipeId: string;
      name: string;
      created: boolean;
      status: RecipeStatus;
      createdIngredients: string[];
    }
  | { ok: false; error: string };

/**
 * Creates (status AI_PROPOSED) or updates a recipe from the cooking agent.
 * An update keeps the recipe's status: a validated recipe stays validated
 * when the household asks for a change.
 */
export async function saveRecipeFromAgent(
  householdId: string,
  input: SaveRecipeInput,
): Promise<SaveRecipeResult> {
  if (input.ingredients.length === 0) {
    return {
      ok: false,
      error: "Une recette doit avoir au moins un ingrédient.",
    };
  }

  let existingStatus: RecipeStatus | null = null;
  if (input.recipeId) {
    const existing = await prisma.recipe.findFirst({
      where: { id: input.recipeId, householdId },
    });
    if (!existing) return { ok: false, error: "Recette introuvable." };
    existingStatus = existing.status;
  } else {
    // Running the same request twice must not create a second copy.
    const sameName = await prisma.recipe.findFirst({
      where: {
        householdId,
        name: { equals: input.name.trim(), mode: "insensitive" },
      },
    });
    if (sameName) {
      return {
        ok: false,
        error: `Une recette « ${sameName.name} » existe déjà (recipeId ${sameName.id}). Réutilise-la, ou passe recipeId pour la modifier.`,
      };
    }
  }

  const { lines, errors } = await resolveIngredientLines(
    householdId,
    input.ingredients,
  );
  if (errors.length > 0) {
    return { ok: false, error: errors.join(" ") };
  }

  const instructions =
    input.steps && input.steps.length > 0
      ? input.steps
          .map((s) => s.trim())
          .filter(Boolean)
          .join("\n")
      : undefined;

  return prisma.$transaction(async (tx) => {
    const { ids, created } = await materializeIngredients(
      tx,
      householdId,
      lines,
    );
    const ingredientRows = Array.from(ids.values()).map((value) => ({
      ingredientId: value.id,
      quantity: value.quantity,
    }));

    const data = {
      name: input.name.trim(),
      servings: input.servings,
      prepTimeMinutes: input.prepTimeMinutes ?? null,
      cookTimeMinutes: input.cookTimeMinutes ?? null,
      tags: input.tags ?? [],
      ...(instructions !== undefined ? { instructions } : {}),
      ...(input.notes !== undefined ? { notes: input.notes } : {}),
    };

    if (input.recipeId) {
      const recipe = await tx.recipe.update({
        where: { id: input.recipeId },
        data: {
          ...data,
          ingredients: { deleteMany: {}, create: ingredientRows },
        },
      });
      return {
        ok: true as const,
        recipeId: recipe.id,
        name: recipe.name,
        created: false,
        status: existingStatus ?? recipe.status,
        createdIngredients: created,
      };
    }

    const recipe = await tx.recipe.create({
      data: {
        householdId,
        ...data,
        status: "AI_PROPOSED",
        ingredients: { create: ingredientRows },
      },
    });
    return {
      ok: true as const,
      recipeId: recipe.id,
      name: recipe.name,
      created: true,
      status: recipe.status,
      createdIngredients: created,
    };
  });
}

export async function updateRecipeFeedback(
  householdId: string,
  recipeId: string,
  feedback: {
    rating?: number | null;
    notes?: string | null;
    validate?: boolean;
  },
) {
  const recipe = await prisma.recipe.findFirst({
    where: { id: recipeId, householdId },
  });
  if (!recipe) return null;
  return prisma.recipe.update({
    where: { id: recipeId },
    data: {
      ...(feedback.rating !== undefined ? { rating: feedback.rating } : {}),
      ...(feedback.notes !== undefined ? { notes: feedback.notes } : {}),
      ...(feedback.validate ? { status: "VALIDATED" } : {}),
    },
  });
}

/** Formats "300 g" etc. for summaries shown to the user. */
export function formatQuantity(quantity: number, unit: Unit): string {
  return `${roundQuantity(quantity, unit)} ${shortUnitLabels[unit]}`;
}
