"use client";

import { useActionState, useState, useTransition } from "react";
import { NutritionSummary } from "@/features/recipes/components/nutrition-summary";
import type { RecipeNutrition } from "@/features/recipes/calculations";
import { shortUnitLabels } from "@/features/ingredients/schema";
import {
  recipeStatusLabels,
  recipeTagLabels,
  splitSteps,
  type RecipeTagValue,
} from "@/features/recipes/schema";
import { scaleIngredients } from "@/features/recipes/scaling";
import {
  saveRecipeFeedback,
  validateRecipe,
  type FeedbackActionState,
} from "@/features/recipes/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export interface RecipeViewValues {
  id: string;
  name: string;
  servings: number;
  instructions: string | null;
  status: "AI_PROPOSED" | "VALIDATED";
  prepTimeMinutes: number | null;
  cookTimeMinutes: number | null;
  tags: RecipeTagValue[];
  rating: number | null;
  notes: string | null;
  perPortion: RecipeNutrition;
  nutritionIncomplete: boolean;
  ingredients: {
    id: string;
    name: string;
    quantity: number;
    baseUnit: keyof typeof shortUnitLabels;
  }[];
}

const initialFeedback: FeedbackActionState = { error: null, saved: false };

export function RecipeStatusBadge({
  status,
}: {
  status: RecipeViewValues["status"];
}) {
  if (status === "VALIDATED") return null;
  return (
    <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-800 dark:bg-amber-900 dark:text-amber-100">
      {recipeStatusLabels.AI_PROPOSED}
    </span>
  );
}

function totalTime(recipe: RecipeViewValues) {
  if (recipe.prepTimeMinutes === null && recipe.cookTimeMinutes === null) {
    return null;
  }
  return (recipe.prepTimeMinutes ?? 0) + (recipe.cookTimeMinutes ?? 0);
}

