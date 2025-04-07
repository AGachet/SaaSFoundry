-- This is an empty migration.-- Dataset: default_user_modules_roles.sql
------
-- 1. Default user roles
------
INSERT INTO public.roles (name, is_active, updated_at)
VALUES
  ('guest', TRUE, NOW()),
  ('user', TRUE, NOW());

------
-- 2. Default module types
------
INSERT INTO public.module_types (name, description)
VALUES
  ('USER_MANAGEMENT', 'User management-related modules');

------
-- 3. Default modules
------
INSERT INTO public.modules (name, type_id, version, description, is_active)
VALUES
  ('USER_ACCOUNT_CREATION', (SELECT id FROM public.module_types WHERE name = 'USER_MANAGEMENT'), '1.0.0', 'User account creation module', TRUE),
  ('USER_ACCOUNT_PASSWORD_RECOVERY', (SELECT id FROM public.module_types WHERE name = 'USER_MANAGEMENT'), '1.0.0', 'User password recovery module', TRUE);

------
-- 4. Default permissions by module
------
INSERT INTO public.module_permissions (module_id, name, description, updated_at)
VALUES
  -- user_account_creation module permissions
  ((SELECT id FROM public.modules WHERE name = 'USER_ACCOUNT_CREATION'), 'USER_ACCOUNT_CREATE_OWN', 'Create a personal user account', NOW()),
  -- password_recovery module permissions
  ((SELECT id FROM public.modules WHERE name = 'USER_ACCOUNT_PASSWORD_RECOVERY'), 'PASSWORD_RECOVERY_LINK_REQUEST_OWN', 'Request a password recovery link for own account', NOW()),
  ((SELECT id FROM public.modules WHERE name = 'USER_ACCOUNT_PASSWORD_RECOVERY'), 'PASSWORD_RECOVERY_RESET_OWN', 'Reset own password using a valid token', NOW());


------
-- 5. Link roles to authorized modules
------
INSERT INTO public.roles_modules_links (role_id, module_id, updated_at)
VALUES
  ((SELECT id FROM public.roles WHERE name = 'guest'), (SELECT id FROM public.modules WHERE name = 'USER_ACCOUNT_CREATION'), NOW()),
  ((SELECT id FROM public.roles WHERE name = 'guest'), (SELECT id FROM public.modules WHERE name = 'USER_ACCOUNT_PASSWORD_RECOVERY'), NOW()),
  ((SELECT id FROM public.roles WHERE name = 'user'), (SELECT id FROM public.modules WHERE name = 'USER_ACCOUNT_PASSWORD_RECOVERY'), NOW());

------
-- 6. Link roles to authorized permissions
------
INSERT INTO public.roles_permissions_links (role_id, permission_id, updated_at)
VALUES
  ((SELECT id FROM public.roles WHERE name = 'guest'), (SELECT id FROM public.module_permissions WHERE name = 'USER_ACCOUNT_CREATE_OWN'), NOW()),
  ((SELECT id FROM public.roles WHERE name = 'user'), (SELECT id FROM public.module_permissions WHERE name = 'PASSWORD_RECOVERY_LINK_REQUEST_OWN'), NOW()),
  ((SELECT id FROM public.roles WHERE name = 'user'), (SELECT id FROM public.module_permissions WHERE name = 'PASSWORD_RECOVERY_RESET_OWN'), NOW());


------
-- 7. Create the first user (guest user)
------
DO $$
DECLARE
  user_id UUID;
BEGIN
  INSERT INTO public.users (id, is_active, firstname, lastname, email, password, updated_at)
  VALUES (gen_random_uuid(), TRUE, 'User', 'Guest', 'user@appguest.com', 'passwordNotUsed', NOW())
  RETURNING id INTO user_id;

  ------
  -- 8. Default user preference (guest user)
  ------
  INSERT INTO public.user_preferences (user_id, locale, updated_at)
  VALUES (user_id, 'FR', NOW());

  ------
  -- 9. Link guest user to guest role
  ------
  INSERT INTO public.users_roles_links (user_id, role_id, updated_at)
  VALUES (user_id, 1, NOW());
END $$;
