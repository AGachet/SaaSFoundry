-- DropForeignKey
ALTER TABLE "users_roles_links" DROP CONSTRAINT "users_roles_links_user_id_fkey";

-- AddForeignKey
ALTER TABLE "users_roles_links" ADD CONSTRAINT "users_roles_links_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
