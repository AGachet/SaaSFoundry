CREATE TRIGGER update_users_from_role
  AFTER UPDATE OF is_active ON public.roles
  FOR EACH ROW
    EXECUTE PROCEDURE public.update_users_from_role();

