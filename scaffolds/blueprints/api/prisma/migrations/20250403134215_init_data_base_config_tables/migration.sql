/*
  Warnings:

  - A unique constraint covering the columns `[user_id,type]` on the table `user_tokens` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "user_tokens_user_id_type_key" ON "user_tokens"("user_id", "type");