export function RecipeViewDialog({ recipe }: { recipe: RecipeViewValues }) {
  const [targetServings, setTargetServings] = useState(recipe.servings);
  const [validating, startValidate] = useTransition();
  const [feedbackState, feedbackAction, feedbackPending] = useActionState(
    saveRecipeFeedback.bind(null, recipe.id),
    initialFeedback,
  );

  const validServings =
    Number.isInteger(targetServings) && targetServings > 0
      ? targetServings
      : recipe.servings;
  const ingredients = scaleIngredients(
    recipe.ingredients.map((i) => ({ ...i, unit: i.baseUnit })),
    recipe.servings,
    validServings,
  );
  const steps = splitSteps(recipe.instructions);
  const minutes = totalTime(recipe);

  return (
    <Dialog>
      <DialogTrigger
        render={
          <button
            type="button"
            className="hover:bg-accent flex min-w-0 flex-1 flex-col items-start gap-1 rounded-l-md px-4 py-3 text-left"
          />
        }
      >
        <span className="flex flex-wrap items-center gap-2">
          <span className="font-medium">{recipe.name}</span>
          <RecipeStatusBadge status={recipe.status} />
        </span>
        <span className="text-muted-foreground text-xs">
          {recipe.servings} portion{recipe.servings > 1 ? "s" : ""}
          {minutes !== null && ` · ${minutes} min`}
          {recipe.rating !== null && ` · ${"★".repeat(recipe.rating)}`}
          {recipe.tags.length > 0 &&
            ` · ${recipe.tags.map((t) => recipeTagLabels[t]).join(", ")}`}
        </span>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex flex-wrap items-center gap-2">
            {recipe.name}
            <RecipeStatusBadge status={recipe.status} />
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          {recipe.status === "AI_PROPOSED" && (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-dashed border-amber-500 px-3 py-2 text-sm">
              <span>
                Recette proposée par l&apos;assistant, pas encore validée.
              </span>
              <Button
                size="sm"
                disabled={validating}
                onClick={() => startValidate(() => validateRecipe(recipe.id))}
              >
                {validating ? "Validation..." : "Valider la recette"}
              </Button>
            </div>
          )}

          <dl className="grid grid-cols-3 gap-2 text-sm">
            <div>
              <dt className="text-muted-foreground">Préparation</dt>
              <dd>{recipe.prepTimeMinutes ?? "—"} min</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Cuisson</dt>
              <dd>{recipe.cookTimeMinutes ?? "—"} min</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Catégories</dt>
              <dd>
                {recipe.tags.length > 0
                  ? recipe.tags.map((t) => recipeTagLabels[t]).join(", ")
                  : "—"}
              </dd>
            </div>
          </dl>

          <div>
            <h3 className="mb-2 text-sm font-medium">Nutrition par portion</h3>
            <NutritionSummary
              perPortion={recipe.perPortion}
              servings={recipe.servings}
            />
            {recipe.nutritionIncomplete && (
              <p className="text-muted-foreground mt-1 text-xs">
                Incomplet : certains ingrédients n&apos;ont pas de valeurs
                nutritionnelles connues (non estimées).
              </p>
            )}
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between gap-2">
              <h3 className="text-sm font-medium">Ingrédients</h3>
              <label className="text-muted-foreground flex items-center gap-2 text-xs">
                Pour
                <Input
                  type="number"
                  min={1}
                  max={50}
                  value={Number.isNaN(targetServings) ? "" : targetServings}
                  onChange={(e) => setTargetServings(e.target.valueAsNumber)}
                  className="h-7 w-16 text-xs"
                  aria-label="Nombre de portions"
                />
                portions
              </label>
            </div>
            <ul className="flex flex-col gap-1 text-sm">
              {ingredients.map((ri) => (
                <li key={ri.id} className="flex justify-between">
                  <span>{ri.name}</span>
                  <span className="text-muted-foreground">
                    {ri.quantity} {shortUnitLabels[ri.baseUnit]}
                  </span>
                </li>
              ))}
            </ul>
            {validServings !== recipe.servings && (
              <p className="text-muted-foreground mt-1 text-xs">
                Quantités recalculées pour {validServings} portions (recette
                enregistrée pour {recipe.servings}).
              </p>
            )}
          </div>

          {steps.length > 0 && (
            <div>
              <h3 className="mb-2 text-sm font-medium">Étapes</h3>
              <ol className="list-decimal space-y-1 pl-5 text-sm">
                {steps.map((step, index) => (
                  <li key={index}>{step}</li>
                ))}
              </ol>
            </div>
          )}

          <form
            action={feedbackAction}
            className="flex flex-col gap-2 border-t pt-3"
          >
            <h3 className="text-sm font-medium">Appréciation du foyer</h3>
            <label className="flex items-center gap-2 text-sm">
              Note
              <select
                name="rating"
                defaultValue={recipe.rating ?? ""}
                className="border-input h-8 rounded-lg border bg-transparent px-2 text-sm"
              >
                <option value="">—</option>
                {[1, 2, 3, 4, 5].map((n) => (
                  <option key={n} value={n}>
                    {"★".repeat(n)}
                  </option>
                ))}
              </select>
            </label>
            <textarea
              name="notes"
              rows={2}
              defaultValue={recipe.notes ?? ""}
              placeholder="Remarques, modifications (ex : moins salé, doubler l'ail)"
              className="border-input rounded-lg border bg-transparent px-2.5 py-1.5 text-sm"
            />
            {feedbackState.error && (
              <p className="text-destructive text-sm">{feedbackState.error}</p>
            )}
            {feedbackState.saved && !feedbackPending && (
              <p
                className="text-sm text-green-700 dark:text-green-400"
                role="status"
              >
                Appréciation enregistrée.
              </p>
            )}
            <Button
              type="submit"
              size="sm"
              variant="outline"
              disabled={feedbackPending}
            >
              {feedbackPending
                ? "Enregistrement..."
                : "Enregistrer l'appréciation"}
            </Button>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
