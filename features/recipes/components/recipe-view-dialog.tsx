"use client";

import { NutritionSummary } from "@/features/recipes/components/nutrition-summary";
import type { RecipeNutrition } from "@/features/recipes/calculations";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const shortUnitLabels = { GRAM: "g", MILLILITER: "ml" } as const;

export interface RecipeViewValues {
  name: string;
  servings: number;
  instructions: string | null;
  perPortion: RecipeNutrition;
  ingredients: {
    id: string;
    name: string;
    quantity: number;
    baseUnit: keyof typeof shortUnitLabels;
  }[];
}

export function RecipeViewDialog({ recipe }: { recipe: RecipeViewValues }) {
  return (
    <Dialog>
      <DialogTrigger
        render={
          <button
            type="button"
            className="hover:bg-accent flex flex-1 items-center justify-between rounded-l-md px-4 py-3 text-left"
          />
        }
      >
        <span className="font-medium">{recipe.name}</span>
        <span className="text-muted-foreground text-sm">
          {recipe.servings} portion{recipe.servings > 1 ? "s" : ""}
        </span>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{recipe.name}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div>
            <h3 className="mb-2 text-sm font-medium">Nutrition par portion</h3>
            <NutritionSummary
              perPortion={recipe.perPortion}
              servings={recipe.servings}
            />
          </div>

          <div>
            <h3 className="mb-2 text-sm font-medium">Ingrédients</h3>
            <ul className="flex flex-col gap-1 text-sm">
              {recipe.ingredients.map((ri) => (
                <li key={ri.id} className="flex justify-between">
                  <span>{ri.name}</span>
                  <span className="text-muted-foreground">
                    {ri.quantity} {shortUnitLabels[ri.baseUnit]}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {recipe.instructions && (
            <div>
              <h3 className="mb-2 text-sm font-medium">Instructions</h3>
              <p className="text-sm whitespace-pre-wrap">
                {recipe.instructions}
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
