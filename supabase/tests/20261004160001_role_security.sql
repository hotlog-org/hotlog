-- Parent/reviewer only: run AFTER ALL FOUR forward migrations
-- (20261004160001 through 20261004160004) are deployed, on one pinned Hotlog
-- connection as postgres, with unconditional ROLLBACK in
-- the runner's finally block (including on SQL errors). Never use split HTTP
-- requests for this transaction. No real users, Auth API, mail or identity
-- sequences are used. Recheck auth/public triggers for external effects first.
-- This single-connection fixture does NOT prove multi-session serialization.
BEGIN;
SET LOCAL statement_timeout = '15s';
SET LOCAL lock_timeout = '3s';
SET LOCAL idle_in_transaction_session_timeout = '30s';

DO $$
DECLARE
  v_creator uuid := gen_random_uuid();
  v_member uuid := gen_random_uuid();
  v_manager uuid := gen_random_uuid();
  v_outsider uuid := gen_random_uuid();
  v_invitee uuid := gen_random_uuid();
  v_project uuid := gen_random_uuid();
  v_other_project uuid := gen_random_uuid();
  v_owner_role uuid := gen_random_uuid();
  v_old_role uuid := gen_random_uuid();
  v_new_role uuid := gen_random_uuid();
  v_foreign_role uuid := gen_random_uuid();
  v_create_role uuid := gen_random_uuid();
  v_update_role uuid := gen_random_uuid();
  v_permission_role uuid := gen_random_uuid();
  v_token uuid := gen_random_uuid();
  v_result json;
  v_caller text;
  v_member_attempt uuid;
  v_nonmember_attempt uuid;
  v_member_denial text;
  v_nonmember_denial text;
