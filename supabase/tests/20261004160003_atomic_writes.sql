-- AUTHORED ONLY: parent/reviewer executes after ALL FOUR forward migrations
-- (20261004160001 through 20261004160004) on ONE pinned Hotlog connection as
-- postgres. Runner must ROLLBACK in finally even on errors. Recheck
-- auth/public triggers for external effects first. No real users, mail, HTTP or
-- identity sequences: layouts use explicit random negative fixture IDs.
-- Temporary test policies/triggers below are transactional and fixture-gated.
-- This single-session test does not prove concurrent lock scheduling.
BEGIN;
SET LOCAL statement_timeout = '15s';
SET LOCAL lock_timeout = '3s';
SET LOCAL idle_in_transaction_session_timeout = '30s';

CREATE FUNCTION pg_temp.fail_atomic_project() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF current_setting('hotlog.fixture.fail_project', true) = 'on' THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'fixture project failure';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER fixture_atomic_project_failure BEFORE INSERT ON public.role_permissions
FOR EACH ROW EXECUTE FUNCTION pg_temp.fail_atomic_project();
CREATE POLICY fixture_atomic_empty_catalog ON public.permissions
AS RESTRICTIVE FOR SELECT TO authenticated
USING (current_setting('hotlog.fixture.hide_permissions', true) IS DISTINCT FROM 'on');

CREATE FUNCTION pg_temp.fail_atomic_components() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF current_setting('hotlog.fixture.fail_components', true) = 'on' AND TG_OP = 'INSERT' THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'fixture component failure';
  END IF;
  IF current_setting('hotlog.fixture.skip_component', true) = 'on' AND TG_OP = 'UPDATE' THEN
    RETURN NULL;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER fixture_atomic_component_failure BEFORE INSERT OR UPDATE ON public.components
FOR EACH ROW EXECUTE FUNCTION pg_temp.fail_atomic_components();

DO $$
DECLARE
  v_owner uuid := gen_random_uuid();
  v_outsider uuid := gen_random_uuid();
  v_editors uuid[] := ARRAY[gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), gen_random_uuid()];
  v_roles uuid[] := ARRAY[gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), gen_random_uuid()];
  v_actions text[] := ARRAY['create', 'update', 'delete', 'read'];
  v_project public.projects%ROWTYPE;
  v_foreign_project uuid := gen_random_uuid();
  v_schema uuid := gen_random_uuid();
  v_foreign_schema uuid := gen_random_uuid();
  v_layout bigint := -900000000000 - floor(random() * 100000000000)::bigint;
  v_second_layout bigint;
  v_hidden_layout bigint;
  v_component uuid;
  v_delete_component uuid;
  v_other_component uuid := gen_random_uuid();
  v_new_component uuid;
  v_count bigint;
  v_i integer;
  v_bad jsonb;
