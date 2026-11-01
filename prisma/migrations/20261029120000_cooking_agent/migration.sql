-- CreateEnum
CREATE TYPE "RecipeStatus" AS ENUM ('AI_PROPOSED', 'VALIDATED');

-- CreateEnum
CREATE TYPE "RecipeTag" AS ENUM ('QUICK', 'VEGETARIAN', 'VEGAN', 'MAKE_AHEAD', 'FREEZABLE', 'KID_FRIENDLY', 'LIGHT', 'BUDGET', 'ONE_POT');

-- CreateEnum
CREATE TYPE "MealStatus" AS ENUM ('PROPOSED', 'VALIDATED');

-- CreateEnum
CREATE TYPE "ShoppingItemSource" AS ENUM ('MANUAL', 'MEAL_PLAN');

-- CreateEnum
CREATE TYPE "PreferenceKind" AS ENUM ('LIKE', 'DISLIKE', 'EXCLUSION', 'CONSTRAINT', 'BUDGET', 'OTHER');

-- CreateEnum
CREATE TYPE "ConversationRole" AS ENUM ('USER', 'ASSISTANT');

-- AlterTable
ALTER TABLE "Ingredient" ALTER COLUMN "caloriesPer100" DROP NOT NULL,
ALTER COLUMN "proteinPer100" DROP NOT NULL,
ALTER COLUMN "carbsPer100" DROP NOT NULL,
ALTER COLUMN "fatPer100" DROP NOT NULL;

-- AlterTable
ALTER TABLE "PlannedMeal" ADD COLUMN     "leftoverOfId" TEXT,
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "preparedAt" TIMESTAMP(3),
ADD COLUMN     "status" "MealStatus" NOT NULL DEFAULT 'VALIDATED';

-- AlterTable
ALTER TABLE "Recipe" ADD COLUMN     "cookTimeMinutes" INTEGER,
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "prepTimeMinutes" INTEGER,
ADD COLUMN     "rating" INTEGER,
ADD COLUMN     "status" "RecipeStatus" NOT NULL DEFAULT 'VALIDATED',
ADD COLUMN     "tags" "RecipeTag"[] DEFAULT ARRAY[]::"RecipeTag"[],
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "ShoppingListItem" ADD COLUMN     "source" "ShoppingItemSource" NOT NULL DEFAULT 'MANUAL';

-- CreateTable
CREATE TABLE "HouseholdPreference" (
    "id" TEXT NOT NULL,
    "householdId" TEXT NOT NULL,
    "kind" "PreferenceKind" NOT NULL,
    "text" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HouseholdPreference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PantryItem" (
    "id" TEXT NOT NULL,
    "householdId" TEXT NOT NULL,
    "ingredientId" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PantryItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Conversation" (
    "id" TEXT NOT NULL,
    "householdId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Conversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConversationMessage" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "role" "ConversationRole" NOT NULL,
    "content" TEXT NOT NULL,
    "actions" JSONB,
    "isError" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConversationMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "HouseholdPreference_householdId_idx" ON "HouseholdPreference"("householdId");

-- CreateIndex
CREATE UNIQUE INDEX "PantryItem_ingredientId_key" ON "PantryItem"("ingredientId");

-- CreateIndex
CREATE INDEX "PantryItem_householdId_idx" ON "PantryItem"("householdId");

-- CreateIndex
CREATE INDEX "Conversation_memberId_updatedAt_idx" ON "Conversation"("memberId", "updatedAt");

-- CreateIndex
CREATE INDEX "ConversationMessage_conversationId_createdAt_idx" ON "ConversationMessage"("conversationId", "createdAt");

-- AddForeignKey
ALTER TABLE "PlannedMeal" ADD CONSTRAINT "PlannedMeal_leftoverOfId_fkey" FOREIGN KEY ("leftoverOfId") REFERENCES "PlannedMeal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HouseholdPreference" ADD CONSTRAINT "HouseholdPreference_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PantryItem" ADD CONSTRAINT "PantryItem_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PantryItem" ADD CONSTRAINT "PantryItem_ingredientId_fkey" FOREIGN KEY ("ingredientId") REFERENCES "Ingredient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConversationMessage" ADD CONSTRAINT "ConversationMessage_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Backfill: items imported from the meal plan by the previous flow are the
-- only ones linked to an ingredient (manual items always had ingredientId NULL).
UPDATE "ShoppingListItem" SET "source" = 'MEAL_PLAN' WHERE "ingredientId" IS NOT NULL;
