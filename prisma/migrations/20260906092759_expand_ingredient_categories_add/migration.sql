-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "IngredientCategory" ADD VALUE 'FRESH';
ALTER TYPE "IngredientCategory" ADD VALUE 'MEAT';
ALTER TYPE "IngredientCategory" ADD VALUE 'FISH';
ALTER TYPE "IngredientCategory" ADD VALUE 'STARCHES';
ALTER TYPE "IngredientCategory" ADD VALUE 'SAVORY_GROCERY';
ALTER TYPE "IngredientCategory" ADD VALUE 'CANNED';
ALTER TYPE "IngredientCategory" ADD VALUE 'READY_MEALS';
ALTER TYPE "IngredientCategory" ADD VALUE 'SAUCES_CONDIMENTS';
ALTER TYPE "IngredientCategory" ADD VALUE 'BREAKFAST';
ALTER TYPE "IngredientCategory" ADD VALUE 'COOKIES_CAKES';
ALTER TYPE "IngredientCategory" ADD VALUE 'CONFECTIONERY';
ALTER TYPE "IngredientCategory" ADD VALUE 'DESSERT';
ALTER TYPE "IngredientCategory" ADD VALUE 'BEAUTY_HYGIENE';
ALTER TYPE "IngredientCategory" ADD VALUE 'BABY';
ALTER TYPE "IngredientCategory" ADD VALUE 'CLEANING';
ALTER TYPE "IngredientCategory" ADD VALUE 'PETS';
ALTER TYPE "IngredientCategory" ADD VALUE 'HOME_GARDEN';
ALTER TYPE "IngredientCategory" ADD VALUE 'CONDIMENTS';
