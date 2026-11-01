import type { Unit } from "@/lib/generated/prisma/client";

/**
 * Deterministic unit handling. Every quantity stored in the app is expressed
 * in the ingredient's base unit (GRAM, MILLILITER, PIECE, PACK). Free-form
 * units coming from the cooking agent ("kg", "dl", "c. à soupe"...) are
 * normalized here — never by the model itself.
 *
 * Deliberately no density-based conversion (g <-> ml): that would be an
 * assumption about the ingredient, so it is reported as incompatible instead.
 */

interface UnitAlias {
  unit: Unit;
  factor: number;
}

const ALIASES: Record<string, UnitAlias> = {
  g: { unit: "GRAM", factor: 1 },
  gr: { unit: "GRAM", factor: 1 },
  gramme: { unit: "GRAM", factor: 1 },
  grammes: { unit: "GRAM", factor: 1 },
  gram: { unit: "GRAM", factor: 1 },
  kg: { unit: "GRAM", factor: 1000 },
  kilo: { unit: "GRAM", factor: 1000 },
  kilos: { unit: "GRAM", factor: 1000 },
  kilogramme: { unit: "GRAM", factor: 1000 },
  kilogrammes: { unit: "GRAM", factor: 1000 },
  mg: { unit: "GRAM", factor: 0.001 },

  ml: { unit: "MILLILITER", factor: 1 },
  millilitre: { unit: "MILLILITER", factor: 1 },
  millilitres: { unit: "MILLILITER", factor: 1 },
  milliliter: { unit: "MILLILITER", factor: 1 },
  cl: { unit: "MILLILITER", factor: 10 },
  dl: { unit: "MILLILITER", factor: 100 },
  l: { unit: "MILLILITER", factor: 1000 },
  litre: { unit: "MILLILITER", factor: 1000 },
  litres: { unit: "MILLILITER", factor: 1000 },
  // Spoons are volume measures (standard kitchen equivalents).
  "c. à soupe": { unit: "MILLILITER", factor: 15 },
  "c.à soupe": { unit: "MILLILITER", factor: 15 },
  "cuillère à soupe": { unit: "MILLILITER", factor: 15 },
  "cuillères à soupe": { unit: "MILLILITER", factor: 15 },
  càs: { unit: "MILLILITER", factor: 15 },
  cas: { unit: "MILLILITER", factor: 15 },
  cs: { unit: "MILLILITER", factor: 15 },
  tbsp: { unit: "MILLILITER", factor: 15 },
  "c. à café": { unit: "MILLILITER", factor: 5 },
  "c.à café": { unit: "MILLILITER", factor: 5 },
  "cuillère à café": { unit: "MILLILITER", factor: 5 },
  "cuillères à café": { unit: "MILLILITER", factor: 5 },
  càc: { unit: "MILLILITER", factor: 5 },
  cac: { unit: "MILLILITER", factor: 5 },
  cc: { unit: "MILLILITER", factor: 5 },
  tsp: { unit: "MILLILITER", factor: 5 },

  pce: { unit: "PIECE", factor: 1 },
  pces: { unit: "PIECE", factor: 1 },
  pièce: { unit: "PIECE", factor: 1 },
  pièces: { unit: "PIECE", factor: 1 },
  piece: { unit: "PIECE", factor: 1 },
  pieces: { unit: "PIECE", factor: 1 },
  unité: { unit: "PIECE", factor: 1 },
  unités: { unit: "PIECE", factor: 1 },
  u: { unit: "PIECE", factor: 1 },
  "": { unit: "PIECE", factor: 1 },

  paq: { unit: "PACK", factor: 1 },
  paquet: { unit: "PACK", factor: 1 },
  paquets: { unit: "PACK", factor: 1 },
  sachet: { unit: "PACK", factor: 1 },
  sachets: { unit: "PACK", factor: 1 },
  boîte: { unit: "PACK", factor: 1 },
  boîtes: { unit: "PACK", factor: 1 },
  boite: { unit: "PACK", factor: 1 },
  boites: { unit: "PACK", factor: 1 },
  pack: { unit: "PACK", factor: 1 },
};

const BASE_UNITS: Unit[] = ["GRAM", "MILLILITER", "PIECE", "PACK"];

/** Accepted unit spellings, listed in the cooking agent's tool descriptions. */
export const ACCEPTED_UNIT_HINT =
  "g, kg, ml, cl, dl, l, c. à soupe, c. à café, pce, paquet (ou GRAM/MILLILITER/PIECE/PACK)";

export interface NormalizedQuantity {
  quantity: number;
  unit: Unit;
}

/**
 * Converts a quantity expressed in a free-form unit into one of the base
 * units. Returns null when the unit is unknown (the caller reports it rather
 * than guessing).
 */
export function normalizeQuantity(
  quantity: number,
  rawUnit: string | null | undefined,
): NormalizedQuantity | null {
  const trimmed = (rawUnit ?? "").trim();
  if ((BASE_UNITS as string[]).includes(trimmed.toUpperCase())) {
    return { quantity, unit: trimmed.toUpperCase() as Unit };
  }
  const key = trimmed.toLowerCase().replace(/\s+/g, " ").replace(/\.$/, "");
  const alias = ALIASES[key];
  if (!alias) return null;
  return { quantity: quantity * alias.factor, unit: alias.unit };
}

/** Same-unit only: base units are never converted into one another. */
export function convertToUnit(
  quantity: number,
  from: Unit,
  to: Unit,
): number | null {
  return from === to ? quantity : null;
}

/**
 * Display/storage rounding. Weights and volumes keep one decimal under 10
 * and are rounded to the unit above; pieces and packs keep halves.
 */
export function roundQuantity(quantity: number, unit: Unit): number {
  if (unit === "PIECE" || unit === "PACK") {
    return Math.round(quantity * 2) / 2;
  }
  if (quantity < 10) return Math.round(quantity * 10) / 10;
  return Math.round(quantity);
}

/**
 * Rounding for something you buy: you can't buy half a pack or 1.5 lemons,
 * so countable units are rounded up. Weights/volumes use roundQuantity.
 */
export function roundPurchaseQuantity(quantity: number, unit: Unit): number {
  if (unit === "PIECE" || unit === "PACK") {
    return Math.ceil(quantity - 1e-9);
  }
  return roundQuantity(quantity, unit);
}
