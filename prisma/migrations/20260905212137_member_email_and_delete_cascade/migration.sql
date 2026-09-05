-- DropForeignKey
ALTER TABLE "MealAttendance" DROP CONSTRAINT "MealAttendance_memberId_fkey";

-- DropForeignKey
ALTER TABLE "NutritionGoal" DROP CONSTRAINT "NutritionGoal_memberId_fkey";

-- AlterTable
ALTER TABLE "Member" ADD COLUMN     "email" TEXT;

-- AddForeignKey
ALTER TABLE "NutritionGoal" ADD CONSTRAINT "NutritionGoal_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MealAttendance" ADD CONSTRAINT "MealAttendance_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;
