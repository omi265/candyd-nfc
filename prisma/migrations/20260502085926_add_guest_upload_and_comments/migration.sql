-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "autoApproveGuestUploads" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "comments" TEXT,
ADD COLUMN     "enableGuestUploadButton" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "guestUploadPassword" TEXT;
