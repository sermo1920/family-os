-- CreateEnum
CREATE TYPE "MemberColor" AS ENUM ('RED', 'ORANGE', 'AMBER', 'GREEN', 'TEAL', 'BLUE', 'INDIGO', 'PURPLE', 'PINK');

-- AlterTable
ALTER TABLE "Member" ADD COLUMN     "color" "MemberColor";
