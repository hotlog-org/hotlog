-- AUTHORED ONLY. Parent executes after review/deployment of ALL FOUR forward
-- migrations (20261004160001 through 20261004160004) on ONE pinned Hotlog
-- connection as postgres, with unconditional ROLLBACK in runner finally.
-- Recheck triggers for external effects first. Synthetic fixture users only.
-- Successful create/rotate calls advance the api_keys identity sequence even
-- after rollback. Do not reset sequences; parent must approve these gaps.
-- Single-session tests do not prove concurrent project-lock scheduling.
BEGIN;
SET LOCAL statement_timeout = '15s';
SET LOCAL lock_timeout = '3s';
SET LOCAL idle_in_transaction_session_timeout = '30s';

CREATE FUNCTION pg_temp.fail_api_key_insert() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF current_setting('hotlog.fixture.key_insert', true) = 'fail' THEN
    RAISE EXCEPTION 'fixture key insert failure';
  ELSIF current_setting('hotlog.fixture.key_insert', true) = 'skip' THEN
    RETURN NULL;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER fixture_key_insert_failure BEFORE INSERT ON public.api_keys
FOR EACH ROW EXECUTE FUNCTION pg_temp.fail_api_key_insert();
CREATE FUNCTION pg_temp.skip_api_key_update() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF current_setting('hotlog.fixture.key_update', true) = 'skip' THEN RETURN NULL; END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER fixture_key_update_failure BEFORE UPDATE ON public.api_keys
FOR EACH ROW EXECUTE FUNCTION pg_temp.skip_api_key_update();

DO $$
DECLARE
  v_user uuid := gen_random_uuid();
  v_outsider uuid := gen_random_uuid();
  v_project uuid := gen_random_uuid();
  v_other uuid := gen_random_uuid();
  v_role uuid := gen_random_uuid();
  v_old_id bigint := -800000000000 - floor(random() * 100000000000)::bigint;
  v_other_id bigint := v_old_id - 1;
  v_old_secret text := gen_random_uuid()::text;
  v_other_secret text := gen_random_uuid()::text;
  v_old_last_used timestamptz;
  v_issued record;
  v_second record;
  v_count bigint;
  v_mode text;
  v_action text;
