-- AlterEnum
BEGIN;
CREATE TYPE "MealSlot_new" AS ENUM ('BREAKFAST', 'LUNCH', 'DINNER');
ALTER TABLE "PlannedMeal" ALTER COLUMN "mealSlot" TYPE "MealSlot_new" USING ("mealSlot"::text::"MealSlot_new");
ALTER TYPE "MealSlot" RENAME TO "MealSlot_old";
ALTER TYPE "MealSlot_new" RENAME TO "MealSlot";
DROP TYPE "public"."MealSlot_old";
COMMIT;
