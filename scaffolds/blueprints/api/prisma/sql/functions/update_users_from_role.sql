-------------------------------------------------------------
-- Function triggered when the status of a role is updated --
-- to deactivate users who have NO other active role,      --
-- while updating the role modification dates and the      --
-- concerned users.                                        --
-------------------------------------------------------------

CREATE OR REPLACE
  FUNCTION public.update_users_from_role()
    RETURNS TRIGGER
    LANGUAGE plpgsql
  AS
$$
BEGIN
  NEW.updated_at = NOW();

  IF NEW.is_active = false THEN

    -- Deactivate only users who have NO other active role
    UPDATE public.users
    SET is_active = false, updated_at = NOW()
    WHERE id IN (
      SELECT url.user_id
      FROM public.users_roles_links url
      WHERE url.role_id = NEW.id
      AND url.user_id NOT IN (
        SELECT url2.user_id
        FROM public.users_roles_links url2
        INNER JOIN public.roles r ON r.id = url2.role_id
        WHERE r.is_active = TRUE AND url2.role_id != NEW.id
      )
    );

  END IF;
  RETURN NEW;

END;
$$;