BEGIN
  v_second_layout := v_layout - 1;
  v_hidden_layout := v_layout - 2;
  IF has_function_privilege('anon', 'public.create_project(text)', 'EXECUTE')
     OR has_function_privilege('anon', 'public.batch_layout_components(bigint,jsonb,jsonb,jsonb)', 'EXECUTE')
     OR has_function_privilege('anon', 'public.lock_layout_for_component_batch(bigint,uuid[])', 'EXECUTE')
     OR NOT has_function_privilege('authenticated', 'public.create_project(text)', 'EXECUTE')
     OR NOT has_function_privilege('authenticated', 'public.batch_layout_components(bigint,jsonb,jsonb,jsonb)', 'EXECUTE')
     OR NOT has_function_privilege('authenticated', 'public.lock_layout_for_component_batch(bigint,uuid[])', 'EXECUTE') THEN
    RAISE EXCEPTION 'Unexpected atomic RPC ACL';
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_proc WHERE oid IN ('public.create_project(text)'::regprocedure,
      'public.batch_layout_components(bigint,jsonb,jsonb,jsonb)'::regprocedure) AND prosecdef
  ) THEN
    RAISE EXCEPTION 'Writes must remain SECURITY INVOKER';
  END IF;

  INSERT INTO auth.users (id, email)
  SELECT u, u::text || '@atomic.invalid' FROM unnest(v_editors || ARRAY[v_owner, v_outsider]) u;
  INSERT INTO public.permissions (action, subject)
  SELECT a, 'components' FROM unnest(v_actions) a
  ON CONFLICT (action, subject) DO NOTHING;

  PERFORM set_config('request.jwt.claim.sub', v_owner::text, true);
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_owner, 'role', 'authenticated')::text, true);
  SET LOCAL ROLE authenticated;
  SELECT * INTO STRICT v_project FROM public.create_project('atomic fixture project');
  IF v_project.creator_id <> v_owner THEN RAISE EXCEPTION 'Creator not derived from auth'; END IF;
  IF (SELECT count(*) FROM public.user_projects WHERE project_id = v_project.id AND user_id = v_owner) <> 1
     OR (SELECT count(*) FROM public.roles WHERE project_id = v_project.id AND name = 'Owner') <> 1
     OR (SELECT count(*) FROM public.user_roles ur JOIN public.roles r ON r.id = ur.role_id
         WHERE r.project_id = v_project.id AND ur.user_id = v_owner) <> 1
     OR (SELECT count(*) FROM public.role_permissions rp JOIN public.roles r ON r.id = rp.role_id
         WHERE r.project_id = v_project.id) <> (SELECT count(*) FROM public.permissions) THEN
    RAISE EXCEPTION 'Incomplete bootstrap';
  END IF;

  -- Failure in the final bootstrap step leaves no project, membership or role.
  PERFORM set_config('hotlog.fixture.fail_project', 'on', true);
  BEGIN
    PERFORM public.create_project('atomic failed project');
    RAISE EXCEPTION 'Expected forced bootstrap failure';
  EXCEPTION WHEN SQLSTATE 'P0001' THEN
    IF SQLERRM <> 'fixture project failure' THEN RAISE; END IF;
  END;
  PERFORM set_config('hotlog.fixture.fail_project', 'off', true);
  PERFORM set_config('hotlog.fixture.hide_permissions', 'on', true);
  BEGIN
    PERFORM public.create_project('atomic empty catalog');
    RAISE EXCEPTION 'Expected empty catalog failure';
  EXCEPTION WHEN SQLSTATE '55000' THEN NULL;
  END;
  PERFORM set_config('hotlog.fixture.hide_permissions', 'off', true);
  BEGIN
    PERFORM public.create_project('   ');
    RAISE EXCEPTION 'Expected name rejection';
  EXCEPTION WHEN SQLSTATE '22023' THEN NULL;
  END;
  RESET ROLE;
  IF (SELECT count(*) FROM public.projects WHERE creator_id = v_owner) <> 1
     OR (SELECT count(*) FROM public.user_projects WHERE user_id = v_owner) <> 1
     OR (SELECT count(*) FROM public.user_roles WHERE user_id = v_owner) <> 1 THEN
    RAISE EXCEPTION 'Failed bootstrap left partial rows';
  END IF;

  INSERT INTO public.projects (id, creator_id, name) VALUES (v_foreign_project, v_owner, 'foreign fixture');
  INSERT INTO public.user_projects (user_id, project_id) VALUES (v_owner, v_foreign_project);
  INSERT INTO public.schemas (id, project_id, name, key, display_name) VALUES
    (v_schema, v_project.id, 'Schema', 'schema', 'Schema'),
    (v_foreign_schema, v_foreign_project, 'Foreign', 'foreign', 'Foreign');
  INSERT INTO public.layouts (id, project_id, name) VALUES
    (v_layout, v_project.id, 'Atomic layout'),
    (v_second_layout, v_project.id, 'Second layout'),
    (v_hidden_layout, v_project.id, 'Restricted layout');
  FOR v_i IN 1..4 LOOP
    INSERT INTO public.user_projects (user_id, project_id) VALUES (v_editors[v_i], v_project.id);
    INSERT INTO public.roles (id, project_id, name) VALUES (v_roles[v_i], v_project.id, v_actions[v_i]);
    INSERT INTO public.user_roles (user_id, role_id) VALUES (v_editors[v_i], v_roles[v_i]);
    INSERT INTO public.role_permissions (role_id, permission_id)
    SELECT v_roles[v_i], id FROM public.permissions WHERE subject = 'components' AND action = v_actions[v_i];
  END LOOP;
  INSERT INTO public.role_layouts (layout_id, role_id) VALUES (v_hidden_layout, v_roles[4]);
  INSERT INTO public.components (id, layout_id, name, description, index, inputs_ids)
  VALUES (v_other_component, v_second_layout, 'Other', '', 0, '[]');

  SET LOCAL ROLE authenticated;
  -- Owner can use all actions in one call; return rows are layout-scoped/sorted.
  SELECT id INTO v_component FROM public.batch_layout_components(v_layout,
    jsonb_build_array(jsonb_build_object('title', 'Original', 'index', 0, 'schema_id', v_schema)));
  SELECT id INTO v_delete_component FROM public.batch_layout_components(v_layout,
    '[{"title":"Delete me","index":1}]') WHERE id <> v_component;
  IF v_component IS NULL OR v_delete_component IS NULL THEN RAISE EXCEPTION 'Create result missing'; END IF;

  -- Forced late INSERT failure must undo earlier DELETE and UPDATE.
  PERFORM set_config('hotlog.fixture.fail_components', 'on', true);
  BEGIN
    PERFORM public.batch_layout_components(v_layout, '[{"index":2}]',
      jsonb_build_array(jsonb_build_object('id', v_component, 'title', 'Should roll back')),
      jsonb_build_array(v_delete_component));
    RAISE EXCEPTION 'Expected late component failure';
  EXCEPTION WHEN SQLSTATE 'P0001' THEN
    IF SQLERRM <> 'fixture component failure' THEN RAISE; END IF;
  END;
  PERFORM set_config('hotlog.fixture.fail_components', 'off', true);
  IF NOT EXISTS (SELECT 1 FROM public.components WHERE id = v_delete_component)
     OR NOT EXISTS (SELECT 1 FROM public.components WHERE id = v_component AND name = 'Original')
     OR (SELECT count(*) FROM public.components WHERE layout_id = v_layout) <> 2 THEN
    RAISE EXCEPTION 'Late failure left partial component writes';
  END IF;

  -- Even a database trigger suppressing a write cannot yield false success.
  PERFORM set_config('hotlog.fixture.skip_component', 'on', true);
  BEGIN
    PERFORM public.batch_layout_components(v_layout, '[]',
      jsonb_build_array(jsonb_build_object('id', v_component, 'title', 'Skipped')),
      jsonb_build_array(v_delete_component));
    RAISE EXCEPTION 'Expected skipped update failure';
  EXCEPTION WHEN SQLSTATE '42501' THEN NULL;
  END;
  PERFORM set_config('hotlog.fixture.skip_component', 'off', true);
  IF NOT EXISTS (SELECT 1 FROM public.components WHERE id = v_delete_component) THEN
    RAISE EXCEPTION 'Skipped update committed preceding delete';
  END IF;

  -- Another layout's IDs are forbidden even when the caller can edit both.
  BEGIN
    PERFORM public.batch_layout_components(v_layout, '[]',
      jsonb_build_array(jsonb_build_object('id', v_other_component, 'title', 'Foreign')));
    RAISE EXCEPTION 'Expected foreign layout update rejection';
  EXCEPTION WHEN SQLSTATE '42501' THEN NULL;
  END;
  BEGIN
    PERFORM public.batch_layout_components(v_layout, '[]', '[]', jsonb_build_array(v_other_component));
    RAISE EXCEPTION 'Expected foreign layout delete rejection';
  EXCEPTION WHEN SQLSTATE '42501' THEN NULL;
  END;
  BEGIN
    PERFORM public.batch_layout_components(v_layout, '[]', '[]', jsonb_build_array(gen_random_uuid()));
    RAISE EXCEPTION 'Expected missing delete rejection';
  EXCEPTION WHEN SQLSTATE '42501' THEN NULL;
  END;
  BEGIN
    PERFORM public.batch_layout_components(v_layout, '[]', jsonb_build_array(jsonb_build_object('id', gen_random_uuid())));
    RAISE EXCEPTION 'Expected missing update rejection';
  EXCEPTION WHEN SQLSTATE '42501' THEN NULL;
  END;
  BEGIN
    PERFORM public.batch_layout_components(v_layout, '[{"index":2}]',
      jsonb_build_array(jsonb_build_object('id', v_component, 'schema_id', v_foreign_schema)),
      jsonb_build_array(v_delete_component));
    RAISE EXCEPTION 'Expected foreign schema update rejection';
  EXCEPTION WHEN SQLSTATE '22023' THEN NULL;
  END;
  BEGIN
    PERFORM public.batch_layout_components(v_layout,
      jsonb_build_array(jsonb_build_object('index', 2, 'schema_id', v_foreign_schema)));
    RAISE EXCEPTION 'Expected foreign schema create rejection';
  EXCEPTION WHEN SQLSTATE '22023' THEN NULL;
  END;
  BEGIN
    PERFORM public.batch_layout_components(v_layout, '[]',
      jsonb_build_array(jsonb_build_object('id', v_component)), jsonb_build_array(v_component));
    RAISE EXCEPTION 'Expected update/delete overlap rejection';
  EXCEPTION WHEN SQLSTATE '22023' THEN NULL;
  END;
  BEGIN
    PERFORM public.batch_layout_components(v_layout, '[]', '[]', jsonb_build_array(v_component, v_component));
    RAISE EXCEPTION 'Expected duplicate delete rejection';
  EXCEPTION WHEN SQLSTATE '22023' THEN NULL;
  END;
  FOR v_bad IN SELECT value FROM jsonb_array_elements('[null, {}, [null], [{}], [{"index":null}], [{"index":0.5}], [{"index":32768}], [{"index":0,"title":null}], [{"index":0,"bindings":{}}], [{"index":0,"bindings":[{"inputId":"x"}]}], [{"index":0,"schema_id":123}]]') LOOP
    BEGIN
      PERFORM public.batch_layout_components(v_layout, v_bad);
      RAISE EXCEPTION 'Expected invalid payload rejection';
    EXCEPTION WHEN SQLSTATE '22023' THEN NULL;
    END;
  END LOOP;
  BEGIN
    PERFORM public.batch_layout_components(v_layout, '[]', '[{"id":"invalid"}]');
    RAISE EXCEPTION 'Expected invalid UUID rejection';
  EXCEPTION WHEN SQLSTATE '22P02' THEN NULL;
  END;
  IF (SELECT count(*) FROM public.components WHERE layout_id = v_layout) <> 2
     OR NOT EXISTS (SELECT 1 FROM public.components WHERE id = v_component AND name = 'Original')
     OR NOT EXISTS (SELECT 1 FROM public.components WHERE id = v_other_component AND name = 'Other') THEN
    RAISE EXCEPTION 'Rejected batch changed rows';
  END IF;

  SELECT count(*) INTO v_count FROM public.batch_layout_components(v_layout,
    '[{"title":"New","index":2,"span":"half","bindings":[{"inputId":"x","fieldKey":null}]}]',
    jsonb_build_array(jsonb_build_object('id', v_component, 'title', 'Updated', 'schema_id', NULL)),
    jsonb_build_array(v_delete_component));
  IF v_count <> 2 OR EXISTS (SELECT 1 FROM public.components WHERE id = v_delete_component)
     OR NOT EXISTS (SELECT 1 FROM public.components WHERE id = v_component AND name = 'Updated' AND schema_id IS NULL) THEN
    RAISE EXCEPTION 'Successful mixed batch result incorrect';
  END IF;

  -- Archived references remain allowed, as in the existing component contract.
  RESET ROLE;
  UPDATE public.schemas SET status = 'archived' WHERE id = v_schema;
  SET LOCAL ROLE authenticated;

  -- Single-action users have NO update:layouts permission. No extra component
  -- action is required; an unauthorized additional action rejects all writes.
  FOR v_i IN 1..3 LOOP
    PERFORM set_config('request.jwt.claim.sub', v_editors[v_i]::text, true);
    PERFORM set_config('request.jwt.claims', json_build_object('sub', v_editors[v_i], 'role', 'authenticated')::text, true);
    IF public.has_permission(v_project.id, 'update', 'layouts') THEN RAISE EXCEPTION 'Fixture accidentally has layout update'; END IF;
    IF public.has_permission(v_project.id, 'update', 'schemas') THEN RAISE EXCEPTION 'Fixture accidentally has schema update'; END IF;
    PERFORM public.lock_layout_for_component_batch(v_layout, ARRAY[v_schema]);
    BEGIN
      PERFORM public.lock_layout_for_component_batch(v_layout, ARRAY[v_foreign_schema]);
      RAISE EXCEPTION 'Expected foreign schema lock denial';
    EXCEPTION WHEN SQLSTATE '22023' THEN NULL;
    END;
    BEGIN
      PERFORM public.lock_layout_for_component_batch(v_layout, ARRAY[gen_random_uuid()]);
      RAISE EXCEPTION 'Expected missing schema lock denial';
    EXCEPTION WHEN SQLSTATE '22023' THEN NULL;
    END;
    IF v_i = 1 THEN
      SELECT id INTO v_new_component FROM public.batch_layout_components(v_layout,
        jsonb_build_array(jsonb_build_object('title', 'Create only', 'index', 3, 'schema_id', v_schema)))
      WHERE name = 'Create only';
      BEGIN
        PERFORM public.batch_layout_components(v_layout, '[{"index":4}]', '[]', jsonb_build_array(v_component));
        RAISE EXCEPTION 'Expected create-only delete denial';
      EXCEPTION WHEN SQLSTATE '42501' THEN NULL;
      END;
    ELSIF v_i = 2 THEN
      PERFORM public.batch_layout_components(v_layout, '[]', jsonb_build_array(jsonb_build_object('id', v_new_component, 'title', 'Update only')));
      BEGIN
        PERFORM public.batch_layout_components(v_layout, '[{"index":4}]');
        RAISE EXCEPTION 'Expected update-only create denial';
      EXCEPTION WHEN SQLSTATE '42501' THEN NULL;
      END;
    ELSE
      PERFORM public.batch_layout_components(v_layout, '[]', '[]', jsonb_build_array(v_new_component));
      BEGIN
        PERFORM public.batch_layout_components(v_layout, '[]', jsonb_build_array(jsonb_build_object('id', v_component, 'title', 'Denied')));
        RAISE EXCEPTION 'Expected delete-only update denial';
      EXCEPTION WHEN SQLSTATE '42501' THEN NULL;
      END;
    END IF;
    BEGIN
      PERFORM public.lock_layout_for_component_batch(v_hidden_layout);
      RAISE EXCEPTION 'Expected hidden layout lock denial';
    EXCEPTION WHEN SQLSTATE '42501' THEN NULL;
    END;
    BEGIN
      PERFORM public.batch_layout_components(v_hidden_layout, '[{"index":0}]');
      RAISE EXCEPTION 'Expected hidden layout batch denial';
    EXCEPTION WHEN SQLSTATE '42501' THEN NULL;
    END;
  END LOOP;

  -- Read-only member and outsider cannot use privileged locks, including an
  -- empty batch. Missing layouts use the same non-disclosing error.
  FOREACH v_owner IN ARRAY ARRAY[v_editors[4], v_outsider] LOOP
    PERFORM set_config('request.jwt.claim.sub', v_owner::text, true);
    PERFORM set_config('request.jwt.claims', json_build_object('sub', v_owner, 'role', 'authenticated')::text, true);
    BEGIN
      PERFORM public.lock_layout_for_component_batch(v_layout);
      RAISE EXCEPTION 'Expected read-only/outsider lock denial';
    EXCEPTION WHEN SQLSTATE '42501' THEN NULL;
    END;
    BEGIN
      PERFORM public.batch_layout_components(v_layout);
      RAISE EXCEPTION 'Expected read-only/outsider batch denial';
    EXCEPTION WHEN SQLSTATE '42501' THEN NULL;
    END;
    BEGIN
      PERFORM public.batch_layout_components(v_layout - 3, '[{"index":0}]');
      RAISE EXCEPTION 'Expected missing layout denial';
    EXCEPTION WHEN SQLSTATE '42501' THEN NULL;
    END;
  END LOOP;
  PERFORM set_config('request.jwt.claim.sub', '', true);
  PERFORM set_config('request.jwt.claims', '{}', true);
  BEGIN
    PERFORM public.create_project('unauthenticated');
    RAISE EXCEPTION 'Expected auth rejection';
  EXCEPTION WHEN SQLSTATE '28000' THEN NULL;
  END;
  BEGIN
    PERFORM public.batch_layout_components(v_layout);
    RAISE EXCEPTION 'Expected batch auth rejection';
  EXCEPTION WHEN SQLSTATE '28000' THEN NULL;
  END;
  BEGIN
    PERFORM public.lock_layout_for_component_batch(v_layout);
    RAISE EXCEPTION 'Expected helper auth rejection';
  EXCEPTION WHEN SQLSTATE '28000' THEN NULL;
  END;
  SET LOCAL ROLE anon;
  BEGIN
    PERFORM public.create_project('anonymous');
    RAISE EXCEPTION 'Expected anon ACL denial';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  BEGIN
    PERFORM public.batch_layout_components(v_layout);
    RAISE EXCEPTION 'Expected anon batch ACL denial';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  RESET ROLE;
  IF (SELECT count(*) FROM public.components WHERE layout_id = v_layout) <> 2
     OR EXISTS (SELECT 1 FROM public.components WHERE layout_id = v_hidden_layout)
     OR NOT EXISTS (SELECT 1 FROM public.components WHERE id = v_component AND name = 'Updated') THEN
    RAISE EXCEPTION 'Action-specific tests changed unrelated rows';
  END IF;
  RAISE NOTICE 'Atomic bootstrap, batch, failure rollback, ACL and action-specific assertions passed';
END;
$$;
ROLLBACK;
