-- AlterEnum
BEGIN;
CREATE TYPE "IngredientCategory_new" AS ENUM ('OTHER', 'FRUITS_VEGETABLES', 'MEAT', 'FISH', 'BAKERY', 'FRESH', 'FROZEN', 'BEVERAGES', 'STARCHES', 'SAVORY_GROCERY', 'CANNED', 'READY_MEALS', 'SAUCES_CONDIMENTS', 'BREAKFAST', 'COOKIES_CAKES', 'CONFECTIONERY', 'DESSERT', 'BEAUTY_HYGIENE', 'BABY', 'CLEANING', 'PETS', 'HOME_GARDEN', 'CONDIMENTS');
ALTER TABLE "Ingredient" ALTER COLUMN "category" TYPE "IngredientCategory_new" USING ("category"::text::"IngredientCategory_new");
ALTER TABLE "ShoppingListItem" ALTER COLUMN "category" TYPE "IngredientCategory_new" USING ("category"::text::"IngredientCategory_new");
ALTER TYPE "IngredientCategory" RENAME TO "IngredientCategory_old";
ALTER TYPE "IngredientCategory_new" RENAME TO "IngredientCategory";
DROP TYPE "public"."IngredientCategory_old";
COMMIT;
