/*
  Warnings:

  - You are about to drop the column `guestName` on the `Memory` table. All the data in the column will be lost.
  - You are about to drop the column `isGuest` on the `Memory` table. All the data in the column will be lost.
  - You are about to drop the column `guestToken` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the `GuestSession` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "GuestSession" DROP CONSTRAINT "GuestSession_productId_fkey";

-- DropIndex
DROP INDEX "Product_guestToken_key";

-- AlterTable
ALTER TABLE "Memory" DROP COLUMN "guestName",
DROP COLUMN "isGuest";

-- AlterTable
ALTER TABLE "Product" DROP COLUMN "guestToken";

-- DropTable
DROP TABLE "GuestSession";
