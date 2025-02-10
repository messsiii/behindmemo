/*
  Warnings:

  - You are about to drop the column `quota` on the `users` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "letters" ADD COLUMN     "metadata" JSONB,
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'pending';

-- AlterTable
ALTER TABLE "users" DROP COLUMN "quota",
ADD COLUMN     "credits" INTEGER NOT NULL DEFAULT 2;
