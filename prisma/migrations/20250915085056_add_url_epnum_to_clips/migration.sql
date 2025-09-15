/*
  Warnings:

  - Added the required column `url` to the `clips` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."clips" ADD COLUMN     "epnum" TEXT,
ADD COLUMN     "url" TEXT NOT NULL;
