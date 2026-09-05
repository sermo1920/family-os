-- CreateEnum
CREATE TYPE "MealSlot" AS ENUM ('BREAKFAST', 'LUNCH', 'DINNER', 'SNACK');

-- CreateTable
CREATE TABLE "PlannedMeal" (
    "id" TEXT NOT NULL,
    "householdId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "mealSlot" "MealSlot" NOT NULL,
    "recipeId" TEXT NOT NULL,
    "portionMultiplier" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlannedMeal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MealAttendance" (
    "id" TEXT NOT NULL,
    "plannedMealId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,

    CONSTRAINT "MealAttendance_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PlannedMeal_householdId_date_mealSlot_key" ON "PlannedMeal"("householdId", "date", "mealSlot");

-- CreateIndex
CREATE UNIQUE INDEX "MealAttendance_plannedMealId_memberId_key" ON "MealAttendance"("plannedMealId", "memberId");

-- AddForeignKey
ALTER TABLE "PlannedMeal" ADD CONSTRAINT "PlannedMeal_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlannedMeal" ADD CONSTRAINT "PlannedMeal_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "Recipe"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MealAttendance" ADD CONSTRAINT "MealAttendance_plannedMealId_fkey" FOREIGN KEY ("plannedMealId") REFERENCES "PlannedMeal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MealAttendance" ADD CONSTRAINT "MealAttendance_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
