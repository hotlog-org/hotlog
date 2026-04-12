-- Invitations table for project membership invites
CREATE TABLE IF NOT EXISTS invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role_id UUID REFERENCES roles(id) ON DELETE SET NULL,
  invited_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'revoked')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT now() + INTERVAL '7 days'
);

-- Only one pending invitation per email per project
CREATE UNIQUE INDEX invitations_pending_unique
  ON invitations (project_id, email)
  WHERE status = 'pending';

-- Lookup by token for accept flow
CREATE INDEX invitations_token_idx ON invitations (token);

-- Enable RLS
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;

-- Helper: get project_id from invitation without RLS (avoids recursion)
CREATE OR REPLACE FUNCTION get_project_id_for_invitation(p_invitation_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT project_id FROM invitations WHERE id = p_invitation_id LIMIT 1;
$$;

-- SELECT: project members with read:users permission can see invitations
CREATE POLICY "invitations_select"
  ON invitations FOR SELECT
  TO authenticated
  USING (
    is_project_member(project_id)
  );

-- INSERT: users with create:users permission
CREATE POLICY "invitations_insert"
  ON invitations FOR INSERT
  TO authenticated
  WITH CHECK (
    has_permission(project_id, 'create', 'users')
    AND invited_by = auth.uid()
  );

-- UPDATE: users with create:users permission (for revoking)
CREATE POLICY "invitations_update"
  ON invitations FOR UPDATE
  TO authenticated
  USING (
    has_permission(project_id, 'create', 'users')
  );

-- DELETE: users with delete:users permission
CREATE POLICY "invitations_delete"
  ON invitations FOR DELETE
  TO authenticated
  USING (
    has_permission(project_id, 'delete', 'users')
  );

-- Security definer function to accept an invitation by token
-- This bypasses RLS so any authenticated user can accept their own invitation
CREATE OR REPLACE FUNCTION accept_invitation(p_token UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invitation RECORD;
  v_user_email TEXT;
  v_existing_member UUID;
BEGIN
  -- Get current user email
  SELECT email INTO v_user_email
  FROM auth.users
  WHERE id = auth.uid();

  IF v_user_email IS NULL THEN
    RETURN json_build_object('error', 'Not authenticated');
  END IF;

  -- Find the invitation
  SELECT * INTO v_invitation
  FROM invitations
  WHERE token = p_token
    AND status = 'pending'
    AND expires_at > now();

  IF v_invitation IS NULL THEN
    RETURN json_build_object('error', 'Invalid or expired invitation');
  END IF;

  -- Check email matches
  IF lower(v_invitation.email) != lower(v_user_email) THEN
    RETURN json_build_object('error', 'This invitation was sent to a different email address');
  END IF;

  -- Check if already a member
  SELECT user_id INTO v_existing_member
  FROM user_projects
  WHERE user_id = auth.uid()
    AND project_id = v_invitation.project_id;

  IF v_existing_member IS NOT NULL THEN
    -- Mark invitation as accepted even if already a member
    UPDATE invitations SET status = 'accepted' WHERE id = v_invitation.id;
    RETURN json_build_object('success', true, 'project_id', v_invitation.project_id, 'already_member', true);
  END IF;

  -- Add user to project
  INSERT INTO user_projects (user_id, project_id)
  VALUES (auth.uid(), v_invitation.project_id);

  -- Assign role if specified
  IF v_invitation.role_id IS NOT NULL THEN
    INSERT INTO user_roles (user_id, role_id)
    VALUES (auth.uid(), v_invitation.role_id);
  END IF;

  -- Mark invitation as accepted
  UPDATE invitations SET status = 'accepted' WHERE id = v_invitation.id;

  RETURN json_build_object('success', true, 'project_id', v_invitation.project_id, 'already_member', false);
END;
$$;
