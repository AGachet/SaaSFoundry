-- This is an empty migration.-- Function: update_users_from_role.sql
-------------------------------------------------------------
-- Function triggered when the status of a role is updated --
-- to deactivate all users who only have this active role, --
-- while updating the role modification dates and the      --
-- concerned users.                                        --
-------------------------------------------------------------

CREATE OR REPLACE
  FUNCTION public.update_users_from_role()
    RETURNS TRIGGER
    LANGUAGE plpgsql
  AS
$$
DECLARE v_users INT;
BEGIN
  NEW.updated_at = NOW();

  IF NEW.is_active = false THEN

    SELECT COUNT(user_id) INTO v_users
      FROM public.users_roles_links
      WHERE role_id = NEW.id
    AND user_id IN (
      SELECT user_id
      FROM public.users_roles_links
      INNER JOIN public.roles ON public.roles.id = public.users_roles_links.role_id
      WHERE public.roles.is_active = TRUE AND role_id != NEW.id
    );

    IF v_users = 0 THEN
      UPDATE public.users
      SET
        is_active = NEW.is_active,
        updated_at = NEW.updated_at
      WHERE id IN (
        SELECT user_id
        FROM public.users_roles_links
        WHERE role_id = NEW.id
      );
    END IF;

    UPDATE public.roles
      SET
        updated_at = NEW.updated_at
    WHERE id = NEW.id;

  END IF;
  RETURN NEW;

END;
$$;
-- Trigger: update_users_from_role.sql
CREATE TRIGGER update_users_from_role
  AFTER UPDATE OF is_active ON public.roles
  FOR EACH ROW
    EXECUTE PROCEDURE public.update_users_from_role();


