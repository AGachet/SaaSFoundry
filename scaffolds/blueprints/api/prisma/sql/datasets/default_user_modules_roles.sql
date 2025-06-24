------
-- 1. Default user roles
------
INSERT INTO public.roles (name, description, is_active, updated_at)
VALUES
  ('guest', 'Non-authenticated user', TRUE, NOW()),
  ('user', 'Basic authenticated user', TRUE, NOW()),
  ('admin', 'Administrator user', TRUE, NOW());

------
-- 2. Default module types
------
INSERT INTO public.module_types (name, description)
VALUES
  ('USER_MANAGEMENT', 'User management-related modules'),
  ('ACCOUNT_MANAGEMENT', 'Account management-related modules'),
  ('ORGANIZATION_MANAGEMENT', 'Organization management-related modules');

------
-- 3. Default modules
------
INSERT INTO public.modules (name, type_id, version, description, is_active)
VALUES
  ('USER_ACCOUNT_CREATION', (SELECT id FROM public.module_types WHERE name = 'USER_MANAGEMENT'), '1.0.0', 'User account creation module', TRUE),
  ('USER_ACCOUNT_PASSWORD_RECOVERY', (SELECT id FROM public.module_types WHERE name = 'USER_MANAGEMENT'), '1.0.0', 'User password recovery module', TRUE),
  ('ACCOUNT_ADMINISTRATION', (SELECT id FROM public.module_types WHERE name = 'ACCOUNT_MANAGEMENT'), '1.0.0', 'Account management module', TRUE),
  ('ORGANIZATION_ADMINISTRATION', (SELECT id FROM public.module_types WHERE name = 'ORGANIZATION_MANAGEMENT'), '1.0.0', 'Organization management module', TRUE);

------
-- 4. Default permissions by module
------
INSERT INTO public.module_permissions (module_id, name, description, updated_at)
VALUES
  -- user_account_creation module permissions
  ((SELECT id FROM public.modules WHERE name = 'USER_ACCOUNT_CREATION'), 'USER_ACCOUNT_CREATE_OWN', 'Create a personal user account', NOW()),
  -- password_recovery module permissions
  ((SELECT id FROM public.modules WHERE name = 'USER_ACCOUNT_PASSWORD_RECOVERY'), 'PASSWORD_RECOVERY_LINK_REQUEST_OWN', 'Request a password recovery link for own account', NOW()),
  ((SELECT id FROM public.modules WHERE name = 'USER_ACCOUNT_PASSWORD_RECOVERY'), 'PASSWORD_RECOVERY_RESET_OWN', 'Reset own password using a valid token', NOW()),
  -- account_administration module permissions
  ((SELECT id FROM public.modules WHERE name = 'ACCOUNT_ADMINISTRATION'), 'ACCOUNT_UPDATE', 'Update an account', NOW()),
  ((SELECT id FROM public.modules WHERE name = 'ACCOUNT_ADMINISTRATION'), 'ACCOUNT_USER_MANAGEMENT', 'Manage account users', NOW()),
  ((SELECT id FROM public.modules WHERE name = 'ACCOUNT_ADMINISTRATION'), 'ACCOUNT_ENTITY_MANAGEMENT', 'Manage account entities', NOW()),
  ((SELECT id FROM public.modules WHERE name = 'ACCOUNT_ADMINISTRATION'), 'USER_ACCOUNTS_INVITATION', 'Invite users to an account', NOW()),
  ((SELECT id FROM public.modules WHERE name = 'ACCOUNT_ADMINISTRATION'), 'USER_ENTITIES_INVITATION', 'Invite users to an entity', NOW()),
  ((SELECT id FROM public.modules WHERE name = 'ACCOUNT_ADMINISTRATION'), 'USER_ROLE_ALLOCATION', 'Allocate roles to users', NOW()),
  ((SELECT id FROM public.modules WHERE name = 'ACCOUNT_ADMINISTRATION'), 'ENTITY_CREATION', 'Create an entity', NOW()),
  ((SELECT id FROM public.modules WHERE name = 'ACCOUNT_ADMINISTRATION'), 'ENTITY_USER_MANAGEMENT', 'Manage entity users', NOW()),
  -- organization_management module permissions
  ((SELECT id FROM public.modules WHERE name = 'ORGANIZATION_ADMINISTRATION'), 'ORGANIZATION_CREATION', 'Create an organization', NOW()),
  ((SELECT id FROM public.modules WHERE name = 'ORGANIZATION_ADMINISTRATION'), 'ORGANIZATION_UPDATE', 'Update an organization', NOW());


