export type Sex = "MALE" | "FEMALE";
export type ActivityLevel =
  "SEDENTARY" | "LIGHT" | "MODERATE" | "ACTIVE" | "VERY_ACTIVE";

const ACTIVITY_MULTIPLIERS: Record<ActivityLevel, number> = {
  SEDENTARY: 1.2,
  LIGHT: 1.375,
  MODERATE: 1.55,
  ACTIVE: 1.725,
  VERY_ACTIVE: 1.9,
};

/** Âge en années révolues à la date de référence (aujourd'hui par défaut). */
export function calculateAge(
  dateOfBirth: Date,
  referenceDate: Date = new Date(),
): number {
  let age = referenceDate.getFullYear() - dateOfBirth.getFullYear();
  const hasHadBirthdayThisYear =
    referenceDate.getMonth() > dateOfBirth.getMonth() ||
    (referenceDate.getMonth() === dateOfBirth.getMonth() &&
      referenceDate.getDate() >= dateOfBirth.getDate());
  if (!hasHadBirthdayThisYear) age -= 1;
  return age;
}

export interface BmrInput {
  weightKg: number;
  heightCm: number;
  age: number;
  sex: Sex;
}

/** Métabolisme de base (kcal/jour), équation de Mifflin-St Jeor. */
export function calculateBmr({
  weightKg,
  heightCm,
  age,
  sex,
}: BmrInput): number {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  return sex === "MALE" ? base + 5 : base - 161;
}

/** Dépense énergétique totale (kcal/jour) = BMR × facteur d'activité. */
export function calculateTdee(
  bmr: number,
  activityLevel: ActivityLevel,
): number {
  return bmr * ACTIVITY_MULTIPLIERS[activityLevel];
}

export interface Macros {
  proteinG: number;
  carbsG: number;
  fatG: number;
}

/**
 * Répartition standard pour la population générale : 30% protéines / 40%
 * glucides / 30% lipides (protéines et glucides = 4 kcal/g, lipides = 9
 * kcal/g). Point de départ raisonnable, ajustable manuellement ensuite.
 */
export function calculateMacros(calorieTarget: number): Macros {
  return {
    proteinG: Math.round((calorieTarget * 0.3) / 4),
    carbsG: Math.round((calorieTarget * 0.4) / 4),
    fatG: Math.round((calorieTarget * 0.3) / 9),
  };
}

export interface NutritionGoalInput {
  weightKg: number;
  heightCm: number;
  dateOfBirth: Date;
  sex: Sex;
  activityLevel: ActivityLevel;
  referenceDate?: Date;
}

export interface ComputedNutritionGoal {
  bmr: number;
  tdee: number;
  calorieTarget: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
}

/**
 * Calcule un objectif nutritionnel complet à partir du profil d'un membre.
 * La cible calorique par défaut est le maintien du poids (= TDEE) ; un
 * override manuel peut ensuite remplacer ces valeurs sans les recalculer.
 */
export function computeNutritionGoal(
  input: NutritionGoalInput,
): ComputedNutritionGoal {
  const age = calculateAge(input.dateOfBirth, input.referenceDate);
  const bmr = calculateBmr({
    weightKg: input.weightKg,
    heightCm: input.heightCm,
    age,
    sex: input.sex,
  });
  const tdee = calculateTdee(bmr, input.activityLevel);
  const calorieTarget = Math.round(tdee);

  return {
    bmr: Math.round(bmr),
    tdee: Math.round(tdee),
    calorieTarget,
    ...calculateMacros(calorieTarget),
  };
}
