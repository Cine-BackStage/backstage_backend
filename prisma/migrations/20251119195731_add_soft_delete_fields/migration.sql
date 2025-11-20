-- AlterTable
ALTER TABLE "movie" ADD COLUMN "deleted_at" TIMESTAMP(6);

-- AlterTable
ALTER TABLE "room" ADD COLUMN "deleted_at" TIMESTAMP(6);

-- AlterTable
ALTER TABLE "session" ADD COLUMN "deleted_at" TIMESTAMP(6);

-- CreateIndex
CREATE INDEX "movie_company_id_deleted_at_idx" ON "movie"("company_id", "deleted_at");

-- CreateIndex
CREATE INDEX "room_company_id_deleted_at_idx" ON "room"("company_id", "deleted_at");

-- CreateIndex
CREATE INDEX "session_company_id_deleted_at_idx" ON "session"("company_id", "deleted_at");