BEGIN
  -- ACL checks include PUBLIC inheritance, not only explicit anon grants.
  IF has_function_privilege('anon', 'public.update_user_role(uuid,uuid,uuid)', 'EXECUTE')
     OR has_function_privilege('anon', 'public.has_permission(uuid,text,text)', 'EXECUTE')
     OR has_function_privilege('authenticated', 'public.require_user_role_membership()', 'EXECUTE') THEN
    RAISE EXCEPTION 'Unexpected public/anon/trigger execute privilege';
  END IF;
  IF NOT has_function_privilege('authenticated', 'public.update_user_role(uuid,uuid,uuid)', 'EXECUTE')
     OR NOT has_function_privilege('authenticated', 'public.has_permission(uuid,text,text)', 'EXECUTE') THEN
    RAISE EXCEPTION 'Missing authenticated RPC/helper privilege';
  END IF;

  INSERT INTO auth.users (id, email) VALUES
    (v_creator, v_creator::text || '@roles.invalid'),
    (v_member, v_member::text || '@roles.invalid'),
    (v_manager, v_manager::text || '@roles.invalid'),
    (v_outsider, v_outsider::text || '@roles.invalid'),
    (v_invitee, v_invitee::text || '@roles.invalid');
  INSERT INTO public.projects (id, creator_id, name) VALUES
    (v_project, v_creator, 'role security fixture'),
    (v_other_project, v_creator, 'role security foreign fixture');
  INSERT INTO public.user_projects (user_id, project_id) VALUES
    (v_creator, v_project), (v_creator, v_other_project),
    (v_member, v_project), (v_member, v_other_project),
    (v_manager, v_project);
  -- Existing schema permits duplicate memberships; swaps must handle all rows.
  INSERT INTO public.user_projects (user_id, project_id) VALUES (v_member, v_project);
  INSERT INTO public.roles (id, project_id, name) VALUES
    (v_owner_role, v_project, 'Owner'),
    (v_old_role, v_project, 'Old'),
    (v_new_role, v_project, 'New'),
    (v_foreign_role, v_other_project, 'Foreign'),
    (v_create_role, v_project, 'Create users'),
    (v_update_role, v_project, 'Update roles'),
    (v_permission_role, v_project, 'Permission semantics');
  INSERT INTO public.permissions (action, subject) VALUES
    ('create', 'users'), ('update', 'roles'),
    ('create', 'all'), ('read', 'events'), ('manage', 'all')
  ON CONFLICT (action, subject) DO NOTHING;
  INSERT INTO public.role_permissions (role_id, permission_id)
    SELECT v_create_role, id FROM public.permissions WHERE action = 'create' AND subject = 'users';
  INSERT INTO public.role_permissions (role_id, permission_id)
    SELECT v_update_role, id FROM public.permissions WHERE action = 'update' AND subject = 'roles';
  INSERT INTO public.role_permissions (role_id, permission_id)
    SELECT v_permission_role, id FROM public.permissions
    WHERE (action = 'create' AND subject = 'all')
       OR (action = 'read' AND subject = 'events')
       OR (action = 'manage' AND subject = 'all');
  INSERT INTO public.user_roles (user_id, role_id) VALUES
    (v_member, v_old_role), (v_member, v_foreign_role), (v_manager, v_create_role);

  -- Unauthorized foreign-role writes must fail at RLS, before the definer
  -- trigger can disclose membership or acquire its privileged membership locks.
  -- Exercise a logged-in outsider, an authenticated role with no UID, and anon.
  FOREACH v_caller IN ARRAY ARRAY['outsider', 'missing uid', 'anon'] LOOP
    v_member_attempt := gen_random_uuid();
    v_nonmember_attempt := gen_random_uuid();
    IF v_caller = 'outsider' THEN
      PERFORM set_config('request.jwt.claim.sub', v_outsider::text, true);
      PERFORM set_config('request.jwt.claims', json_build_object('sub', v_outsider, 'role', 'authenticated')::text, true);
    ELSE
      PERFORM set_config('request.jwt.claim.sub', '', true);
      PERFORM set_config('request.jwt.claims', '{}', true);
    END IF;
    IF v_caller = 'anon' THEN
      SET LOCAL ROLE anon;
    ELSE
      SET LOCAL ROLE authenticated;
    END IF;

    BEGIN
      INSERT INTO public.user_roles (id, user_id, role_id)
        VALUES (v_member_attempt, v_member, v_foreign_role);
      RAISE EXCEPTION 'Unauthorized foreign-role assignment to member was accepted (%)', v_caller;
    EXCEPTION WHEN SQLSTATE '42501' THEN
      GET STACKED DIAGNOSTICS v_member_denial = MESSAGE_TEXT;
    END;
    BEGIN
      INSERT INTO public.user_roles (id, user_id, role_id)
        VALUES (v_nonmember_attempt, v_outsider, v_foreign_role);
      RAISE EXCEPTION 'Unauthorized foreign-role assignment to nonmember was accepted (%)', v_caller;
    EXCEPTION WHEN SQLSTATE '42501' THEN
      GET STACKED DIAGNOSTICS v_nonmember_denial = MESSAGE_TEXT;
    END;
    IF v_member_denial IS DISTINCT FROM v_nonmember_denial
       OR v_member_denial IS DISTINCT FROM 'new row violates row-level security policy for table "user_roles"' THEN
      RAISE EXCEPTION 'Foreign-role denial was not the same RLS error for member/nonmember (%)', v_caller;
    END IF;
    RESET ROLE;
    IF EXISTS (SELECT 1 FROM public.user_roles WHERE id IN (v_member_attempt, v_nonmember_attempt)) THEN
      RAISE EXCEPTION 'Rejected foreign-role assignment persisted (%)', v_caller;
    END IF;
  END LOOP;

  PERFORM set_config('request.jwt.claim.sub', v_creator::text, true);
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_creator, 'role', 'authenticated')::text, true);
  SET LOCAL ROLE authenticated;

  -- Creator bootstrap does not depend on any preexisting role permissions.
  IF public.has_permission(v_project, 'create', 'users') THEN
    RAISE EXCEPTION 'Creator unexpectedly has implicit role permissions';
  END IF;
  INSERT INTO public.user_roles (user_id, role_id) VALUES (v_creator, v_owner_role);
  PERFORM public.update_user_role(v_project, v_member, v_new_role);
  IF (SELECT count(*) FROM public.user_roles ur JOIN public.roles r ON r.id = ur.role_id
      WHERE ur.user_id = v_member AND r.project_id = v_project) <> 1
     OR NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = v_member AND role_id = v_new_role)
     OR NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = v_member AND role_id = v_foreign_role) THEN
    RAISE EXCEPTION 'Swap did not replace only the supplied project roles';
  END IF;

  -- Target belongs to BOTH projects: membership alone must not allow foreign role.
  BEGIN
    PERFORM public.update_user_role(v_project, v_member, v_foreign_role);
    RAISE EXCEPTION 'Foreign role was accepted';
  EXCEPTION WHEN SQLSTATE '22023' THEN NULL;
  END;
  BEGIN
    PERFORM public.update_user_role(v_project, v_member, gen_random_uuid());
    RAISE EXCEPTION 'Missing role was accepted';
  EXCEPTION WHEN SQLSTATE '22023' THEN NULL;
  END;
  BEGIN
    PERFORM public.update_user_role(v_project, v_outsider, v_new_role);
    RAISE EXCEPTION 'Nonmember was accepted';
  EXCEPTION WHEN SQLSTATE '22023' THEN NULL;
  END;
  BEGIN
    PERFORM public.update_user_role(v_project, v_member, NULL);
    RAISE EXCEPTION 'Null role was accepted';
  EXCEPTION WHEN SQLSTATE '22023' THEN NULL;
  END;
  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = v_member AND role_id = v_new_role) THEN
    RAISE EXCEPTION 'Rejected swaps removed the old assignment';
  END IF;

  -- Both existing authorization alternatives remain sufficient.
  PERFORM set_config('request.jwt.claim.sub', v_manager::text, true);
  PERFORM public.update_user_role(v_project, v_member, v_old_role);
  INSERT INTO public.user_roles (user_id, role_id) VALUES (v_member, v_new_role);
  BEGIN
    INSERT INTO public.user_roles (user_id, role_id) VALUES (v_outsider, v_new_role);
    RAISE EXCEPTION 'Direct nonmember insert was accepted';
  EXCEPTION WHEN SQLSTATE '22023' THEN NULL;
  END;
  RESET ROLE;
  DELETE FROM public.user_roles WHERE user_id = v_manager;
  INSERT INTO public.user_roles (user_id, role_id) VALUES (v_manager, v_update_role);
  SET LOCAL ROLE authenticated;
  PERFORM public.update_user_role(v_project, v_member, v_new_role);

  PERFORM set_config('request.jwt.claim.sub', v_member::text, true);
  BEGIN
    PERFORM public.update_user_role(v_project, v_manager, v_new_role);
    RAISE EXCEPTION 'Unprivileged member could swap roles';
  EXCEPTION WHEN SQLSTATE '42501' THEN NULL;
  END;
  PERFORM set_config('request.jwt.claim.sub', v_outsider::text, true);
  BEGIN
    PERFORM public.update_user_role(v_project, v_member, v_new_role);
    RAISE EXCEPTION 'Outsider could swap roles';
  EXCEPTION WHEN SQLSTATE '42501' THEN NULL;
  END;
  PERFORM set_config('request.jwt.claim.sub', '', true);
  PERFORM set_config('request.jwt.claims', '{}', true);
  BEGIN
    PERFORM public.update_user_role(v_project, v_member, v_new_role);
    RAISE EXCEPTION 'Missing auth.uid was accepted';
  EXCEPTION WHEN SQLSTATE '28000' THEN NULL;
  END;
  SET LOCAL ROLE anon;
  BEGIN
    PERFORM public.update_user_role(v_project, v_member, v_new_role);
    RAISE EXCEPTION 'Anon could execute role RPC';
  EXCEPTION WHEN SQLSTATE '42501' THEN NULL;
  END;
  RESET ROLE;

  -- The trigger also guards definer/admin inserts and assignment updates.
  BEGIN
    INSERT INTO public.user_roles (user_id, role_id) VALUES (v_outsider, v_new_role);
    RAISE EXCEPTION 'Privileged nonmember insert was accepted';
  EXCEPTION WHEN SQLSTATE '22023' THEN NULL;
  END;
  BEGIN
    UPDATE public.user_roles SET user_id = v_outsider
    WHERE user_id = v_member AND role_id = v_new_role;
    RAISE EXCEPTION 'Privileged nonmember update was accepted';
  EXCEPTION WHEN SQLSTATE '22023' THEN NULL;
  END;

  INSERT INTO public.user_roles (user_id, role_id) VALUES (v_member, v_permission_role);
  PERFORM set_config('request.jwt.claim.sub', v_member::text, true);
  SET LOCAL ROLE authenticated;
  IF NOT public.has_permission(v_project, 'create', 'events')
     OR NOT public.has_permission(v_project, 'read', 'events')
     OR public.has_permission(v_project, 'read', 'schemas')
     OR public.has_permission(v_project, 'delete', 'events')
     OR public.has_permission(v_project, 'update', 'events')
     OR public.has_permission(v_other_project, 'create', 'events') THEN
    RAISE EXCEPTION 'Exact-action/all-subject permission semantics changed';
  END IF;
  RESET ROLE;
  -- Model a retained legacy assignment after membership removal, not a cleanup.
  DELETE FROM public.user_projects WHERE user_id = v_member AND project_id = v_project;
  SET LOCAL ROLE authenticated;
  IF public.has_permission(v_project, 'create', 'events')
     OR public.has_permission(v_project, 'read', 'events') THEN
    RAISE EXCEPTION 'Nonmember retained role permissions';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = v_member AND role_id = v_permission_role) THEN
    RAISE EXCEPTION 'Membership change unexpectedly removed existing assignments';
  END IF;
  RESET ROLE;

  -- Existing invitation acceptance writes membership before assigning its role.
  INSERT INTO public.invitations (project_id, email, role_id, invited_by, token)
    VALUES (v_project, v_invitee::text || '@roles.invalid', v_new_role, v_creator, v_token);
  PERFORM set_config('request.jwt.claim.sub', v_invitee::text, true);
  SET LOCAL ROLE authenticated;
  v_result := public.accept_invitation(v_token);
  IF (v_result->>'success')::boolean IS DISTINCT FROM true
     OR NOT EXISTS (SELECT 1 FROM public.user_projects WHERE user_id = v_invitee AND project_id = v_project)
     OR NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = v_invitee AND role_id = v_new_role) THEN
    RAISE EXCEPTION 'Invitation membership-before-role compatibility failed';
  END IF;
  RESET ROLE;
  RAISE NOTICE 'role_security: all fixture assertions passed; rolling back';
END;
$$;
ROLLBACK;