------
-- 5. Link roles to authorized modules
------
INSERT INTO public.roles_modules_links (role_id, module_id, updated_at)
VALUES
  -- guest role modules
  ((SELECT id FROM public.roles WHERE name = 'guest'), (SELECT id FROM public.modules WHERE name = 'USER_ACCOUNT_CREATION'), NOW()),
  ((SELECT id FROM public.roles WHERE name = 'guest'), (SELECT id FROM public.modules WHERE name = 'USER_ACCOUNT_PASSWORD_RECOVERY'), NOW()),
  -- user role modules
  ((SELECT id FROM public.roles WHERE name = 'user'), (SELECT id FROM public.modules WHERE name = 'USER_ACCOUNT_PASSWORD_RECOVERY'), NOW()),
  -- admin role modules
  ((SELECT id FROM public.roles WHERE name = 'admin'), (SELECT id FROM public.modules WHERE name = 'ACCOUNT_ADMINISTRATION'), NOW()),
  ((SELECT id FROM public.roles WHERE name = 'admin'), (SELECT id FROM public.modules WHERE name = 'ORGANIZATION_ADMINISTRATION'), NOW()),
  ((SELECT id FROM public.roles WHERE name = 'admin'), (SELECT id FROM public.modules WHERE name = 'USER_ACCOUNT_PASSWORD_RECOVERY'), NOW());

------
-- 6. Link roles to authorized permissions
------
INSERT INTO public.roles_permissions_links (role_id, permission_id, updated_at)
VALUES
  -- guest role permissions
  ((SELECT id FROM public.roles WHERE name = 'guest'), (SELECT id FROM public.module_permissions WHERE name = 'USER_ACCOUNT_CREATE_OWN'), NOW()),
  -- user role permissions
  ((SELECT id FROM public.roles WHERE name = 'user'), (SELECT id FROM public.module_permissions WHERE name = 'PASSWORD_RECOVERY_LINK_REQUEST_OWN'), NOW()),
  ((SELECT id FROM public.roles WHERE name = 'user'), (SELECT id FROM public.module_permissions WHERE name = 'PASSWORD_RECOVERY_RESET_OWN'), NOW()),
  -- admin role permissions
  ((SELECT id FROM public.roles WHERE name = 'admin'), (SELECT id FROM public.module_permissions WHERE name = 'PASSWORD_RECOVERY_LINK_REQUEST_OWN'), NOW()),
  ((SELECT id FROM public.roles WHERE name = 'admin'), (SELECT id FROM public.module_permissions WHERE name = 'PASSWORD_RECOVERY_RESET_OWN'), NOW()),
  ((SELECT id FROM public.roles WHERE name = 'admin'), (SELECT id FROM public.module_permissions WHERE name = 'ACCOUNT_UPDATE'), NOW()),
  ((SELECT id FROM public.roles WHERE name = 'admin'), (SELECT id FROM public.module_permissions WHERE name = 'ACCOUNT_USER_MANAGEMENT'), NOW()),
  ((SELECT id FROM public.roles WHERE name = 'admin'), (SELECT id FROM public.module_permissions WHERE name = 'ACCOUNT_ENTITY_MANAGEMENT'), NOW()),
  ((SELECT id FROM public.roles WHERE name = 'admin'), (SELECT id FROM public.module_permissions WHERE name = 'ENTITY_CREATION'), NOW()),
  ((SELECT id FROM public.roles WHERE name = 'admin'), (SELECT id FROM public.module_permissions WHERE name = 'USER_ACCOUNTS_INVITATION'), NOW()),
  ((SELECT id FROM public.roles WHERE name = 'admin'), (SELECT id FROM public.module_permissions WHERE name = 'USER_ENTITIES_INVITATION'), NOW()),
  ((SELECT id FROM public.roles WHERE name = 'admin'), (SELECT id FROM public.module_permissions WHERE name = 'USER_ROLE_ALLOCATION'), NOW()),
  ((SELECT id FROM public.roles WHERE name = 'admin'), (SELECT id FROM public.module_permissions WHERE name = 'ENTITY_USER_MANAGEMENT'), NOW()),
  ((SELECT id FROM public.roles WHERE name = 'admin'), (SELECT id FROM public.module_permissions WHERE name = 'ORGANIZATION_CREATION'), NOW()),
  ((SELECT id FROM public.roles WHERE name = 'admin'), (SELECT id FROM public.module_permissions WHERE name = 'ORGANIZATION_UPDATE'), NOW());


------
-- 7. Create the technical guest user account
------
DO $$
DECLARE
  user_id UUID;
BEGIN
  -- Create user record without a People association (not needed)
  INSERT INTO public.users (id, is_active, email, password, updated_at)
  VALUES (gen_random_uuid(), TRUE, 'user@appguest.com', 'passwordNotUsed', NOW())
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