BEGIN
  IF EXISTS (SELECT 1 FROM pg_attribute WHERE attrelid = 'public.api_keys'::regclass
    AND attname = 'key' AND NOT attisdropped) THEN
    RAISE EXCEPTION 'Plaintext column remains';
  END IF;
  IF has_function_privilege('anon', 'public.create_api_key(uuid,bigint)', 'EXECUTE')
     OR has_function_privilege('anon', 'public.revoke_api_key(bigint)', 'EXECUTE')
     OR has_function_privilege('service_role', 'public.create_api_key(uuid,bigint)', 'EXECUTE')
     OR NOT has_function_privilege('authenticated', 'public.create_api_key(uuid,bigint)', 'EXECUTE')
     OR NOT has_function_privilege('authenticated', 'public.revoke_api_key(bigint)', 'EXECUTE')
     OR has_column_privilege('authenticated', 'public.api_keys', 'key_hash', 'SELECT')
     OR has_table_privilege('authenticated', 'public.api_keys', 'INSERT,UPDATE,DELETE,TRUNCATE') THEN
    RAISE EXCEPTION 'Unexpected key ACL';
  END IF;
  INSERT INTO auth.users (id, email) VALUES
    (v_user, v_user::text || '@keys.invalid'), (v_outsider, v_outsider::text || '@keys.invalid');
  INSERT INTO public.projects (id, name, creator_id) VALUES
    (v_project, 'key fixture', v_user), (v_other, 'other key fixture', v_user);
  INSERT INTO public.user_projects (user_id, project_id) VALUES (v_user, v_project), (v_user, v_other);
  INSERT INTO public.roles (id, project_id, name) VALUES (v_role, v_project, 'key fixture');
  INSERT INTO public.user_roles (user_id, role_id) VALUES (v_user, v_role);
  INSERT INTO public.permissions (action, subject)
    SELECT a, 'api_keys' FROM unnest(ARRAY['create', 'read', 'delete']) a
    ON CONFLICT (action, subject) DO NOTHING;
  INSERT INTO public.role_permissions (role_id, permission_id)
    SELECT v_role, id FROM public.permissions WHERE subject = 'api_keys' AND action IN ('create','read','delete');
  -- Simulate retained, verified legacy hashes without ever persisting plaintext.
  INSERT INTO public.api_keys (id, project_id, key_hash, key_prefix, last_used_at) VALUES
    (v_old_id, v_project, encode(extensions.digest(v_old_secret, 'sha256'), 'hex'), left(v_old_secret,8), '2026-01-01T00:00:00Z'),
    (v_other_id, v_other, encode(extensions.digest(v_other_secret, 'sha256'), 'hex'), left(v_other_secret,8), NULL);
  PERFORM set_config('request.jwt.claim.sub', v_user::text, true);
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_user, 'role', 'authenticated')::text, true);
  SET LOCAL ROLE authenticated;
  -- Existing hash works in the SDK without a plaintext column.
  PERFORM public.get_project_schemas_for_sdk(v_old_secret);
  PERFORM id, project_id, key_prefix, last_used_at, revoked_at FROM public.api_keys WHERE project_id = v_project;
  BEGIN
    PERFORM key_hash FROM public.api_keys;
    RAISE EXCEPTION 'Hash was readable';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN
    DELETE FROM public.api_keys WHERE id = v_old_id;
    RAISE EXCEPTION 'Direct hard deletion allowed';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN
    UPDATE public.api_keys SET revoked_at = NULL WHERE id = v_old_id;
    RAISE EXCEPTION 'Direct reactivation allowed';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN
    INSERT INTO public.api_keys (project_id,key_hash,key_prefix) VALUES (v_project,repeat('a',64),repeat('a',8));
    RAISE EXCEPTION 'Direct insertion allowed';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;

  SELECT * INTO STRICT v_second FROM public.create_api_key(v_project);
  -- Failure after soft revocation must roll back that revocation too.
  FOREACH v_mode IN ARRAY ARRAY['fail','skip'] LOOP
    PERFORM set_config('hotlog.fixture.key_insert', v_mode, true);
    BEGIN
      PERFORM public.create_api_key(v_project, v_old_id);
      RAISE EXCEPTION 'Expected insertion failure' USING ERRCODE = 'XX000';
    EXCEPTION WHEN raise_exception THEN
      IF SQLERRM <> (CASE WHEN v_mode = 'fail' THEN 'fixture key insert failure'
                         ELSE 'API key creation failed' END) THEN RAISE; END IF;
    END;
    IF (SELECT revoked_at FROM public.api_keys WHERE id = v_old_id) IS NOT NULL THEN
      RAISE EXCEPTION 'Failed replacement revoked old key';
    END IF;
    PERFORM public.get_project_schemas_for_sdk(v_old_secret);
  END LOOP;
  PERFORM set_config('hotlog.fixture.key_insert', '', true);
  PERFORM set_config('hotlog.fixture.key_update', 'skip', true);
  BEGIN
    PERFORM public.create_api_key(v_project, v_old_id);
    RAISE EXCEPTION 'Suppressed revocation succeeded';
  EXCEPTION WHEN no_data_found THEN NULL; END;
  BEGIN
    PERFORM public.revoke_api_key(v_old_id);
    RAISE EXCEPTION 'Suppressed revoke succeeded';
  EXCEPTION WHEN no_data_found THEN NULL; END;
  PERFORM set_config('hotlog.fixture.key_update', '', true);
  BEGIN
    PERFORM public.create_api_key(v_project, v_other_id);
    RAISE EXCEPTION 'Foreign project key rotated';
  EXCEPTION WHEN no_data_found THEN NULL; END;
  BEGIN
    PERFORM public.create_api_key(v_project, v_other_id - 1);
    RAISE EXCEPTION 'Missing key rotated';
  EXCEPTION WHEN no_data_found THEN NULL; END;
  -- SDK lookups above legitimately touch last_used_at. Snapshot the audit
  -- immediately before rotation, rather than comparing with the seeded value.
  RESET ROLE;
  SELECT last_used_at INTO STRICT v_old_last_used FROM public.api_keys WHERE id = v_old_id;
  IF v_old_last_used IS NULL OR v_old_last_used = '2026-01-01T00:00:00Z'::timestamptz THEN
    RAISE EXCEPTION 'SDK lookup did not update legacy key audit';
  END IF;
  SET LOCAL ROLE authenticated;
  SELECT * INTO STRICT v_issued FROM public.create_api_key(v_project, v_old_id);
  IF v_issued.key !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
     OR v_issued.key_prefix <> left(v_issued.key,8) OR v_issued.revoked_at IS NOT NULL
     OR (SELECT revoked_at FROM public.api_keys WHERE id = v_old_id) IS NULL
     OR (SELECT last_used_at FROM public.api_keys WHERE id = v_old_id) IS DISTINCT FROM v_old_last_used
     OR (SELECT revoked_at FROM public.api_keys WHERE id = v_second.id) IS NOT NULL THEN
    RAISE EXCEPTION 'Replacement format, audit, or selected-key isolation failed';
  END IF;
  BEGIN
    PERFORM public.get_project_schemas_for_sdk(v_old_secret);
    RAISE EXCEPTION 'Revoked legacy key accepted' USING ERRCODE = 'XX000';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM <> 'invalid_api_key' THEN RAISE; END IF;
  END;
  PERFORM public.get_project_schemas_for_sdk(v_issued.key);
  PERFORM public.get_project_schemas_for_sdk(v_second.key);
  PERFORM public.get_project_schemas_for_sdk(v_other_secret);
  BEGIN
    PERFORM public.create_api_key(v_project, v_old_id);
    RAISE EXCEPTION 'Already revoked key rotated';
  EXCEPTION WHEN no_data_found THEN NULL; END;
  PERFORM public.revoke_api_key(v_issued.id);
  BEGIN
    PERFORM public.revoke_api_key(v_issued.id);
    RAISE EXCEPTION 'Already revoked key succeeded';
  EXCEPTION WHEN no_data_found THEN NULL; END;

  RESET ROLE;
  IF NOT EXISTS (SELECT 1 FROM public.api_keys WHERE id = v_issued.id
    AND key_hash = encode(extensions.digest(v_issued.key,'sha256'),'hex') AND revoked_at IS NOT NULL) THEN
    RAISE EXCEPTION 'Issued secret hash or revocation not persisted';
  END IF;
  SELECT count(*) INTO v_count FROM public.api_keys WHERE project_id = v_project;
  IF v_count <> 3 THEN RAISE EXCEPTION 'Failed operations left extra keys'; END IF;
  -- Constraints reject malformed/null hashes and prefixes on privileged paths.
  BEGIN
    UPDATE public.api_keys SET key_hash = NULL WHERE id = v_old_id;
    RAISE EXCEPTION 'Null hash accepted';
  EXCEPTION WHEN not_null_violation THEN NULL; END;
  BEGIN
    UPDATE public.api_keys SET key_hash = 'invalid' WHERE id = v_old_id;
    RAISE EXCEPTION 'Invalid hash accepted';
  EXCEPTION WHEN check_violation THEN NULL; END;
  BEGIN
    UPDATE public.api_keys SET key_prefix = 'invalid!' WHERE id = v_old_id;
    RAISE EXCEPTION 'Invalid prefix accepted';
  EXCEPTION WHEN check_violation THEN NULL; END;

  -- Test action equivalents independently: rotation never requires update.
  FOREACH v_action IN ARRAY ARRAY['create','delete','read'] LOOP
    DELETE FROM public.role_permissions WHERE role_id = v_role;
    INSERT INTO public.role_permissions (role_id, permission_id)
      SELECT v_role, id FROM public.permissions WHERE subject = 'api_keys' AND action = v_action;
    SET LOCAL ROLE authenticated;
    BEGIN
      PERFORM public.create_api_key(v_project, v_second.id);
      RAISE EXCEPTION 'Rotation allowed without create+delete';
    EXCEPTION WHEN insufficient_privilege THEN NULL; END;
    IF v_action = 'create' THEN
      PERFORM public.create_api_key(v_project);
      BEGIN
        PERFORM public.revoke_api_key(v_second.id);
        RAISE EXCEPTION 'Create-only caller revoked';
      EXCEPTION WHEN insufficient_privilege THEN NULL; END;
    ELSIF v_action = 'delete' THEN
      PERFORM public.revoke_api_key(v_second.id);
      BEGIN
        PERFORM public.create_api_key(v_project);
        RAISE EXCEPTION 'Delete-only caller created';
      EXCEPTION WHEN insufficient_privilege THEN NULL; END;
    ELSE
      BEGIN
        PERFORM public.create_api_key(v_project);
        RAISE EXCEPTION 'Read-only caller created';
      EXCEPTION WHEN insufficient_privilege THEN NULL; END;
    END IF;
    RESET ROLE;
  END LOOP;
  PERFORM set_config('request.jwt.claim.sub', v_outsider::text, true);
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_outsider, 'role', 'authenticated')::text, true);
  SET LOCAL ROLE authenticated;
  BEGIN
    PERFORM public.create_api_key(v_project);
    RAISE EXCEPTION 'Outsider created';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  PERFORM set_config('request.jwt.claim.sub', '', true);
  PERFORM set_config('request.jwt.claims', '{}', true);
  BEGIN
    PERFORM public.create_api_key(v_project);
    RAISE EXCEPTION 'Missing auth created';
  EXCEPTION WHEN invalid_authorization_specification THEN NULL; END;
  RESET ROLE;
  RAISE NOTICE 'API key assertions passed (no credential output)';
END;
$$;
ROLLBACK;
