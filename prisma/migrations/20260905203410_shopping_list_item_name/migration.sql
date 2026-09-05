/*
  Warnings:

  - You are about to drop the column `customName` on the `ShoppingListItem` table. All the data in the column will be lost.
  - Added the required column `name` to the `ShoppingListItem` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "ShoppingListItem" DROP COLUMN "customName",
ADD COLUMN     "name" TEXT NOT NULL;
