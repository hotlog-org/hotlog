-- Parent/reviewer only: run AFTER ALL FIVE forward migrations
-- (20261004160001 through 20261004160005), on one pinned authorized Hotlog or
-- isolated connection as postgres, with unconditional ROLLBACK in the runner's
-- finally block. Recheck auth/public triggers for external effects first.
-- Disposable fixture users only; no Auth API, mail, real users or sequence writes.
-- This does not certify GoTrue deletion, cookie behavior or concurrent sessions.
BEGIN;
SET LOCAL statement_timeout = '15s';
SET LOCAL lock_timeout = '3s';
SET LOCAL idle_in_transaction_session_timeout = '30s';

DO $$
DECLARE
  v_owner uuid := gen_random_uuid();
  v_member uuid := gen_random_uuid();
  v_outsider uuid := gen_random_uuid();
  v_project uuid := gen_random_uuid();
  v_other uuid := gen_random_uuid();
  v_missing_membership uuid := gen_random_uuid();
  v_role uuid := gen_random_uuid();
  v_other_role uuid := gen_random_uuid();
BEGIN
  IF has_function_privilege('anon', 'public.leave_project(uuid)', 'EXECUTE')
    OR has_function_privilege('anon', 'public.prepare_account_deletion()', 'EXECUTE')
    OR has_function_privilege('anon', 'public.list_user_projects()', 'EXECUTE') THEN
    RAISE EXCEPTION 'Anonymous account-settings access';
  END IF;
  IF NOT has_function_privilege('authenticated', 'public.leave_project(uuid)', 'EXECUTE')
    OR NOT has_function_privilege('authenticated', 'public.prepare_account_deletion()', 'EXECUTE')
    OR NOT has_function_privilege('authenticated', 'public.list_user_projects()', 'EXECUTE') THEN
    RAISE EXCEPTION 'Missing authenticated account-settings access';
  END IF;
  INSERT INTO auth.users (id, email) VALUES
    (v_owner, v_owner::text || '@settings.invalid'),
    (v_member, v_member::text || '@settings.invalid'),
    (v_outsider, v_outsider::text || '@settings.invalid');
  INSERT INTO public.projects (id, creator_id, name) VALUES
    (v_project, v_owner, 'settings project'),
    (v_other, v_owner, 'settings other project'),
    (v_missing_membership, v_owner, 'settings owner without membership');
  INSERT INTO public.user_projects (user_id, project_id) VALUES
    (v_owner, v_project), (v_owner, v_other),
    (v_member, v_project), (v_member, v_project), (v_member, v_other);
  INSERT INTO public.roles (id, project_id, name) VALUES
    (v_role, v_project, 'settings role'), (v_other_role, v_other, 'settings other role');
  INSERT INTO public.user_roles (user_id, role_id) VALUES
    (v_member, v_role), (v_member, v_other_role);
  INSERT INTO public.permissions (action, subject) VALUES ('delete', 'projects')
    ON CONFLICT (action, subject) DO NOTHING;
  INSERT INTO public.role_permissions (role_id, permission_id)
    SELECT v_other_role, id FROM public.permissions WHERE action = 'delete' AND subject = 'projects';

  PERFORM set_config('request.jwt.claim.sub', v_owner::text, true);
  SET LOCAL ROLE authenticated;
  IF (SELECT count(*) FROM public.list_user_projects()) <> 3 THEN
    RAISE EXCEPTION 'Owner projects missing (including missing membership)';
  END IF;
  IF EXISTS (SELECT 1 FROM public.list_user_projects() WHERE NOT can_delete) THEN
    RAISE EXCEPTION 'Owner delete capability missing';
  END IF;
  BEGIN
    PERFORM public.prepare_account_deletion();
    RAISE EXCEPTION 'Owner deletion preflight unexpectedly succeeded';
  EXCEPTION WHEN foreign_key_violation THEN
    IF SQLERRM <> 'Delete your owned projects before deleting your account' THEN RAISE; END IF;
  END;
  BEGIN
    PERFORM public.leave_project(v_project);
    RAISE EXCEPTION 'Owner leave unexpectedly succeeded';
  EXCEPTION WHEN insufficient_privilege THEN
    IF SQLERRM <> 'Project owners cannot leave their projects' THEN RAISE; END IF;
  END;
  RESET ROLE;
  -- Even privileged Auth deletion cannot bypass the ownership FK.
  BEGIN
    DELETE FROM auth.users WHERE id = v_owner;
    RAISE EXCEPTION 'Ownership FK allowed implicit project deletion';
  EXCEPTION WHEN foreign_key_violation THEN NULL;
  END;
  IF NOT EXISTS (SELECT 1 FROM public.projects WHERE id = v_project) THEN
    RAISE EXCEPTION 'Project disappeared after blocked account deletion';
  END IF;

  PERFORM set_config('request.jwt.claim.sub', v_outsider::text, true);
  SET LOCAL ROLE authenticated;
  IF EXISTS (SELECT 1 FROM public.list_user_projects()) THEN
    RAISE EXCEPTION 'Outsider project disclosure';
  END IF;
  BEGIN
    PERFORM public.leave_project(v_project);
    RAISE EXCEPTION 'Outsider leave unexpectedly succeeded';
  EXCEPTION WHEN no_data_found THEN
    IF SQLERRM <> 'Project membership not found' THEN RAISE; END IF;
  END;
  RESET ROLE;

  PERFORM set_config('request.jwt.claim.sub', v_member::text, true);
  SET LOCAL ROLE authenticated;
  IF (SELECT can_delete FROM public.list_user_projects() WHERE id = v_project) IS DISTINCT FROM false
    OR (SELECT can_delete FROM public.list_user_projects() WHERE id = v_other) IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'Project-specific delete capabilities incorrect';
  END IF;
  IF public.prepare_account_deletion() <> v_member THEN
    RAISE EXCEPTION 'Deletion preflight returned another identity';
  END IF;
  IF public.leave_project(v_project) <> v_project THEN
    RAISE EXCEPTION 'Leave returned another project';
  END IF;
  IF (SELECT count(*) FROM public.list_user_projects()) <> 1 THEN
    RAISE EXCEPTION 'Leave did not remove only the target project';
  END IF;
  RESET ROLE;
  IF EXISTS (SELECT 1 FROM public.user_projects WHERE user_id = v_member AND project_id = v_project)
    OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = v_member AND role_id = v_role) THEN
    RAISE EXCEPTION 'Duplicate membership or target role survived leave';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = v_member AND role_id = v_other_role)
    OR NOT EXISTS (SELECT 1 FROM public.user_projects WHERE user_id = v_owner AND project_id = v_project) THEN
    RAISE EXCEPTION 'Leave affected another project or another user';
  END IF;
  DELETE FROM auth.users WHERE id = v_member;
  IF (SELECT count(*) FROM public.projects WHERE creator_id = v_owner) <> 3 THEN
    RAISE EXCEPTION 'Deleting a member deleted joined projects';
  END IF;
END;
$$;
ROLLBACK;
