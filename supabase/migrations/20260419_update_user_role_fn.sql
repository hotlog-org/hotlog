-- Security definer function to update a user's role in a project
-- Requires create:users permission (since assigning roles is part of user management)
CREATE OR REPLACE FUNCTION update_user_role(
  p_project_id UUID,
  p_user_id UUID,
  p_role_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check caller has permission to manage users
  IF NOT (
    is_project_creator(p_project_id)
    OR has_permission(p_project_id, 'create', 'users')
    OR has_permission(p_project_id, 'update', 'roles')
  ) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  -- Remove existing roles for this user in this project
  DELETE FROM user_roles
  WHERE user_id = p_user_id
    AND role_id IN (SELECT id FROM roles WHERE project_id = p_project_id);

  -- Assign the new role
  INSERT INTO user_roles (user_id, role_id)
  VALUES (p_user_id, p_role_id);
END;
$$;
